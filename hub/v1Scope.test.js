import assert from 'node:assert/strict'
import test from 'node:test'

import { fastify } from './hub.js'

const originalFetch = globalThis.fetch

test.before(async () => {
  await fastify.ready()
})

test.after(async () => {
  globalThis.fetch = originalFetch
  await fastify.close()
})

test('v1 hub does not expose or proxy out-of-scope worker endpoints', async () => {
  const fetchCalls = []
  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    throw new Error('out-of-scope endpoints must not be proxied')
  }

  const requests = [
    { method: 'POST', url: '/command', payload: { command: 'echo nope' } },
    { method: 'GET', url: '/context' },
    { method: 'POST', url: '/context/memories', payload: { memories: ['nope'] } },
    { method: 'GET', url: '/unknown-worker-route' },
  ]

  for (const request of requests) {
    const response = await fastify.inject(request)
    assert.equal(response.statusCode, 404, `${request.method} ${request.url}`)
  }

  assert.equal(fetchCalls.length, 0)
})
