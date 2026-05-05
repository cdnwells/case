import assert from 'node:assert/strict'
import test from 'node:test'

import { config, start, validateContextWorkerReachability, validateContextWorkerUrl } from './hub.js'
import { validateSelectedChatProvider } from './providerValidation.js'

const fakeCodexPath = new URL('./test-fixtures/fake-codex-cli.js', import.meta.url).pathname
const failingCodexPath = new URL('./test-fixtures/failing-codex-cli.js', import.meta.url).pathname
const versionOkExecFailsCodexPath = new URL('./test-fixtures/version-ok-exec-fails-codex-cli.js', import.meta.url).pathname
const fakeClaudePath = new URL('./test-fixtures/fake-claude-cli.js', import.meta.url).pathname
const failingClaudePath = new URL('./test-fixtures/failing-claude-cli.js', import.meta.url).pathname

const logger = {
  info() {},
  error() {},
}

const baseConfig = {
  chatProvider: 'codex',
  codexPath: fakeCodexPath,
  codexValidationTimeout: 30,
  claudePath: fakeClaudePath,
  claudeValidationTimeout: 30,
  openaiApiKey: 'test-key',
  openaiModel: 'gpt-4o',
  ollamaBaseUrl: 'http://ollama.test',
  ollamaModel: 'expected-model',
  ollamaTimeout: 120,
}

const originalConfig = { ...config }
const originalFetch = globalThis.fetch

test.beforeEach(() => {
  config.contextWorkerUrl = 'http://context.test'
})

test.afterEach(() => {
  Object.assign(config, originalConfig)
  globalThis.fetch = originalFetch
})

test('context worker URL validation rejects missing or empty values', () => {
  for (const contextWorkerUrl of [undefined, null, '', '   ']) {
    assert.throws(
      () => validateContextWorkerUrl({ contextWorkerUrl }, logger),
      /CONTEXT_WORKER_URL is required because the context worker is a required dependency/,
    )
  }
})

test('context worker URL validation trims configured URL', () => {
  validateContextWorkerUrl({ contextWorkerUrl: '  http://context.test  ' }, logger)

  assert.equal(config.contextWorkerUrl, 'http://context.test')
})

test('context worker startup validation checks the health endpoint', async () => {
  config.contextWorkerUrl = '  http://context.test  '

  const calls = []
  await validateContextWorkerReachability(logger, {
    fetchImpl: async (...args) => {
      calls.push(args)
      return {
        ok: true,
        status: 200,
      }
    },
  })

  assert.equal(config.contextWorkerUrl, 'http://context.test')
  assert.equal(calls.length, 1)
  const [url, options] = calls[0]
  assert.equal(url, 'http://context.test/health')
  assert.equal(options.method, 'GET')
  assert.equal(options.headers.accept, 'application/json')
})

test('context worker startup validation rejects unreachable health endpoint', async () => {
  config.contextWorkerUrl = 'http://context.test'
  const cause = new Error('connect ECONNREFUSED 127.0.0.1:8001')
  const calls = []

  await assert.rejects(
    () => validateContextWorkerReachability(logger, {
      fetchImpl: async (...args) => {
        calls.push(args)
        throw cause
      },
    }),
    err => {
      assert.equal(
        err.message,
        'Context worker startup validation failed: http://context.test is unreachable: connect ECONNREFUSED 127.0.0.1:8001',
      )
      assert.equal(err.cause, cause)
      return true
    },
  )

  assert.equal(calls.length, 1)
  const [url, options] = calls[0]
  assert.equal(url, 'http://context.test/health')
  assert.equal(options.method, 'GET')
  assert.equal(options.headers.accept, 'application/json')
})

test('hub startup allows missing or empty CONTEXT_WORKER_URL because memory is in-process by default', async () => {
  for (const contextWorkerUrl of [undefined, null, '', '   ']) {
    config.contextWorkerUrl = contextWorkerUrl

    const errors = []
    const fetchCalls = []
    let listened = false
    let providerValidated = false
    let exitCode = null
    globalThis.fetch = async (...args) => {
      fetchCalls.push(args)
      throw new Error('fetch must not run without CONTEXT_WORKER_URL')
    }

    const result = await start({
      selectProvider: async () => 'codex',
      validateProvider: async () => {
        providerValidated = true
      },
      listen: async () => {
        listened = true
      },
      logger: {
        info() {},
        error(...args) {
          errors.push(args)
        },
      },
      exit(code) {
        exitCode = code
        return code
      },
    })

    assert.equal(result, undefined)
    assert.equal(exitCode, null)
    assert.equal(fetchCalls.length, 0)
    assert.equal(listened, true)
    assert.equal(providerValidated, true)
    assert.equal(errors.length, 0)
  }
})

