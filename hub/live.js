import crypto from 'node:crypto'

export const LIVE_MODEL = 'gpt-live-1'
const MAX_HISTORY_BYTES = 6000 // Conservative bound below the Live startup token limit.
const SESSION_TTL_MS = 60 * 60 * 1000

export function validateLiveHistory(history) {
  if (!Array.isArray(history) || history.length > 128) return 'history must contain at most 128 messages'
  if (history.some(item => !item || !['user', 'assistant'].includes(item.role)
    || typeof item.content !== 'string' || !item.content.trim())) return 'history must contain user or assistant text messages'
  if (Buffer.byteLength(JSON.stringify(history), 'utf8') > MAX_HISTORY_BYTES) return 'history is too large'
  return null
}

export function validateLiveRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Live request must be an object'
  if (typeof body.sdp !== 'string' || !body.sdp.trimStart().startsWith('v=0') || body.sdp.length > 256 * 1024) return 'sdp must be a valid WebRTC offer'
  if (body.conversationId !== undefined && (typeof body.conversationId !== 'string' || body.conversationId.length > 200)) return 'Invalid conversation ID'
  if (body.safetyIdentifier !== undefined && (typeof body.safetyIdentifier !== 'string' || body.safetyIdentifier.length > 200)) return 'Invalid safety identifier'
  if (body.activationSource !== undefined && !['manual', 'wake_word', 'approved_voice'].includes(body.activationSource)) return 'Invalid voice activation source'
  return validateLiveHistory(body.history || [])
}

export function buildLiveConfig(config, instructions, history) {
  return {
    model: LIVE_MODEL,
    instructions,
    input: history.map(({ role, content }) => ({
      type: 'message', role,
      content: [{ type: role === 'assistant' ? 'output_text' : 'input_text', text: content }],
    })),
    audio: { output: { voice: config.openaiLiveVoice || 'marin' } },
    delegation: { type: 'client' },
    store: false,
    client: { data_channel: {
      allowed_client_events: ['session.close', 'session.commentary.append'],
      allowed_server_events: [
        'session.started', 'session.closed', 'session.input_transcript.delta',
        'session.output_transcript.delta', 'session.delegation.created',
        'session.commentary.appended', 'session.usage.updated', 'error',
      ].map(type => ({ type })),
    } },
  }
}

