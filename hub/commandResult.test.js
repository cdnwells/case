import assert from 'node:assert/strict'
import test from 'node:test'

import { commandResults, config, fastify } from './hub.js'

const originalConfig = { ...config }

test.before(async () => {
  await fastify.ready()
})

test.after(async () => {
  commandResults.clear()
  delete process.env.FAKE_CODEX_RESPONSE
  await fastify.close()
})

test.beforeEach(() => {
  commandResults.clear()
  Object.assign(config, originalConfig)
  delete process.env.FAKE_CODEX_RESPONSE
})

async function getCommandResult(executionId) {
  const response = await fastify.inject({
    method: 'GET',
    url: `/command/result/${executionId}`,
  })

  return {
    statusCode: response.statusCode,
    body: response.json(),
  }
}

async function postChat(payload) {
  return fastify.inject({
    method: 'POST',
    url: '/chat',
    headers: { 'content-type': 'application/json' },
    payload,
  })
}

test('unknown command result returns Android not_found response', async () => {
  assert.deepEqual(await getCommandResult('missing'), {
    statusCode: 404,
    body: {
      status: 'not_found',
      executionId: 'missing',
    },
  })
})

test('empty command result executionId returns Android not_found response', async () => {
  for (const url of ['/command/result', '/command/result/']) {
    const response = await fastify.inject({
      method: 'GET',
      url,
    })

    assert.deepEqual({
      statusCode: response.statusCode,
      body: response.json(),
    }, {
      statusCode: 404,
      body: {
        status: 'not_found',
        executionId: '',
      },
    })
  }
})

test('malformed command result executionId path returns Android not_found response', async () => {
  const response = await fastify.inject({
    method: 'GET',
    url: '/command/result/bad/id',
  })

  assert.deepEqual({
    statusCode: response.statusCode,
    body: response.json(),
  }, {
    statusCode: 404,
    body: {
      status: 'not_found',
      executionId: 'bad/id',
    },
  })
})

test('queued command result can be polled with executionId returned by POST /chat', async () => {
  config.chatProvider = 'codex'
  config.codexPath = new URL('./test-fixtures/fake-codex-cli.js', import.meta.url).pathname
  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: 'I will inspect the working tree.',
    action: {
      type: 'execute',
      instruction: 'git status --short',
    },
  })

  const chatResponse = await postChat({
    content: 'check status',
    conversationId: 'command-result-test',
  })

  assert.equal(chatResponse.statusCode, 200)

  const { message } = chatResponse.json()
  assert.equal(message.executionStatus, 'queued')
  assert.equal(message.hasCommands, true)
  assert.equal(typeof message.executionId, 'string')
  assert.notEqual(message.executionId.length, 0)

  assert.deepEqual(await getCommandResult(message.executionId), {
    statusCode: 200,
    body: {
      status: 'executing',
      executionId: message.executionId,
      result: null,
    },
  })
})

test('queued command result returns executing status with null result', async () => {
  commandResults.set('queued-id', {
    status: 'queued',
    createdAt: Date.now(),
  })

  assert.deepEqual(await getCommandResult('queued-id'), {
    statusCode: 200,
    body: {
      status: 'executing',
      executionId: 'queued-id',
      result: null,
    },
  })
})

test('executing command result returns executing status with null result', async () => {
  commandResults.set('executing-id', {
    status: 'executing',
    result: {
      success: true,
      stdout: 'partial output must not leak while executing',
      stderr: '',
      exit_code: 0,
      execution_time: 0,
    },
    createdAt: Date.now(),
  })

  assert.deepEqual(await getCommandResult('executing-id'), {
    statusCode: 200,
    body: {
      status: 'executing',
      executionId: 'executing-id',
      result: null,
    },
  })
})

test('completed command result returns stored worker result', async () => {
  const result = {
    success: true,
    stdout: 'ok',
    stderr: '',
    exit_code: 0,
    execution_time: 0.1,
  }

  commandResults.set('completed-id', {
    status: 'completed',
    result,
    createdAt: Date.now(),
  })

  assert.deepEqual(await getCommandResult('completed-id'), {
    statusCode: 200,
    body: {
      status: 'completed',
      executionId: 'completed-id',
      result,
    },
  })
})

test('failed command result returns stored worker result', async () => {
  const result = {
    success: false,
    stdout: '',
    stderr: 'nope',
    exit_code: 1,
    execution_time: 0.2,
  }

  commandResults.set('failed-id', {
    status: 'failed',
    result,
    createdAt: Date.now(),
  })

  assert.deepEqual(await getCommandResult('failed-id'), {
    statusCode: 200,
    body: {
      status: 'failed',
      executionId: 'failed-id',
      result,
    },
  })
})