test('hub startup rejects an unreachable context worker before provider validation and listen', async () => {
  config.contextWorkerUrl = 'http://context.test'

  const fetchCalls = []
  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    throw new Error('connect ECONNREFUSED context.test:80')
  }

  const errors = []
  let listened = false
  let providerValidated = false
  let exitCode = null

  const result = await start({
    selectProvider: async () => 'codex',
    validateProvider: async () => {
      providerValidated = true
    },
    listen: async () => {
      listened = true
      throw new Error('listen must not run when context worker is unreachable')
    },
    logger: {
      info() {},
      error(...args) {
        errors.push(args)
      },
    },
    exit(code) {
      exitCode = code
      return code
    },
  })

  const expectedMessage = 'Context worker startup validation failed: http://context.test is unreachable: connect ECONNREFUSED context.test:80'

  assert.equal(result, 1)
  assert.equal(exitCode, 1)
  assert.equal(providerValidated, false)
  assert.equal(listened, false)
  assert.equal(fetchCalls.length, 1)
  const [url, options] = fetchCalls[0]
  assert.equal(url, 'http://context.test/health')
  assert.equal(options.method, 'GET')
  assert.equal(options.headers.accept, 'application/json')
  assert.equal(errors.length, 1)
  assert.equal(errors[0][1], expectedMessage)
  assert.equal(errors[0][0].err.message, expectedMessage)
})

test('hub startup rejects an unhealthy context worker before provider validation and listen', async () => {
  config.contextWorkerUrl = 'http://context.test'

  const fetchCalls = []
  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    return {
      ok: false,
      status: 503,
    }
  }

  const errors = []
  let listened = false
  let providerValidated = false
  let exitCode = null

  const result = await start({
    selectProvider: async () => 'codex',
    validateProvider: async () => {
      providerValidated = true
    },
    listen: async () => {
      listened = true
      throw new Error('listen must not run when context worker health check fails')
    },
    logger: {
      info() {},
      error(...args) {
        errors.push(args)
      },
    },
    exit(code) {
      exitCode = code
      return code
    },
  })

  const expectedMessage = 'Context worker startup validation failed: http://context.test returned HTTP 503'

  assert.equal(result, 1)
  assert.equal(exitCode, 1)
  assert.equal(providerValidated, false)
  assert.equal(listened, false)
  assert.equal(fetchCalls.length, 1)
  const [url, options] = fetchCalls[0]
  assert.equal(url, 'http://context.test/health')
  assert.equal(options.method, 'GET')
  assert.equal(options.headers.accept, 'application/json')
  assert.equal(errors.length, 1)
  assert.equal(errors[0][1], expectedMessage)
  assert.equal(errors[0][0].err.message, expectedMessage)
})

test('startup validation rejects unsupported chat providers', async () => {
  await assert.rejects(
    () => validateSelectedChatProvider({
      ...baseConfig,
      chatProvider: 'unknown',
    }, logger),
    /Unsupported chat provider "unknown"/,
  )
})

test('claude startup validation fails when CLAUDE_PATH is not executable', async () => {
  await assert.rejects(
    () => validateSelectedChatProvider({
      ...baseConfig,
      chatProvider: 'claude',
      claudePath: '/tmp/case-missing-claude-cli',
    }, logger),
    /CLAUDE_PATH "\/tmp\/case-missing-claude-cli" is not executable/,
  )
})

test('claude startup validation passes when CLAUDE_PATH is a usable Claude Code CLI', async () => {
  await validateSelectedChatProvider({
    ...baseConfig,
    chatProvider: 'claude',
    claudePath: fakeClaudePath,
  }, logger)
})

test('claude startup validation passes configured timeout to Claude Code CLI checks', async () => {
  const calls = []

  await validateSelectedChatProvider({
    ...baseConfig,
    chatProvider: 'claude',
    claudePath: fakeClaudePath,
    claudeValidationTimeout: 60,
  }, logger, {
    claudeCheckImpl: async (command, options) => {
      calls.push({ command, options })
      return {
        stdout: 'Claude Code test-cli 0.0.0\n',
        stderr: '',
        exitCode: 0,
      }
    },
  })

  assert.deepEqual(calls, [{
    command: fakeClaudePath,
    options: {
      timeoutMs: 60_000,
    },
  }])
})

test('claude startup validation fails when the Claude Code CLI exits with a configuration error', async () => {
  await assert.rejects(
    () => validateSelectedChatProvider({
      ...baseConfig,
      chatProvider: 'claude',
      claudePath: failingClaudePath,
    }, logger),
    (err) => {
      assert.equal(err instanceof Error, true)
      assert.match(err.message, /Claude Code chat provider selected/)
      assert.match(err.message, /failed startup validation with exit code 78/)
      assert.match(err.message, /Claude Code config is invalid: missing auth token/)
      return true
    },
  )
})

