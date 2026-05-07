import assert from 'node:assert/strict'
import test from 'node:test'

import {
  config,
  fastify,
  normalizeSpeechRequestBody,
} from './hub.js'

const originalConfig = { ...config }
const originalFetch = globalThis.fetch
const TEST_CASE_HUB_TOKEN = 'test-speech-token'

test.before(async () => {
  await fastify.ready()
})

test.after(async () => {
  Object.assign(config, originalConfig)
  globalThis.fetch = originalFetch
  await fastify.close()
})

test.beforeEach(() => {
  Object.assign(config, originalConfig, {
    caseHubToken: TEST_CASE_HUB_TOKEN,
    openaiApiKey: 'test-openai-key',
    openaiBaseUrl: 'https://api.openai.test/v1',
    openaiTtsModel: 'gpt-4o-mini-tts',
    openaiTtsVoice: 'marin',
    openaiTtsInstructions: 'Default test voice instructions.',
    openaiTtsTimeout: 12,
  })
  globalThis.fetch = originalFetch
})

function speechHeaders() {
  return {
    'content-type': 'application/json',
    'x-case-hub-token': TEST_CASE_HUB_TOKEN,
  }
}

test('speech endpoint generates OpenAI TTS with cedar or marin voices', async () => {
  let capturedCall = null
  globalThis.fetch = async (url, options) => {
    capturedCall = { url, options }
    return new Response(Buffer.from([1, 2, 3]), {
      status: 200,
      headers: { 'content-type': 'audio/mpeg' },
    })
  }

  const response = await fastify.inject({
    method: 'POST',
    url: '/speech',
    headers: speechHeaders(),
    payload: {
      input: '안녕하세요. 오늘 일정을 알려주세요.',
      voice: 'cedar',
      instructions: 'Use a calm Korean assistant voice.',
    },
  })

  assert.equal(response.statusCode, 200)
  assert.equal(response.headers['content-type'], 'audio/mpeg')
  assert.equal(response.headers['x-openai-tts-voice'], 'cedar')
  assert.equal(capturedCall.url, 'https://api.openai.test/v1/audio/speech')
  assert.equal(capturedCall.options.method, 'POST')
  assert.equal(capturedCall.options.headers.authorization, 'Bearer test-openai-key')
  assert.equal(capturedCall.options.headers.accept, 'audio/mpeg')
  assert.deepEqual(JSON.parse(capturedCall.options.body), {
    model: 'gpt-4o-mini-tts',
    voice: 'cedar',
    input: '안녕하세요. 오늘 일정을 알려주세요.',
    instructions: 'Use a calm Korean assistant voice.',
    response_format: 'mp3',
  })
})

test('speech request defaults to configured marin voice and instructions', () => {
  const normalized = normalizeSpeechRequestBody({
    input: '  Hello from Case.  ',
  })

  assert.deepEqual(normalized, {
    input: 'Hello from Case.',
    voice: 'marin',
    instructions: 'Default test voice instructions.',
  })
})

test('speech endpoint rejects unsupported voices before calling OpenAI', async () => {
  let fetchCalled = false
  globalThis.fetch = async () => {
    fetchCalled = true
    return new Response(Buffer.from([1]), { status: 200 })
  }

  const response = await fastify.inject({
    method: 'POST',
    url: '/speech',
    headers: speechHeaders(),
    payload: {
      input: 'hello',
      voice: 'alloy',
    },
  })

  assert.equal(response.statusCode, 400)
  assert.equal(response.json().message, 'voice must be marin or cedar')
  assert.equal(fetchCalled, false)
})
