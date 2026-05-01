import 'dotenv/config'
import Fastify from 'fastify'
import crypto from 'crypto'

// Configuration
const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  pythonWorkerUrl: process.env.PYTHON_WORKER_URL || 'http://localhost:8000',
  commandWorkerUrl: process.env.COMMAND_WORKER_URL
    || process.env.CODEX_WORKER_URL
    || process.env.CLAUDE_WORKER_URL
    || 'http://localhost:8004',
  commandWorkerName: process.env.COMMAND_WORKER_NAME
    || (process.env.COMMAND_WORKER_URL ? 'custom' : (process.env.CLAUDE_WORKER_URL && !process.env.CODEX_WORKER_URL ? 'claude' : 'codex')),
  claudeWorkerUrl: process.env.CLAUDE_WORKER_URL || 'http://localhost:8003',
  contextWorkerUrl: process.env.CONTEXT_WORKER_URL || 'http://localhost:8001',
  forwardTimeout: parseInt(process.env.FORWARD_TIMEOUT_MS || '120000', 10),
}

const hubApiKey = process.env.HUB_API_KEY

const fastify = Fastify({
  logger: { level: process.env.LOG_LEVEL || 'info' },
  genReqId: () => crypto.randomUUID(),
})

// In-memory command result store
const RESULT_TTL_MS = 10 * 60 * 1000 // 10 minutes
const commandResults = new Map()

// Cleanup expired results every 60 seconds
setInterval(() => {
  const now = Date.now()
  for (const [id, entry] of commandResults) {
    if (now - entry.createdAt > RESULT_TTL_MS) {
      commandResults.delete(id)
    }
  }
}, 60_000)

// Worker selection based on request path
function selectWorkerUrl(path) {
  if (path.startsWith('/command')) {
    return config.commandWorkerUrl
  }
  if (path.startsWith('/context')) {
    return config.contextWorkerUrl
  }
  return config.pythonWorkerUrl
}

// Async command execution with result storage
function executeCommandAsync(url, body, headers, logger) {
  const executionId = body?.executionId
  const forwardHeaders = { ...headers }
  delete forwardHeaders['host']
  delete forwardHeaders['connection']
  delete forwardHeaders['keep-alive']
  delete forwardHeaders['transfer-encoding']
  delete forwardHeaders['content-length']

  forwardHeaders['x-forwarded-by'] = 'echo-hub'
  forwardHeaders['X-API-key'] = hubApiKey

  const fetchOptions = {
    method: 'POST',
    headers: forwardHeaders,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }

  if (typeof body !== 'string') {
    forwardHeaders['content-type'] = 'application/json'
  }

  fetch(url, fetchOptions)
    .then(res => res.json())
    .then(result => {
      logger.info({ executionId, result }, 'Command executed')
      if (executionId) {
        commandResults.set(executionId, {
          status: result.success ? 'completed' : 'failed',
          result,
          createdAt: Date.now(),
        })
      }
    })
    .catch(err => {
      logger.error({ executionId, err }, 'Command execution failed')
      if (executionId) {
        commandResults.set(executionId, {
          status: 'failed',
          result: { success: false, stdout: '', stderr: err.message, exit_code: -1, execution_time: 0 },
          createdAt: Date.now(),
        })
      }
    })
}

// Reverse proxy forwarding
async function forwardToWorker({ method, path, headers, body, workerUrl }, logger) {
  const url = `${workerUrl || config.pythonWorkerUrl}${path}`

  logger.info(`${url}`)

  const forwardHeaders = { ...headers }
  delete forwardHeaders['host']
  delete forwardHeaders['connection']
  delete forwardHeaders['keep-alive']
  delete forwardHeaders['transfer-encoding']
  delete forwardHeaders['content-length']

  forwardHeaders['x-forwarded-by'] = 'echo-hub'
  forwardHeaders['x-forwarded-host'] = headers.host || 'unknown'
  forwardHeaders['X-API-key'] = hubApiKey

  const fetchOptions = {
    method,
    headers: forwardHeaders,
    signal: AbortSignal.timeout(config.forwardTimeout),
  }

  if (body && method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body)
    if (typeof body !== 'string') {
      forwardHeaders['content-type'] = 'application/json'
    }
  }

  const response = await fetch(url, fetchOptions)
  const contentType = response.headers.get('content-type') || ''

  let data
  if (contentType.includes('application/json')) {
    data = await response.json()
  } else {
    data = await response.text()
  }

  logger.info({ url, method, status: response.status }, 'Forwarded')

  return {
    status: response.status,
    contentType,
    data,
  }
}

// Health check (not forwarded)
fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString()
}))

