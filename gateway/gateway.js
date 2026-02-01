import 'dotenv/config'
import Fastify from 'fastify'
import crypto from 'crypto'

// Configuration
const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  pythonWorkerUrl: process.env.PYTHON_WORKER_URL || 'http://localhost:8000',
  forwardTimeout: parseInt(process.env.FORWARD_TIMEOUT_MS || '120000', 10),
}

const gatewayApiKey = process.env.GATEWAY_API_KEY

const fastify = Fastify({
  logger: { level: process.env.LOG_LEVEL || 'info' },
  genReqId: () => crypto.randomUUID(),
})

// Reverse proxy forwarding
async function forwardToWorker({ method, path, headers, body }, logger) {
  const url = `${config.pythonWorkerUrl}${path}`

  logger.info(`${url}`)

  const forwardHeaders = { ...headers }
  delete forwardHeaders['host']
  delete forwardHeaders['connection']
  delete forwardHeaders['keep-alive']
  delete forwardHeaders['transfer-encoding']
  delete forwardHeaders['content-length']

  forwardHeaders['x-forwarded-by'] = 'echo-gateway'
  forwardHeaders['x-forwarded-host'] = headers.host || 'unknown'
  forwardHeaders['X-API-key'] = gatewayApiKey

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

// Gateway catch-all (reverse proxy)
fastify.all('/*', async (request, reply) => {
  const { method, url, headers, body } = request
  request.log.info({ method, url }, 'Gateway received')

  try {
    const response = await forwardToWorker({ method, path: url, headers, body }, request.log)

    reply.code(response.status)
    if (response.contentType) {
      reply.header('content-type', response.contentType)
    }
    return response.data
  } catch (err) {
    request.log.error({ url, method, error: err.message }, 'Forward failed')

    if (err.name === 'TimeoutError') {
      reply.code(504)
      return { error: 'Gateway Timeout', message: 'Worker did not respond in time' }
    }

    reply.code(502)
    return { error: 'Bad Gateway', message: 'Failed to reach worker' }
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
    fastify.log.info({ pythonWorkerUrl: config.pythonWorkerUrl }, 'Gateway started')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
