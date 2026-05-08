import assert from 'node:assert/strict'
import test from 'node:test'

import {
  config,
  fastify,
  normalizeRealtimeCallRequestBody,
  validateRealtimeCallBody,
} from './hub.js'

const originalConfig = { ...config }
const originalFetch = globalThis.fetch
const TEST_CASE_HUB_TOKEN = 'test-realtime-token'
const TEST_OFFER_SDP = [
  'v=0',
  'o=- 123 456 IN IP4 127.0.0.1',
  's=-',
  't=0 0',
  'm=audio 9 UDP/TLS/RTP/SAVPF 111',
  'c=IN IP4 0.0.0.0',
  'a=rtpmap:111 opus/48000/2',
].join('\r\n')

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
    openaiRealtimeModel: 'gpt-realtime-2',
    openaiRealtimeVoice: 'cedar',
    openaiRealtimeInstructions: 'Speak as Case in Korean realtime voice mode.',
    openaiRealtimeReasoningEffort: 'medium',
    openaiRealtimeTranscriptionModel: 'gpt-realtime-whisper',
    openaiRealtimeTranscriptionLanguage: 'ko',
    openaiRealtimeTimeout: 12,
  })
  globalThis.fetch = originalFetch
})

function realtimeHeaders() {
  return {
    'content-type': 'application/json',
    'x-case-hub-token': TEST_CASE_HUB_TOKEN,
    'user-agent': 'case-android-test',
  }
}

test('realtime call endpoint exchanges a WebRTC offer for an OpenAI SDP answer', async () => {
  let capturedCall = null
  globalThis.fetch = async (url, options) => {
    capturedCall = { url, options }
    return new Response('v=0\r\nanswer', {
      status: 200,
      headers: { 'content-type': 'application/sdp' },
    })
  }

  const response = await fastify.inject({
    method: 'POST',
    url: '/realtime/calls',
    headers: realtimeHeaders(),
    payload: {
      sdp: TEST_OFFER_SDP,
      activationSource: 'wake_word',
      safetyIdentifier: 'case-owner-device',
    },
  })

  assert.equal(response.statusCode, 200)
  assert.match(response.headers['content-type'], /^application\/sdp/)
  assert.equal(response.headers['x-openai-realtime-model'], 'gpt-realtime-2')
  assert.equal(response.headers['x-openai-realtime-voice'], 'cedar')
  assert.equal(response.headers['x-openai-realtime-reasoning-effort'], 'medium')
  assert.equal(response.body, 'v=0\r\nanswer')
  assert.equal(capturedCall.url, 'https://api.openai.test/v1/realtime/calls')
  assert.equal(capturedCall.options.method, 'POST')
  assert.equal(capturedCall.options.headers.authorization, 'Bearer test-openai-key')
  assert.match(
    capturedCall.options.headers['OpenAI-Safety-Identifier'],
    /^case_[a-f0-9]{64}$/,
  )

  const outboundForm = capturedCall.options.body
  assert.equal(outboundForm.get('sdp'), TEST_OFFER_SDP)
  const session = JSON.parse(outboundForm.get('session'))
  assert.deepEqual(session, {
    type: 'realtime',
    model: 'gpt-realtime-2',
    instructions: 'Speak as Case in Korean realtime voice mode.',
    output_modalities: ['audio'],
    reasoning: { effort: 'medium' },
    audio: {
      input: {
        transcription: {
          model: 'gpt-realtime-whisper',
          language: 'ko',
        },
        turn_detection: {
          type: 'semantic_vad',
        },
      },
      output: { voice: 'cedar' },
    },
  })
})

test('realtime request validation rejects malformed SDP before calling OpenAI', async () => {
  let fetchCalled = false
  globalThis.fetch = async () => {
    fetchCalled = true
    return new Response('v=0\r\nanswer', { status: 200 })
  }

  const response = await fastify.inject({
    method: 'POST',
    url: '/realtime/calls',
    headers: realtimeHeaders(),
    payload: {
      sdp: 'not an sdp offer',
    },
  })

  assert.equal(response.statusCode, 400)
  assert.equal(response.json().message, 'sdp must be a valid WebRTC offer')
  assert.equal(fetchCalled, false)
})

test('realtime endpoint surfaces OpenAI session creation failures', async () => {
  globalThis.fetch = async () => new Response(
    JSON.stringify({ message: 'invalid realtime session' }),
    {
      status: 400,
      headers: { 'content-type': 'application/json' },
    },
  )

  const response = await fastify.inject({
    method: 'POST',
    url: '/realtime/calls',
    headers: realtimeHeaders(),
    payload: {
      sdp: TEST_OFFER_SDP,
    },
  })

  assert.equal(response.statusCode, 502)
  assert.deepEqual(response.json(), {
    error: 'Realtime Error',
    message: 'OpenAI Realtime session returned HTTP 400: invalid realtime session',
  })
})

test('realtime request body normalization trims optional metadata', () => {
  assert.deepEqual(
    normalizeRealtimeCallRequestBody({
      sdp: `  ${TEST_OFFER_SDP}  `,
      conversationId: '  case-conversation  ',
      activationSource: '  approved_voice  ',
      safetyIdentifier: '  case-owner  ',
    }),
    {
      sdp: TEST_OFFER_SDP,
      conversationId: 'case-conversation',
      activationSource: 'approved_voice',
      safetyIdentifier: 'case-owner',
    },
  )
})

test('realtime request body validator requires an object with SDP', () => {
  assert.equal(validateRealtimeCallBody(null), 'realtime request body must be an object')
  assert.equal(validateRealtimeCallBody({}), 'sdp must be a non-empty string')
})