// Poll command result by executionId
fastify.get('/command/result/:executionId', async (request, reply) => {
  const { executionId } = request.params
  const entry = commandResults.get(executionId)

  if (!entry) {
    reply.code(404)
    return { status: 'not_found', executionId }
  }

  return {
    status: entry.status,
    executionId,
    result: entry.result,
  }
})

// Command execution endpoint (fire-and-forget)
fastify.post('/command', async (request, reply) => {
  const { body, headers } = request
  const source = body?.source || 'unknown'
  const executionId = body?.executionId
  request.log.info({ source, executionId, body }, 'Command received')

  // Track execution in result store
  if (executionId) {
    commandResults.set(executionId, {
      status: 'executing',
      result: null,
      createdAt: Date.now(),
    })
  }

  // Return immediately with 202 Accepted
  reply.code(202).send({
    status: 'working',
    source,
    executionId,
    message: 'Commands queued for execution'
  })

  // Execute in background
  const commandUrl = `${config.commandWorkerUrl}/command`
  executeCommandAsync(commandUrl, body, headers, request.log)
})

// Chat endpoint with context orchestration
fastify.post('/chat', async (request, reply) => {
  const { headers, body } = request
  request.log.info({ body }, 'Chat received - loading context')

  // Step 1: Load context from Context Worker
  let context = ''
  try {
    const ctxResponse = await forwardToWorker({
      method: 'GET',
      path: '/context',
      headers: {},
      workerUrl: config.contextWorkerUrl,
    }, request.log)

    if (ctxResponse.status === 200 && ctxResponse.data?.context) {
      context = ctxResponse.data.context
    }
  } catch (err) {
    // Context loading failure is non-fatal; proceed without context
    request.log.warn({ error: err.message }, 'Failed to load context, proceeding without')
  }

  // Step 2: Inject context into request body and forward to GPT Worker
  const enrichedBody = { ...body }
  if (context) {
    enrichedBody.context = context
  }

  try {
    const gptResponse = await forwardToWorker({
      method: 'POST',
      path: '/chat',
      headers,
      body: enrichedBody,
      workerUrl: config.pythonWorkerUrl,
    }, request.log)

    const responseData = gptResponse.data

    // Step 3: Extract and save memory from GPT response
    if (responseData?.memory && Array.isArray(responseData.memory) && responseData.memory.length > 0) {
      // Save memories to context worker (non-fatal)
      try {
        await forwardToWorker({
          method: 'POST',
          path: '/context/memories',
          headers: { 'content-type': 'application/json' },
          body: { memories: responseData.memory, source: 'gpt' },
          workerUrl: config.contextWorkerUrl,
        }, request.log)
        request.log.info({ count: responseData.memory.length }, 'Memories saved')
      } catch (err) {
        request.log.warn({ error: err.message }, 'Failed to save memories')
      }

      // Strip memory field from response before returning to Android
      delete responseData.memory
    }

    reply.code(gptResponse.status)
    if (gptResponse.contentType) {
      reply.header('content-type', gptResponse.contentType)
    }
    return responseData
  } catch (err) {
    request.log.error({ error: err.message }, 'Chat forward failed')

    if (err.name === 'TimeoutError') {
      reply.code(504)
      return { error: 'Hub Timeout', message: 'Worker did not respond in time' }
    }

    reply.code(502)
    return { error: 'Bad Hub', message: 'Failed to reach worker' }
  }
})

// Hub catch-all (reverse proxy)
fastify.all('/*', async (request, reply) => {
  const { method, url, headers, body } = request
  request.log.info({ method, url }, 'Hub received')

  try {
    const workerUrl = selectWorkerUrl(url)
    const response = await forwardToWorker({ method, path: url, headers, body, workerUrl }, request.log)

    reply.code(response.status)
    if (response.contentType) {
      reply.header('content-type', response.contentType)
    }
    return response.data
  } catch (err) {
    request.log.error({ url, method, error: err.message }, 'Forward failed')

    if (err.name === 'TimeoutError') {
      reply.code(504)
      return { error: 'Hub Timeout', message: 'Worker did not respond in time' }
    }

    reply.code(502)
    return { error: 'Bad Hub', message: 'Failed to reach worker' }
  }
})

// Graceful shutdown
const shutdown = async (signal) => {
  fastify.log.info({ signal }, 'Shutting down')
  await fastify.close()
  process.exit(0)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Start
const start = async () => {
  try {
    await fastify.listen({ port: config.port, host: '0.0.0.0' })
    fastify.log.info({
      pythonWorkerUrl: config.pythonWorkerUrl,
      contextWorkerUrl: config.contextWorkerUrl,
      commandWorkerUrl: config.commandWorkerUrl,
      commandWorkerName: config.commandWorkerName,
    }, 'Hub started')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