export function registerLiveRoutes(app, { config, buildInstructions, delegate }) {
  const sessions = new Map()
  const upstream = async (suffix, body, safetyIdentifier) => {
    if (!config.openaiApiKey) throw Object.assign(new Error('Voice is unavailable: the Hub needs OPENAI_API_KEY.'), { status: 503, retryable: false })
    let response
    try {
      response = await fetch(`${config.openaiBaseUrl.replace(/\/$/, '')}/live/sessions${suffix}`, {
        method: 'POST',
        headers: { authorization: `Bearer ${config.openaiApiKey}`, 'content-type': 'application/json',
          ...(safetyIdentifier ? { 'OpenAI-Safety-Identifier': `case_${crypto.createHash('sha256').update(safetyIdentifier).digest('hex')}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(Math.max(1, config.openaiLiveTimeout || 30) * 1000),
      })
    } catch {
      throw Object.assign(new Error('Voice connection timed out or the network is unavailable. Please retry.'), { status: 504, retryable: true })
    }
    if (!response.ok) {
      // Never reflect upstream bodies: they can contain credentials or request data.
      await response.body?.cancel()
      const authentication = response.status === 401 || response.status === 403
      throw Object.assign(new Error(authentication
        ? 'OpenAI voice authentication failed. Check the Hub key and GPT Live access.'
        : `OpenAI voice connection failed (HTTP ${response.status}). Please retry.`),
      { status: 502, upstreamStatus: response.status, retryable: response.status === 429 || response.status >= 500 })
    }
    return response
  }
  const fail = (request, reply, error) => {
    request.log.warn({ status: error.status || 502, upstreamStatus: error.upstreamStatus }, 'Live request failed')
    return reply.code(error.status || 502).send({ error: 'Live Error',
      message: error.status ? error.message : 'Voice request failed. Please retry.', retryable: error.retryable ?? false })
  }
  const release = async (id) => {
    const session = sessions.get(id)
    if (!session) return
    sessions.delete(id)
    clearTimeout(session.timer)
    await upstream(`/${encodeURIComponent(id)}/hangup`)
  }
  const getSession = (request, reply) => {
    const session = sessions.get(request.params.id)
    if (!session || request.body?.controlToken !== session.controlToken) {
      reply.code(403).send({ message: 'Voice session is unavailable. Start a new conversation.', retryable: false })
      return null
    }
    return session
  }
  app.post('/live/sessions', async (request, reply) => {
    reply.header('Cache-Control', 'no-store')
    const error = validateLiveRequest(request.body)
    if (error) return reply.code(400).send({ message: error, retryable: false })
    if (sessions.size >= 100) return reply.code(503).send({ message: 'Voice is busy. Please try again shortly.', retryable: true })
    try {
      const instructions = await buildInstructions({ conversationId: request.body.conversationId, logger: request.log })
      const response = await upstream('', {
        session: buildLiveConfig(config, instructions, request.body.history || []),
        // SDP is line-oriented: removing the final CRLF makes valid offers fail parsing.
        transport: { type: 'webrtc', sdp: request.body.sdp.trimStart() },
      }, request.body.safetyIdentifier)
      const result = await response.json()
      if (typeof result.session?.id !== 'string' || typeof result.transport?.sdp !== 'string'
        || !result.transport.sdp.startsWith('v=0')) {
        if (typeof result.session?.id === 'string') await upstream(`/${encodeURIComponent(result.session.id)}/hangup`).catch(() => {})
        throw new Error('Invalid session response')
      }
      const id = result.session.id
      const controlToken = crypto.randomBytes(32).toString('hex')
      const timer = setTimeout(() => { void release(id).catch(() => app.log.warn('Live session expiry cleanup failed')) }, SESSION_TTL_MS)
      timer.unref()
      sessions.set(id, { controlToken, timer, delegations: new Map() })
      // A client can cancel while OpenAI creates the session. Reclaim that session.
      if (reply.raw.destroyed) {
        await release(id)
        return
      }
      return reply.code(201).send({ sessionId: id, controlToken, sdp: result.transport.sdp,
        model: LIVE_MODEL, voice: config.openaiLiveVoice || 'marin' })
    } catch (error) { return fail(request, reply, error) }
  })
  app.post('/live/sessions/:id/close', async (request, reply) => {
    reply.header('Cache-Control', 'no-store')
    if (!getSession(request, reply)) return
    try {
      if (request.body.finalized === true) {
        const session = sessions.get(request.params.id)
        clearTimeout(session.timer)
        sessions.delete(request.params.id)
      } else await release(request.params.id)
      return { closed: true }
    } catch (error) { return fail(request, reply, error) }
  })
  app.post('/live/sessions/:id/delegate', async (request, reply) => {
    reply.header('Cache-Control', 'no-store')
    const session = getSession(request, reply)
    if (!session) return
    const { delegationId, history } = request.body
    const error = validateLiveHistory(history)
    if (error || typeof delegationId !== 'string' || !delegationId || delegationId.length > 200) {
      return reply.code(400).send({ message: error || 'Invalid delegation ID', retryable: false })
    }
    // A lost HTTP reply must not repeat backend work for the same delegation.
    if (!session.delegations.has(delegationId)) {
      if (session.delegations.size >= 100) return reply.code(429).send({ message: 'Start a new voice session to continue.', retryable: false })
      const pending = Promise.resolve().then(() => delegate(history)).then(content => {
        // UTF-8 bytes conservatively bound tokens. Preserve a contiguous prefix.
        let text = ''
        for (const character of String(content)) {
          if (Buffer.byteLength(text + character) > 450) break
          text += character
        }
        return { content: text }
      })
      session.delegations.set(delegationId, pending)
    }
    try { return await session.delegations.get(delegationId) }
    catch (error) { return fail(request, reply, error) }
  })
  app.addHook('onClose', async () => {
    await Promise.allSettled([...sessions.keys()].map(release))
  })
}
