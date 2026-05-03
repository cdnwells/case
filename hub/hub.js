import 'dotenv/config'
import Fastify from 'fastify'
import crypto from 'crypto'
import { spawn } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_CHAT_PROVIDER, selectStartupChatProvider } from './providerMenu.js'
import { isExecutableAvailable, validateSelectedChatProvider as validateChatProviderConfig } from './providerValidation.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

// Configuration
const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  chatProvider: DEFAULT_CHAT_PROVIDER,
  codexPath: process.env.CODEX_PATH || 'codex',
  codexModel: process.env.CODEX_MODEL || '',
  codexProfile: process.env.CODEX_PROFILE || '',
  codexChatTimeout: parseInt(process.env.CODEX_CHAT_TIMEOUT || '120', 10),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  openaiTimeout: parseInt(process.env.OPENAI_TIMEOUT || '120', 10),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'gpt-oss-20b',
  ollamaTimeout: parseInt(process.env.OLLAMA_TIMEOUT || '120', 10),
}

async function validateSelectedChatProvider(logger) {
  return validateChatProviderConfig(config, logger)
}

const fastify = Fastify({
  logger: { level: process.env.LOG_LEVEL || 'info' },
  genReqId: () => crypto.randomUUID(),
})

// In-memory command result store
const RESULT_TTL_MS = 10 * 60 * 1000 // 10 minutes
const commandResults = new Map()

function buildCommandResultResponse(executionId, entry) {
  if (!entry) {
    return { status: 'not_found', executionId }
  }

  if (entry.status === 'queued' || entry.status === 'executing') {
    return {
      status: 'executing',
      executionId,
      result: null,
    }
  }

  const response = {
    status: entry.status,
    executionId,
  }

  if (Object.hasOwn(entry, 'result')) {
    response.result = entry.result
  }

  return response
}

// Cleanup expired results every 60 seconds
const commandResultsCleanupInterval = setInterval(() => {
  const now = Date.now()
  for (const [id, entry] of commandResults) {
    if (now - entry.createdAt > RESULT_TTL_MS) {
      commandResults.delete(id)
    }
  }
}, 60_000)
commandResultsCleanupInterval.unref?.()

class ChatProviderError extends Error {
  constructor(message, cause) {
    super(message)
    this.name = 'ChatProviderError'
    this.cause = cause
  }
}

function providerErrorMessage(err) {
  if (err instanceof Error && err.message) {
    return err.message
  }

  if (typeof err === 'string' && err.trim()) {
    return err.trim()
  }

  return 'Selected chat provider failed'
}

function buildProviderErrorResponse(provider, err) {
  return {
    error: 'Provider Error',
    message: providerErrorMessage(err),
    provider,
  }
}

function validateChatBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'Request body must be a JSON object'
  }

  if (typeof body.content !== 'string' || body.content.trim().length === 0) {
    return 'content must be a non-empty string'
  }

  if (body.content.length > 10_000) {
    return 'content must be 10000 characters or fewer'
  }

  if (body.conversationId !== undefined && typeof body.conversationId !== 'string') {
    return 'conversationId must be a string when provided'
  }

  return null
}

async function readTextFile(relativePath, fallback = '') {
  try {
    return (await readFile(path.join(repoRoot, relativePath), 'utf8')).trim()
  } catch {
    return fallback
  }
}

async function readMarkdownDirectory(relativePath) {
  const directory = path.join(repoRoot, relativePath)
  try {
    const names = await readdir(directory)
    const parts = []

    for (const name of names.sort()) {
      if (name.endsWith('.md')) {
        parts.push((await readFile(path.join(directory, name), 'utf8')).trim())
      }
    }

    return parts.filter(Boolean).join('\n\n')
  } catch {
    return ''
  }
}

const systemPromptCache = new Map()