test('gpt startup validation fails when OPENAI_API_KEY is missing', async () => {
  await assert.rejects(
    () => validateSelectedChatProvider({
      ...baseConfig,
      chatProvider: 'gpt',
      openaiApiKey: '',
    }, logger),
    /OPENAI_API_KEY is not set/,
  )
})

test('hub startup with gpt fails before listen when OPENAI_API_KEY is missing', async () => {
  config.openaiApiKey = ''

  const errors = []
  let listened = false
  let exitCode = null

  const result = await start({
    selectProvider: async () => 'gpt',
    validateContextWorker: async () => {},
    listen: async () => {
      listened = true
      throw new Error('listen must not run without OPENAI_API_KEY')
    },
    logger: {
      info() {},
      error(...args) {
        errors.push(args)
      },
    },
    exit(code) {
      exitCode = code
      return code
    },
  })

  assert.equal(result, 1)
  assert.equal(exitCode, 1)
  assert.equal(listened, false)
  assert.equal(config.chatProvider, 'gpt')
  assert.equal(errors.length, 1)
  assert.equal(errors[0][1], 'GPT chat provider selected, but OPENAI_API_KEY is not set')
  assert.equal(errors[0][0].err.message, 'GPT chat provider selected, but OPENAI_API_KEY is not set')
})

test('codex startup validation fails when CODEX_PATH is not executable', async () => {
  await assert.rejects(
    () => validateSelectedChatProvider({
      ...baseConfig,
      chatProvider: 'codex',
      codexPath: '/tmp/case-missing-codex-cli',
    }, logger),
    /CODEX_PATH "\/tmp\/case-missing-codex-cli" is not executable/,
  )
})

test('codex startup validation passes when CODEX_PATH is a usable Codex CLI', async () => {
  await validateSelectedChatProvider({
    ...baseConfig,
    chatProvider: 'codex',
    codexPath: fakeCodexPath,
  }, logger)
})

test('codex startup validation passes configured timeout to Codex CLI checks', async () => {
  const calls = []

  await validateSelectedChatProvider({
    ...baseConfig,
    chatProvider: 'codex',
    codexPath: fakeCodexPath,
    codexModel: 'gpt-test',
    codexProfile: 'case-test',
    codexValidationTimeout: 45,
  }, logger, {
    codexCheckImpl: async (command, options) => {
      calls.push({ command, options })
      return {
        version: {
          stdout: 'codex test-cli 0.0.0\n',
          stderr: '',
          exitCode: 0,
        },
        exec: {
          stdout: 'READY\n',
          stderr: '',
          exitCode: 0,
        },
      }
    },
  })

  assert.deepEqual(calls, [{
    command: fakeCodexPath,
    options: {
      codexModel: 'gpt-test',
      codexProfile: 'case-test',
      timeoutMs: 45_000,
    },
  }])
})

test('codex startup validation fails when the Codex CLI exits with a configuration error', async () => {
  await assert.rejects(
    () => validateSelectedChatProvider({
      ...baseConfig,
      chatProvider: 'codex',
      codexPath: failingCodexPath,
    }, logger),
    (err) => {
      assert.equal(err instanceof Error, true)
      assert.match(err.message, /Codex chat provider selected/)
      assert.match(err.message, /failed startup validation with exit code 78/)
      assert.match(err.message, /Codex config is invalid: missing auth token/)
      return true
    },
  )
})

test('codex startup validation fails when version succeeds but exec smoke check fails', async () => {
  await assert.rejects(
    () => validateSelectedChatProvider({
      ...baseConfig,
      chatProvider: 'codex',
      codexPath: versionOkExecFailsCodexPath,
    }, logger),
    (err) => {
      assert.equal(err instanceof Error, true)
      assert.match(err.message, /Codex chat provider selected/)
      assert.match(err.message, /failed Codex exec startup smoke check with exit code 78/)
      assert.match(err.message, /Codex config is invalid: missing auth token/)
      return true
    },
  )
})

test('hub startup with codex fails before listen when Codex exec smoke check fails', async () => {
  config.codexPath = versionOkExecFailsCodexPath

  const errors = []
  let listened = false
  let exitCode = null

  const result = await start({
    selectProvider: async () => 'codex',
    validateContextWorker: async () => {},
    listen: async () => {
      listened = true
      throw new Error('listen must not run with a misconfigured Codex CLI')
    },
    logger: {
      info() {},
      error(...args) {
        errors.push(args)
      },
    },
    exit(code) {
      exitCode = code
      return code
    },
  })

  assert.equal(result, 1)
  assert.equal(exitCode, 1)
  assert.equal(listened, false)
  assert.equal(config.chatProvider, 'codex')
  assert.equal(errors.length, 1)
  assert.match(errors[0][1], /failed Codex exec startup smoke check with exit code 78/)
  assert.match(errors[0][1], /Codex config is invalid: missing auth token/)
  assert.equal(errors[0][0].err.message, errors[0][1])
})

