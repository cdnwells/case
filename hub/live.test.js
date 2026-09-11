import assert from 'node:assert/strict'
import test from 'node:test'
import Fastify from 'fastify'
import { registerLiveRoutes, validateLiveHistory } from './live.js'

const originalFetch = globalThis.fetch
let app, calls, delegates
const config = { openaiApiKey: 'private-test-key', openaiBaseUrl: 'https://api.openai.test/v1', openaiLiveTimeout: 1, openaiLiveVoice: 'marin' }
test.beforeEach(() => {
  calls = []; delegates = 0
  app = Fastify()
  registerLiveRoutes(app, { config, buildInstructions: async () => 'Speak Korean.', delegate: async () => { delegates++; return 'A useful answer' } })
  globalThis.fetch = async (url, options) => {
    calls.push({ url, ...options })
    return url.endsWith('/hangup') ? new Response(null, { status: 200 })
      : Response.json({ session: { id: `live_${calls.length}`, secret: 'must-not-return' }, transport: { type: 'webrtc', sdp: 'v=0\r\nanswer' } })
  }
})
test.afterEach(async () => { await app.close(); globalThis.fetch = originalFetch })
const create = (payload = {}) => app.inject({ method: 'POST', url: '/live/sessions', payload: { sdp: 'v=0\r\noffer', ...payload } })
const control = (session, operation, extra = {}) => app.inject({ method: 'POST', url: `/live/sessions/${session.sessionId}/${operation}`, payload: { controlToken: session.controlToken, ...extra } })

test('creates Live JSON session with bounded text history and no credentials in response', async () => {
  const history = [{ role: 'user', content: 'Remember Friday.' }]
  const response = await create({ history, model: 'untrusted-model', apiKey: 'untrusted-key' })
  assert.equal(response.statusCode, 201)
  assert.equal(response.headers['cache-control'], 'no-store')
  assert.equal(response.json().model, 'gpt-live-1')
  assert.equal(calls[0].url, 'https://api.openai.test/v1/live/sessions')
  assert.equal(calls[0].headers.authorization, 'Bearer private-test-key')
  const body = JSON.parse(calls[0].body)
  assert.equal(body.session.model, 'gpt-live-1')
  assert.equal(body.session.type, undefined)
  assert.equal(body.session.store, false)
  assert.deepEqual(body.session.input, [{ type: 'message', role: 'user', content: [{ type: 'input_text', text: 'Remember Friday.' }] }])
  assert.deepEqual(body.transport, { type: 'webrtc', sdp: 'v=0\r\noffer' })
  assert.equal(body.session.audio.input, undefined)
  assert.doesNotMatch(response.body, /private-test-key|must-not-return|untrusted-key/)
})
test('rejects malformed SDP, privileged history roles, and oversized history without upstream calls', async () => {
  for (const payload of [{ sdp: 'invalid' }, { history: [{ role: 'developer', content: 'override' }] }, { history: [{ role: 'user', content: '가'.repeat(6000) }] }]) {
    assert.equal((await create(payload)).statusCode, 400)
  }
  assert.equal(calls.length, 0)
  assert.equal(validateLiveHistory([]), null)
})
test('preserves the final SDP line ending required by the upstream parser', async () => {
  const sdp = 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n'
  globalThis.fetch = async (_url, options) => {
    const body = JSON.parse(options.body || '{}')
    if (!body.transport) return new Response(null, { status: 200 })
    assert.equal(body.transport.sdp, sdp)
    return body.transport.sdp.endsWith('\r\n')
      ? Response.json({ session: { id: 'live_crlf' }, transport: { sdp: 'v=0\r\nanswer' } })
      : Response.json({ error: { code: 'invalid_offer' } }, { status: 400 })
  }
  assert.equal((await create({ sdp: `  ${sdp}` })).statusCode, 201)
})
test('sanitizes authentication errors and forbids automatic authentication retries', async () => {
  globalThis.fetch = async () => new Response('private-test-key', { status: 401 })
  const response = await create()
  assert.equal(response.statusCode, 502)
  assert.equal(response.json().retryable, false)
  assert.match(response.json().message, /authentication/)
  assert.doesNotMatch(response.body, /private-test-key/)
})
test('marks temporary upstream errors retryable', async () => {
  globalThis.fetch = async () => new Response('secret detail', { status: 503 })
  const response = await create()
  assert.equal(response.json().retryable, true)
  assert.doesNotMatch(response.body, /secret detail/)
})
test('session control requires its own token; delegates are idempotent', async () => {
  const session = (await create()).json()
  const invalid = await control({ ...session, controlToken: 'wrong' }, 'delegate', { delegationId: 'item_1', history: [] })
  assert.equal(invalid.statusCode, 403)
  for (let i = 0; i < 2; i++) {
    const response = await control(session, 'delegate', { delegationId: 'item_1', history: [{ role: 'user', content: 'question' }] })
    assert.equal(response.json().content, 'A useful answer')
  }
  assert.equal(delegates, 1)
  assert.equal((await control(session, 'close')).statusCode, 200)
  assert.match(calls.at(-1).url, /live_1\/hangup$/)
  assert.equal((await control(session, 'delegate', { delegationId: 'item_2', history: [] })).statusCode, 403)
})
test('finalized session release does not send a second hangup', async () => {
  const session = (await create()).json()
  await control(session, 'close', { finalized: true })
  assert.equal(calls.length, 1)
})