async function buildSystemPrompt(provider) {
  if (systemPromptCache.has(provider)) {
    return systemPromptCache.get(provider)
  }

  const persona = await readTextFile('workers/shared/persona.md', 'You are Case, a helpful assistant.')
  const responseFormatPath = provider === 'ollama'
    ? 'workers/ollama/docs/response_format.md'
    : 'workers/gpt/docs/response_format.md'
  const responseFormat = await readTextFile(responseFormatPath)
  const workerDocs = provider === 'codex' ? await readMarkdownDirectory('workers/codex/docs') : ''
  const prompt = [persona, responseFormat, workerDocs].filter(Boolean).join('\n\n')

  systemPromptCache.set(provider, prompt)
  return prompt
}

function parseJsonObject(content) {
  try {
    return JSON.parse(content.trim())
  } catch {
    // Fall through to fenced JSON extraction.
  }

  const fenced = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
  if (!fenced) {
    return null
  }

  try {
    return JSON.parse(fenced[1])
  } catch {
    return null
  }
}

function normalizeCommand(command) {
  return {
    command: String(command.command || '').trim(),
    description: command.description ?? null,
    workingDirectory: command.workingDirectory ?? command.working_directory ?? null,
    requiresConfirmation: Boolean(command.requiresConfirmation ?? command.requires_confirmation ?? false),
    timeoutSeconds: Number(command.timeoutSeconds ?? command.timeout_seconds ?? 120),
  }
}

function parseJsonProviderContent(content) {
  const parsed = parseJsonObject(content)

  if (!parsed || typeof parsed !== 'object') {
    return {
      text: content.trim(),
      commands: [],
      memory: null,
    }
  }

  const messageText = typeof parsed.message === 'string' ? parsed.message : content
  const commands = []
  const action = parsed.action
  if (action && typeof action === 'object' && action.type === 'execute' && action.instruction) {
    commands.push(normalizeCommand({
      command: action.instruction,
      description: 'Computer task',
      requiresConfirmation: false,
      timeoutSeconds: 120,
    }))
  }

  const memory = Array.isArray(parsed.memory)
    ? parsed.memory.map(item => String(item)).filter(Boolean)
    : null

  return {
    text: messageText.trim(),
    commands,
    memory: memory?.length ? memory : null,
  }
}

const DANGEROUS_SHELL_COMMAND_PATTERNS = [
  /\brm\s+-rf\b/i,
  /\brm\s+-r\b/i,
  /\bsudo\b/i,
  /\bchmod\s+777\b/i,
  /\b>\s*\/dev\//i,
  /\bdd\s+if=/i,
  /\bmkfs\b/i,
  /\bformat\b/i,
]

function isDangerousShellCommand(command) {
  return DANGEROUS_SHELL_COMMAND_PATTERNS.some(pattern => pattern.test(command))
}

function parseShellProviderContent(content) {
  const commands = []
  const commandPattern = /```(?:shell|bash|sh)\s*(?:\{([^}]+)\})?\s*\n([\s\S]*?)\n```/g
  let match

  while ((match = commandPattern.exec(content)) !== null) {
    const commandText = match[2].trim()
    if (!commandText) {
      continue
    }

    let metadata = {}
    if (match[1]) {
      try {
        metadata = JSON.parse(`{${match[1]}}`)
      } catch {
        metadata = {}
      }
    }

    commands.push(normalizeCommand({
      command: commandText,
      description: metadata.description,
      requiresConfirmation: Boolean(metadata.confirm) || isDangerousShellCommand(commandText),
      timeoutSeconds: metadata.timeout_seconds ?? metadata.timeoutSeconds ?? 120,
    }))
  }

  return {
    text: content.trim(),
    commands,
    memory: null,
  }
}

function parseProviderContent(provider, content) {
  if (provider === 'ollama') {
    return parseShellProviderContent(content)
  }

  return parseJsonProviderContent(content)
}

function queueChatCommands(commands) {
  if (!commands?.length) {
    return {
      executionStatus: null,
      hasCommands: false,
      executionId: null,
    }
  }

  const executionId = crypto.randomUUID()
  commandResults.set(executionId, {
    status: 'queued',
    result: null,
    commands,
    createdAt: Date.now(),
  })

  return {
    executionStatus: 'queued',
    hasCommands: true,
    executionId,
  }
}

