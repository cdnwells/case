# Hub Server Implementation Plan

## Overview

Transform the existing Fastify server into a hub that receives HTTP requests and forwards them asynchronously to a Python worker (fire-and-forget pattern).

## Requirements

- **Framework:** Fastify v5 (existing)
- **Transport:** HTTP to Python worker
- **Response:** Async - return 202 Accepted immediately, don't wait for worker response
- **Scope:** Hub only (Python worker is separate)

## Implementation

### File to Modify

`/mnt/c/Projects/echo-server/server.js`

### Key Changes

1. **Configuration via environment variables**
   - `PORT` (default: 5000)
   - `PYTHON_WORKER_URL` (default: http://localhost:8000)
   - `FORWARD_TIMEOUT_MS` (default: 5000)

2. **Fire-and-forget forwarding function**
   - Uses native `fetch` (Node.js 18+ built-in)
   - Removes hop-by-hop headers before forwarding
   - Adds `x-forwarded-by` and `x-forwarded-host` headers
   - Logs success/failure without blocking response

3. **Health check endpoint**
   - `GET /health` - returns status, not forwarded to worker

4. **Catch-all hub route**
   - `fastify.all('/*')` - handles all methods and paths
   - Returns HTTP 202 Accepted with request ID
   - Forwards request to Python worker in background

5. **Graceful shutdown**
   - Handle SIGTERM/SIGINT signals

### Updated server.js

```javascript
import Fastify from 'fastify'
import crypto from 'crypto'

// Configuration
const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  pythonWorkerUrl: process.env.PYTHON_WORKER_URL || 'http://localhost:8000',
  forwardTimeout: parseInt(process.env.FORWARD_TIMEOUT_MS || '5000', 10),
}

const fastify = Fastify({
  logger: { level: process.env.LOG_LEVEL || 'info' },
  genReqId: () => crypto.randomUUID(),
})

// Fire-and-forget forwarding
function forwardToWorker({ method, path, headers, body }, logger) {
  const url = `${config.pythonWorkerUrl}${path}`

  const forwardHeaders = { ...headers }
  delete forwardHeaders['host']
  delete forwardHeaders['connection']
  delete forwardHeaders['keep-alive']
  delete forwardHeaders['transfer-encoding']
  delete forwardHeaders['content-length']

  forwardHeaders['x-forwarded-by'] = 'echo-hub'
  forwardHeaders['x-forwarded-host'] = headers.host || 'unknown'

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

  fetch(url, fetchOptions)
    .then(res => logger.info({ url, method, status: res.status }, 'Forwarded'))
    .catch(err => logger.error({ url, method, error: err.message }, 'Forward failed'))
}

// Health check (not forwarded)
fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString()
}))

// Hub catch-all
fastify.all('/*', async (request, reply) => {
  const { method, url, headers, body } = request
  request.log.info({ method, url }, 'Hub received')

  forwardToWorker({ method, path: url, headers, body }, request.log)

  reply.code(202)
  return {
    status: 'accepted',
    requestId: request.id,
    timestamp: new Date().toISOString()
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
    fastify.log.info({ pythonWorkerUrl: config.pythonWorkerUrl }, 'Hub started')
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
```

## Dependencies

No new dependencies required - uses Node.js built-in `fetch` (Node 18+).

## Verification

1. **Start hub:**
   ```bash
   PYTHON_WORKER_URL=http://localhost:8000 node server.js
   ```

2. **Test health check:**
   ```bash
   curl http://localhost:5000/health
   # Expected: {"status":"ok","timestamp":"..."}
   ```

3. **Test forwarding:**
   ```bash
   curl -X POST http://localhost:5000/api/test \
     -H "Content-Type: application/json" \
     -d '{"data":"test"}'
   # Expected: {"status":"accepted","requestId":"...","timestamp":"..."}
   ```

4. **Check logs** - should show forwarding attempts (success or failure depending on worker availability)
