import assert from 'node:assert/strict'
import test from 'node:test'

import {
  commandResults,
  config,
  fastify,
  loadContextThenRunChatProvider,
} from './hub.js'

const originalFetch = globalThis.fetch
const originalConfig = { ...config }
const TEST_CASE_HUB_TOKEN = 'test-case-hub-token'
const authHeaders = { 'x-case-hub-token': TEST_CASE_HUB_TOKEN }

test.before(async () => {
  await fastify.ready()
})

test.after(async () => {
  commandResults.clear()
  delete process.env.FAKE_CODEX_RESPONSE
  globalThis.fetch = originalFetch
  await fastify.close()
})

test.beforeEach(() => {
  commandResults.clear()
  Object.assign(config, originalConfig)
  config.caseHubToken = TEST_CASE_HUB_TOKEN
  config.contextWorkerUrl = 'http://context.test'
  config.driveWorkerUrl = 'http://drive.test'
  delete process.env.FAKE_CODEX_RESPONSE
  globalThis.fetch = originalFetch
})

test('Drive routes require a Case Hub token', async () => {
  const response = await fastify.inject({
    method: 'GET',
    url: '/drive/files',
  })

  assert.equal(response.statusCode, 401)
  assert.deepEqual(response.json(), {
    error: 'Unauthorized',
    message: 'Case Hub token is required',
  })
})

async function postChat(payload) {
  return fastify.inject({
    method: 'POST',
    url: '/chat',
    headers: {
      'content-type': 'application/json',
      ...authHeaders,
    },
    payload,
  })
}

test('Drive file listing proxies through the configured Drive worker', async () => {
  const fetchCalls = []
  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    return new Response(JSON.stringify({
      files: [
        {
          id: 'drive-file-1',
          driveFileId: 'drive-file-1',
          name: 'report.txt',
          mimeType: 'text/plain',
          sizeBytes: 12,
        },
      ],
    }), { status: 200 })
  }

  const response = await fastify.inject({
    method: 'GET',
    url: '/drive/files?q=report',
    headers: authHeaders,
  })

  assert.equal(response.statusCode, 200)
  assert.deepEqual(response.json(), {
    files: [
      {
        id: 'drive-file-1',
        driveFileId: 'drive-file-1',
        name: 'report.txt',
        mimeType: 'text/plain',
        sizeBytes: 12,
      },
    ],
  })
  assert.equal(fetchCalls[0][0], 'http://drive.test/drive/files?q=report')
})

test('POST /chat uploads explicit generated files to the Drive worker', async () => {
  const fetchCalls = []
  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    const [url, options] = args
    if (url === 'http://context.test/context') {
      return new Response(JSON.stringify({
        context: '',
        memory_count: 0,
      }), { status: 200 })
    }

    if (url === 'http://drive.test/drive/files') {
      const body = JSON.parse(options.body)
      assert.deepEqual(body, {
        name: 'case-report.txt',
        mimeType: 'text/plain',
        encoding: 'utf8',
        content: 'hello from Case',
        sizeBytes: 15,
      })
      return new Response(JSON.stringify({
        id: 'uploaded-drive-file',
        driveFileId: 'uploaded-drive-file',
        name: body.name,
        mimeType: body.mimeType,
        sizeBytes: body.content.length,
        webViewLink: 'https://drive.example/uploaded-drive-file',
        createdAt: '2026-05-07T00:00:00.000Z',
      }), { status: 200 })
    }

    throw new Error(`unexpected fetch: ${url}`)
  }

  config.chatProvider = 'codex'
  config.codexPath = new URL('./test-fixtures/fake-codex-cli.js', import.meta.url).pathname
  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: '파일 만들었다. 다운로드해라.',
    files: [
      {
        name: 'case-report.txt',
        mimeType: 'text/plain',
        encoding: 'utf8',
        content: 'hello from Case',
      },
    ],
  })

  const response = await postChat({
    content: 'make a file',
    conversationId: 'drive-generated-file-test',
  })

  assert.equal(response.statusCode, 200)
  const { message } = response.json()
  assert.deepEqual(message.generatedFiles, [
    {
      id: 'uploaded-drive-file',
      driveFileId: 'uploaded-drive-file',
      name: 'case-report.txt',
      mimeType: 'text/plain',
      sizeBytes: 15,
      webViewLink: 'https://drive.example/uploaded-drive-file',
      createdAt: '2026-05-07T00:00:00.000Z',
    },
  ])
  assert.equal(fetchCalls.some(([url]) => url === 'http://drive.test/drive/files'), true)
})

test('Drive text attachments are downloaded and injected into provider content', async () => {
  globalThis.fetch = async (...args) => {
    const [url] = args
    if (url === 'http://drive.test/drive/files/drive-text-1/download') {
      return new Response('Drive file text', {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      })
    }

    throw new Error(`unexpected fetch: ${url}`)
  }

  const result = await loadContextThenRunChatProvider('gpt', {
    content: 'summarize this',
    conversationId: 'drive-attachment-test',
    attachments: [
      {
        type: 'drive-file',
        driveFileId: 'drive-text-1',
        name: 'notes.txt',
        mimeType: 'text/plain',
        sizeBytes: 15,
        source: 'google-drive',
      },
    ],
  }, {
    loadContext: async () => ({
      context: '',
      savedMemories: [],
      memoryCount: 0,
      memoryBlock: '',
    }),
    dispatchProvider: async (provider, requestBody) => {
      assert.equal(provider, 'gpt')
      assert.equal(Object.hasOwn(requestBody, 'attachments'), false)
      assert.match(requestBody.content, /Attached Google Drive file: notes\.txt/)
      assert.match(requestBody.content, /Drive file text/)
      return JSON.stringify({ message: '읽었다.' })
    },
  })

  assert.equal(result.providerContent, JSON.stringify({ message: '읽었다.' }))
})
