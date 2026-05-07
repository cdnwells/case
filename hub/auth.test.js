import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { config, fastify } from './hub.js'

const originalConfig = { ...config }
const INITIAL_TOKEN = 'initial-test-token'

test.before(async () => {
  await fastify.ready()
})

test.after(async () => {
  Object.assign(config, originalConfig)
  await fastify.close()
})

async function configureIsolatedAuth(t, overrides = {}) {
  const memoryDataDir = await mkdtemp(path.join(tmpdir(), 'case-hub-auth-'))
  t.after(async () => {
    await rm(memoryDataDir, { recursive: true, force: true })
  })

  Object.assign(config, originalConfig, {
    contextWorkerUrl: '',
    memoryDataDir,
    memoryFileName: 'memories.json',
    caseHubToken: INITIAL_TOKEN,
    caseHubTokenFileName: 'auth-token.json',
    caseHubTokenGraceSeconds: 1800,
    caseHubTokenRotationIntervalHours: 24,
    ...overrides,
  })

  return memoryDataDir
}

function tokenHeaders(token = INITIAL_TOKEN) {
  return { 'x-case-hub-token': token }
}

function bearerHeaders(token = INITIAL_TOKEN) {
  return { authorization: `Bearer ${token}` }
}

async function refreshLocal(headers = {}) {
  return fastify.inject({
    method: 'POST',
    url: '/auth/refresh-local',
    headers: {
      'x-forwarded-for': '192.168.1.20',
      ...headers,
    },
  })
}

test('sensitive hub routes require a Case Hub token while public routes stay open', async (t) => {
  await configureIsolatedAuth(t)

  const missingTokenResponse = await fastify.inject({
    method: 'GET',
    url: '/context',
  })
  assert.equal(missingTokenResponse.statusCode, 401)
  assert.deepEqual(missingTokenResponse.json(), {
    error: 'Unauthorized',
    message: 'Case Hub token is required',
  })

  const wrongTokenResponse = await fastify.inject({
    method: 'GET',
    url: '/context',
    headers: tokenHeaders('wrong-token'),
  })
  assert.equal(wrongTokenResponse.statusCode, 401)

  const missingSpeechTokenResponse = await fastify.inject({
    method: 'POST',
    url: '/speech',
    payload: { input: 'hello' },
  })
  assert.equal(missingSpeechTokenResponse.statusCode, 401)

  const headerTokenResponse = await fastify.inject({
    method: 'GET',
    url: '/context',
    headers: tokenHeaders(),
  })
  assert.equal(headerTokenResponse.statusCode, 200)

  const bearerTokenResponse = await fastify.inject({
    method: 'GET',
    url: '/context',
    headers: bearerHeaders(),
  })
  assert.equal(bearerTokenResponse.statusCode, 200)

  const healthResponse = await fastify.inject({
    method: 'GET',
    url: '/health',
  })
  assert.equal(healthResponse.statusCode, 200)

  const robotsResponse = await fastify.inject({
    method: 'GET',
    url: '/robots.txt',
  })
  assert.equal(robotsResponse.statusCode, 200)
})

test('LAN refresh rotates only once per interval and keeps the previous token in grace', async (t) => {
  await configureIsolatedAuth(t)

  const firstRefresh = await refreshLocal()
  assert.equal(firstRefresh.statusCode, 200)
  const firstBody = firstRefresh.json()
  assert.equal(typeof firstBody.token, 'string')
  assert.notEqual(firstBody.token, INITIAL_TOKEN)
  assert.equal(firstBody.header, 'X-Case-Hub-Token')
  assert.equal(firstBody.rotated, true)
  assert.equal(typeof firstBody.previousTokenGraceExpiresAt, 'string')

  const secondRefresh = await refreshLocal()
  assert.equal(secondRefresh.statusCode, 200)
  const secondBody = secondRefresh.json()
  assert.equal(secondBody.token, firstBody.token)
  assert.equal(secondBody.rotated, false)

  config.caseHubToken = ''

  const previousTokenResponse = await fastify.inject({
    method: 'GET',
    url: '/context',
    headers: tokenHeaders(INITIAL_TOKEN),
  })
  assert.equal(previousTokenResponse.statusCode, 200)

  const currentTokenResponse = await fastify.inject({
    method: 'GET',
    url: '/context',
    headers: tokenHeaders(firstBody.token),
  })
  assert.equal(currentTokenResponse.statusCode, 200)
})

test('public or Cloudflare-looking refresh requests cannot rotate the token', async (t) => {
  await configureIsolatedAuth(t)

  const publicForwardedResponse = await refreshLocal({
    'x-forwarded-for': '203.0.113.10',
  })
  assert.equal(publicForwardedResponse.statusCode, 403)
  assert.equal(Object.hasOwn(publicForwardedResponse.json(), 'token'), false)

  const cloudflareResponse = await refreshLocal({
    'cf-connecting-ip': '192.168.1.20',
    'cf-ray': 'test-ray',
  })
  assert.equal(cloudflareResponse.statusCode, 403)
  assert.equal(Object.hasOwn(cloudflareResponse.json(), 'token'), false)

  const protectedResponse = await fastify.inject({
    method: 'GET',
    url: '/context',
    headers: tokenHeaders(INITIAL_TOKEN),
  })
  assert.equal(protectedResponse.statusCode, 200)
})