function createAndroidMessage({ text, commands }) {
  const commandList = commands?.length ? commands : null
  const execution = queueChatCommands(commandList)

  return {
    id: `msg_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`,
    content: text,
    role: 'assistant',
    timestamp: new Date().toISOString(),
    status: 'sent',
    parsedContent: {
      text,
      commands: commandList,
    },
    executionStatus: execution.executionStatus,
    hasCommands: execution.hasCommands,
    executionId: execution.executionId,
  }
}

function normalizeSuccessfulChatResponse(provider, providerContent) {
  const parsed = parseProviderContent(provider, providerContent)

  return {
    responseData: {
      message: createAndroidMessage({
        text: parsed.text,
        commands: parsed.commands,
      }),
    },
    memory: parsed.memory,
  }
}

function runProcess(command, args, input, timeoutSeconds) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    let settled = false
    let timer

    const finish = (callback) => {
      if (settled) {
        return
      }
      settled = true
      clearTimeout(timer)
      callback()
    }

    timer = setTimeout(() => {
      child.kill('SIGKILL')
      finish(() => reject(new ChatProviderError(`Provider timed out after ${timeoutSeconds}s`)))
    }, timeoutSeconds * 1000)

    child.stdout.on('data', chunk => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', chunk => {
      stderr += chunk.toString('utf8')
    })
    child.on('error', err => {
      finish(() => reject(new ChatProviderError(`Failed to start provider process: ${err.message}`, err)))
    })
    child.on('close', exitCode => {
      finish(() => resolve({ stdout, stderr, exitCode }))
    })

    child.stdin.end(input)
  })
}

async function runCodexChat({ content, context }) {
  const systemPrompt = await buildSystemPrompt('codex')
  const promptParts = [systemPrompt]
  if (context) {
    promptParts.push(`Known conversation context:\n${context}`)
  }
  promptParts.push(`User message:\n${content}`)
  promptParts.push('Respond as raw JSON following the response format above.')

  const args = [
    'exec',
    '--dangerously-bypass-approvals-and-sandbox',
    '--sandbox',
    'danger-full-access',
    '--skip-git-repo-check',
    '--color',
    'never',
  ]

  if (config.codexModel) {
    args.push('--model', config.codexModel)
  }
  if (config.codexProfile) {
    args.push('--profile', config.codexProfile)
  }
  args.push('-')

  const result = await runProcess(
    config.codexPath,
    args,
    promptParts.filter(Boolean).join('\n\n'),
    config.codexChatTimeout,
  )

  if (result.exitCode !== 0) {
    const stderr = result.stderr.trim()
    throw new ChatProviderError(`Codex chat failed with exit code ${result.exitCode}${stderr ? `: ${stderr}` : ''}`)
  }

  return result.stdout
}

async function runOpenAiChat({ content, context }) {
  if (!config.openaiApiKey) {
    throw new ChatProviderError('OPENAI_API_KEY is required for gpt chat provider')
  }

  const systemPrompt = await buildSystemPrompt('gpt')
  const messages = [
    { role: 'system', content: context ? `${systemPrompt}\n\n${context}` : systemPrompt },
    { role: 'user', content },
  ]

  const response = await fetch(`${config.openaiBaseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.openaiApiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.openaiModel,
      messages,
    }),
    signal: AbortSignal.timeout(config.openaiTimeout * 1000),
  })

  const responseText = await response.text()
  if (!response.ok) {
    throw new ChatProviderError(`OpenAI API returned ${response.status}: ${responseText.slice(0, 500)}`)
  }

  let data
  try {
    data = JSON.parse(responseText)
  } catch (err) {
    throw new ChatProviderError('OpenAI API returned invalid JSON', err)
  }

  const message = data?.choices?.[0]?.message?.content
  if (typeof message !== 'string') {
    throw new ChatProviderError('OpenAI API response did not include assistant content')
  }

  return message
}

async function runOllamaChat({ content }) {
  const systemPrompt = await buildSystemPrompt('ollama')
  const messages = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, { role: 'user', content }]
    : [{ role: 'user', content }]

  const response = await fetch(`${config.ollamaBaseUrl.replace(/\/$/, '')}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: config.ollamaModel,
      messages,
      stream: false,
    }),
    signal: AbortSignal.timeout(config.ollamaTimeout * 1000),
  })

  const responseText = await response.text()
  if (!response.ok) {
    throw new ChatProviderError(`Ollama API returned ${response.status}: ${responseText.slice(0, 500)}`)
  }

  let data
  try {
    data = JSON.parse(responseText)
  } catch (err) {
    throw new ChatProviderError('Ollama API returned invalid JSON', err)
  }

  const message = data?.message?.content
  if (typeof message !== 'string') {
    throw new ChatProviderError('Ollama API response did not include assistant content')
  }

  return message
}

