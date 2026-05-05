import assert from 'node:assert/strict'
import test from 'node:test'

import { fastify } from './hub.js'

test.before(async () => {
  await fastify.ready()
})

test.after(async () => {
  await fastify.close()
})

test('robots.txt disallows crawling the hub', async () => {
  const response = await fastify.inject({
    method: 'GET',
    url: '/robots.txt',
    headers: {
      'user-agent': 'Googlebot/2.1',
    },
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow, noarchive')
  assert.match(response.headers['content-type'], /^text\/plain/)
  assert.equal(response.body, 'User-agent: *\nDisallow: /\n')
})

test('hub responses include noindex crawler headers', async () => {
  const response = await fastify.inject({
    method: 'GET',
    url: '/health',
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow, noarchive')
})

test('known crawler user agents cannot access hub API routes', async () => {
  const response = await fastify.inject({
    method: 'GET',
    url: '/health',
    headers: {
      'user-agent': 'Googlebot/2.1',
    },
  })

  assert.equal(response.statusCode, 403)
  assert.equal(response.headers['x-robots-tag'], 'noindex, nofollow, noarchive')
  assert.deepEqual(response.json(), {
    error: 'Forbidden',
    message: 'Crawler access is not allowed',
  })
})
