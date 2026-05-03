import assert from 'node:assert/strict'
import test from 'node:test'

process.env.CODEX_PATH = new URL('./test-fixtures/fake-codex-cli.js', import.meta.url).pathname

const { commandResults, config, fastify } = await import('./hub.js')
const originalFetch = globalThis.fetch
const originalConfig = { ...config }
const failingCodexPath = new URL('./test-fixtures/failing-codex-cli.js', import.meta.url).pathname

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
  delete process.env.FAKE_CODEX_RESPONSE
  globalThis.fetch = originalFetch
})

async function postChat(payload) {
  return fastify.inject({
    method: 'POST',
    url: '/chat',
    headers: { 'content-type': 'application/json' },
    payload,
  })
}

function rejectWorkerFetches() {
  const fetchCalls = []
  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    throw new Error('codex chat must not call worker servers')
  }
  return fetchCalls
}

test('POST /chat with codex returns HTTP 200 and Android message fields', async () => {
  const fetchCalls = rejectWorkerFetches()

  try {
    const response = await postChat({
      content: 'hello',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 200)

    const body = response.json()
    assert.deepEqual(Object.keys(body), ['message'])

    const { message } = body
    assert.equal(typeof message.id, 'string')
    assert.match(message.id, /^msg_[a-f0-9]{12}$/)
    assert.equal(typeof message.timestamp, 'string')
    assert.equal(Number.isNaN(Date.parse(message.timestamp)), false)
    assert.equal(message.content, 'codex handled: hello')
    assert.equal(message.role, 'assistant')
    assert.equal(message.status, 'sent')
    assert.equal(message.executionStatus, null)
    assert.equal(message.hasCommands, false)
    assert.equal(message.executionId, null)
    assert.deepEqual(message.parsedContent, {
      text: message.content,
      commands: null,
    })
    assert.equal(commandResults.size, 0)
    assert.equal(fetchCalls.length, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat normalizes successful codex JSON actions into Android message shape', async () => {
  const fetchCalls = rejectWorkerFetches()
  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: 'I will check the working tree.',
    action: {
      type: 'execute',
      instruction: 'Check the current git status',
    },
    memory: ['The user asks for concise status updates.'],
  })

  try {
    const response = await postChat({
      content: 'check status',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 200)

    const body = response.json()
    assert.deepEqual(Object.keys(body), ['message'])
    assert.equal(fetchCalls.length, 0)

    const { message } = body
    assert.equal(typeof message.id, 'string')
    assert.equal(typeof message.timestamp, 'string')
    assert.equal(Number.isNaN(Date.parse(message.timestamp)), false)
    assert.equal(message.content, 'I will check the working tree.')
    assert.equal(message.role, 'assistant')
    assert.equal(message.status, 'sent')
    assert.equal(message.executionStatus, 'queued')
    assert.equal(message.hasCommands, true)
    assert.equal(typeof message.executionId, 'string')
    assert.deepEqual(message.parsedContent, {
      text: 'I will check the working tree.',
      commands: [
        {
          command: 'Check the current git status',
          description: 'Computer task',
          workingDirectory: null,
          requiresConfirmation: false,
          timeoutSeconds: 120,
        },
      ],
    })

    const queued = commandResults.get(message.executionId)
    assert.equal(queued.status, 'queued')
    assert.equal(queued.result, null)
    assert.deepEqual(queued.commands, message.parsedContent.commands)
  } finally {
    delete process.env.FAKE_CODEX_RESPONSE
    globalThis.fetch = originalFetch
  }
})

test('POST /chat with gpt returns HTTP 200 and Android message fields', async () => {
  const fetchCalls = []
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-test-model'

  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                message: 'gpt handled: hello',
              }),
            },
          },
        ],
      }),
    }
  }

  try {
    const response = await postChat({
      content: 'hello',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 200)

    const body = response.json()
    assert.deepEqual(Object.keys(body), ['message'])

    const { message } = body
    assert.equal(typeof message.id, 'string')
    assert.match(message.id, /^msg_[a-f0-9]{12}$/)
    assert.equal(typeof message.timestamp, 'string')
    assert.equal(Number.isNaN(Date.parse(message.timestamp)), false)
    assert.equal(message.content, 'gpt handled: hello')
    assert.equal(message.role, 'assistant')
    assert.equal(message.status, 'sent')
    assert.equal(message.executionStatus, null)
    assert.equal(message.hasCommands, false)
    assert.equal(message.executionId, null)
    assert.deepEqual(message.parsedContent, {
      text: message.content,
      commands: null,
    })
    assert.equal(commandResults.size, 0)

    assert.equal(fetchCalls.length, 1)
    const [url, options] = fetchCalls[0]
    assert.equal(url, 'http://openai.test/v1/chat/completions')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.authorization, 'Bearer test-openai-key')
    assert.equal(options.headers['content-type'], 'application/json')
    assert.equal(JSON.parse(options.body).model, 'gpt-test-model')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat with ollama returns HTTP 200 and Android message fields', async () => {
  const fetchCalls = []
  config.chatProvider = 'ollama'
  config.ollamaBaseUrl = 'http://ollama.test'
  config.ollamaModel = 'ollama-test-model'

  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        message: {
          content: 'ollama handled: hello',
        },
      }),
    }
  }

  try {
    const response = await postChat({
      content: 'hello',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 200)

    const body = response.json()
    assert.deepEqual(Object.keys(body), ['message'])

    const { message } = body
    assert.equal(typeof message.id, 'string')
    assert.match(message.id, /^msg_[a-f0-9]{12}$/)
    assert.equal(typeof message.timestamp, 'string')
    assert.equal(Number.isNaN(Date.parse(message.timestamp)), false)
    assert.equal(message.content, 'ollama handled: hello')
    assert.equal(message.role, 'assistant')
    assert.equal(message.status, 'sent')
    assert.equal(message.executionStatus, null)
    assert.equal(message.hasCommands, false)
    assert.equal(message.executionId, null)
    assert.deepEqual(message.parsedContent, {
      text: message.content,
      commands: null,
    })
    assert.equal(commandResults.size, 0)

    assert.equal(fetchCalls.length, 1)
    const [url, options] = fetchCalls[0]
    assert.equal(url, 'http://ollama.test/api/chat')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers['content-type'], 'application/json')

    const requestBody = JSON.parse(options.body)
    assert.equal(requestBody.model, 'ollama-test-model')
    assert.equal(requestBody.stream, false)
    assert.equal(requestBody.messages.at(-1).role, 'user')
    assert.equal(requestBody.messages.at(-1).content, 'hello')
    assert.match(requestBody.messages[0].content, /shell code blocks/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat normalizes ollama shell commands into Android message shape', async () => {
  const fetchCalls = []
  config.chatProvider = 'ollama'
  config.ollamaBaseUrl = 'http://ollama.test'
  config.ollamaModel = 'ollama-test-model'

  const providerContent = [
    'I will inspect the project files with elevated privileges.',
    '',
    '```shell {"description":"Inspect project files","timeout_seconds":45}',
    'sudo ls -la',
    '```',
  ].join('\n')

  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        message: {
          content: providerContent,
        },
      }),
    }
  }

  try {
    const response = await postChat({
      content: 'list files',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 200)

    const body = response.json()
    assert.deepEqual(Object.keys(body), ['message'])

    const { message } = body
    assert.equal(typeof message.id, 'string')
    assert.match(message.id, /^msg_[a-f0-9]{12}$/)
    assert.equal(typeof message.timestamp, 'string')
    assert.equal(Number.isNaN(Date.parse(message.timestamp)), false)
    assert.equal(message.content, providerContent)
    assert.equal(message.role, 'assistant')
    assert.equal(message.status, 'sent')
    assert.equal(message.executionStatus, 'queued')
    assert.equal(message.hasCommands, true)
    assert.equal(typeof message.executionId, 'string')
    assert.deepEqual(message.parsedContent, {
      text: providerContent,
      commands: [
        {
          command: 'sudo ls -la',
          description: 'Inspect project files',
          workingDirectory: null,
          requiresConfirmation: true,
          timeoutSeconds: 45,
        },
      ],
    })

    const queued = commandResults.get(message.executionId)
    assert.equal(queued.status, 'queued')
    assert.equal(queued.result, null)
    assert.deepEqual(queued.commands, message.parsedContent.commands)
    assert.equal(fetchCalls.length, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat returns HTTP 502 with normalized provider error when codex fails after startup', async () => {
  config.chatProvider = 'codex'
  config.codexPath = failingCodexPath

  const response = await postChat({
    content: 'hello',
    conversationId: 'test',
  })

  assert.equal(response.statusCode, 502)
  assert.deepEqual(response.json(), {
    error: 'Provider Error',
    message: 'Codex chat failed with exit code 78: Codex config is invalid: missing auth token',
    provider: 'codex',
  })
  assert.equal(commandResults.size, 0)
})

test('POST /chat returns HTTP 502 with normalized provider error when gpt fails after startup', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'

  globalThis.fetch = async () => ({
    ok: false,
    status: 503,
    text: async () => 'upstream unavailable',
  })

  try {
    const response = await postChat({
      content: 'hello',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 502)
    assert.deepEqual(response.json(), {
      error: 'Provider Error',
      message: 'OpenAI API returned 503: upstream unavailable',
      provider: 'gpt',
    })
    assert.equal(commandResults.size, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat returns HTTP 502 with normalized provider error when ollama fails after startup', async () => {
  config.chatProvider = 'ollama'
  config.ollamaBaseUrl = 'http://ollama.test'

  globalThis.fetch = async () => ({
    ok: false,
    status: 500,
    text: async () => 'daemon unavailable',
  })

  try {
    const response = await postChat({
      content: 'hello',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 502)
    assert.deepEqual(response.json(), {
      error: 'Provider Error',
      message: 'Ollama API returned 500: daemon unavailable',
      provider: 'ollama',
    })
    assert.equal(commandResults.size, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})