test('ollama startup validation fails when the configured model is unavailable', async () => {
  await assert.rejects(
    () => validateSelectedChatProvider({
      ...baseConfig,
      chatProvider: 'ollama',
    }, logger, {
      fetchImpl: async (url) => {
        assert.equal(url, 'http://ollama.test/api/tags')
        return new Response(JSON.stringify({
          models: [{ name: 'other-model:latest' }],
        }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      },
    }),
    /Ollama chat provider selected, but model "expected-model" is not available at http:\/\/ollama\.test\. Available models: other-model:latest/,
  )
})

test('ollama startup validation fails when the daemon is unavailable', async () => {
  await assert.rejects(
    () => validateSelectedChatProvider({
      ...baseConfig,
      chatProvider: 'ollama',
      ollamaBaseUrl: 'http://127.0.0.1:11434',
    }, logger, {
      fetchImpl: async (url) => {
        assert.equal(url, 'http://127.0.0.1:11434/api/tags')
        throw new Error('connect ECONNREFUSED 127.0.0.1:11434')
      },
    }),
    /Ollama chat provider selected, but http:\/\/127\.0\.0\.1:11434 is unavailable: connect ECONNREFUSED 127\.0\.0\.1:11434/,
  )
})

test('hub startup with ollama fails before listen when the daemon is unavailable', async () => {
  config.ollamaBaseUrl = 'http://127.0.0.1:11434'
  config.ollamaModel = 'expected-model'

  globalThis.fetch = async (url) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/tags')
    throw new Error('connect ECONNREFUSED 127.0.0.1:11434')
  }

  const errors = []
  let listened = false
  let exitCode = null

  const result = await start({
    selectProvider: async () => 'ollama',
    validateContextWorker: async () => {},
    listen: async () => {
      listened = true
      throw new Error('listen must not run when Ollama is unavailable')
    },
    logger: {
      info() {},
      error(...args) {
        errors.push(args)
      },
    },
    exit(code) {
      exitCode = code
      return code
    },
  })

  const expectedMessage = 'Ollama chat provider selected, but http://127.0.0.1:11434 is unavailable: connect ECONNREFUSED 127.0.0.1:11434'

  assert.equal(result, 1)
  assert.equal(exitCode, 1)
  assert.equal(listened, false)
  assert.equal(config.chatProvider, 'ollama')
  assert.equal(errors.length, 1)
  assert.equal(errors[0][1], expectedMessage)
  assert.equal(errors[0][0].err.message, expectedMessage)
})

test('hub startup with ollama fails before listen when the configured model is unavailable', async () => {
  config.ollamaBaseUrl = 'http://ollama.test'
  config.ollamaModel = 'missing-model'

  globalThis.fetch = async (url) => {
    assert.equal(url, 'http://ollama.test/api/tags')
    return new Response(JSON.stringify({
      models: [
        { name: 'llama3:latest' },
        { name: 'mistral:latest' },
      ],
    }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  const errors = []
  let listened = false
  let exitCode = null

  const result = await start({
    selectProvider: async () => 'ollama',
    validateContextWorker: async () => {},
    listen: async () => {
      listened = true
      throw new Error('listen must not run when the selected Ollama model is unavailable')
    },
    logger: {
      info() {},
      error(...args) {
        errors.push(args)
      },
    },
    exit(code) {
      exitCode = code
      return code
    },
  })

  const expectedMessage = 'Ollama chat provider selected, but model "missing-model" is not available at http://ollama.test. Available models: llama3:latest, mistral:latest'

  assert.equal(result, 1)
  assert.equal(exitCode, 1)
  assert.equal(listened, false)
  assert.equal(config.chatProvider, 'ollama')
  assert.equal(errors.length, 1)
  assert.equal(errors[0][1], expectedMessage)
  assert.equal(errors[0][0].err.message, expectedMessage)
})

test('ollama startup validation passes when the configured model is available', async () => {
  await validateSelectedChatProvider({
    ...baseConfig,
    chatProvider: 'ollama',
  }, logger, {
    fetchImpl: async (url) => {
      assert.equal(url, 'http://ollama.test/api/tags')
      return new Response(JSON.stringify({
        models: [{ name: 'expected-model:latest' }],
      }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    },
  })
})