async function runChatProvider(provider, requestBody) {
  const chatInput = {
    content: requestBody.content,
    conversationId: requestBody.conversationId,
    context: '',
  }

  if (provider === 'codex') {
    return runCodexChat(chatInput)
  }
  if (provider === 'gpt') {
    return runOpenAiChat(chatInput)
  }
  if (provider === 'ollama') {
    return runOllamaChat(chatInput)
  }

  throw new ChatProviderError(`Unsupported chat provider: ${provider}`)
}

// Health check (not forwarded)
fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString()
}))

// Poll command result by executionId
fastify.get('/command/result', async (request, reply) => {
  reply.code(404)
  return buildCommandResultResponse('', null)
})

fastify.get('/command/result/', async (request, reply) => {
  reply.code(404)
  return buildCommandResultResponse('', null)
})

fastify.get('/command/result/:executionId', async (request, reply) => {
  const { executionId } = request.params
  const entry = commandResults.get(executionId)

  if (!entry) {
    reply.code(404)
    return buildCommandResultResponse(executionId, entry)
  }

  return buildCommandResultResponse(executionId, entry)
})

fastify.get('/command/result/*', async (request, reply) => {
  reply.code(404)
  return buildCommandResultResponse(request.params['*'] || '', null)
})

// Chat endpoint with in-process provider handling
fastify.post('/chat', async (request, reply) => {
  const { body } = request
  const validationError = validateChatBody(body)
  if (validationError) {
    reply.code(400)
    return { error: 'Bad Request', message: validationError }
  }

  try {
    request.log.info({
      provider: config.chatProvider,
      conversationId: body.conversationId,
    }, 'Chat received')

    const providerContent = await runChatProvider(config.chatProvider, body)
    const normalized = normalizeSuccessfulChatResponse(config.chatProvider, providerContent)

    if (normalized.memory?.length) {
      request.log.info({ count: normalized.memory.length }, 'Provider returned internal memory')
    }

    return normalized.responseData
  } catch (err) {
    const providerError = buildProviderErrorResponse(config.chatProvider, err)
    request.log.error({ provider: config.chatProvider, error: providerError.message }, 'Chat provider failed')
    reply.code(502)
    return providerError
  }
})

// Graceful shutdown
const shutdown = async (signal) => {
  fastify.log.info({ signal }, 'Shutting down')
  await fastify.close()
  process.exit(0)
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

// Start
const start = async ({
  selectProvider = selectStartupChatProvider,
  validateProvider = validateSelectedChatProvider,
  listen = options => fastify.listen(options),
  logger = fastify.log,
  exit = process.exit,
} = {}) => {
  try {
    config.chatProvider = await selectProvider()
    await validateProvider(logger)
    await listen({ port: config.port, host: '0.0.0.0' })
    logger.info({
      chatProvider: config.chatProvider,
    }, 'Hub started')
  } catch (err) {
    if (err.code === 'PROVIDER_SELECTION_CANCELLED') {
      return exit(130)
    }

    const message = err instanceof Error ? err.message : String(err)
    logger.error({ err }, message)
    return exit(1)
  }
}

export {
  buildCommandResultResponse,
  buildProviderErrorResponse,
  commandResults,
  config,
  fastify,
  isExecutableAvailable,
  normalizeSuccessfulChatResponse,
  start,
  validateSelectedChatProvider,
}

const isMainModule = process.argv[1] && __filename === path.resolve(process.argv[1])

if (isMainModule) {
  start()
}
