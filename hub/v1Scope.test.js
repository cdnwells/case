import assert from 'node:assert/strict'
import test from 'node:test'

import { config, fastify } from './hub.js'

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

  config.contextWorkerUrl = ''

  const outOfScopeRequests = [
    { method: 'POST', url: '/command', payload: { command: 'echo nope' } },
    { method: 'GET', url: '/unknown-worker-route' },
  ]

  for (const request of outOfScopeRequests) {
    const response = await fastify.inject(request)
    assert.equal(response.statusCode, 404, `${request.method} ${request.url}`)
  }

  const contextResponse = await fastify.inject({ method: 'GET', url: '/context' })
  assert.equal(contextResponse.statusCode, 200)
  assert.equal(typeof contextResponse.json().context, 'string')

  assert.equal(fetchCalls.length, 0)
})
