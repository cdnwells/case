import { spawn } from 'node:child_process'
import { constants as fsConstants } from 'node:fs'
import { access } from 'node:fs/promises'
import path from 'node:path'

import { CHAT_PROVIDERS } from './providerMenu.js'

const DEFAULT_CODEX_VALIDATION_TIMEOUT_MS = 5_000
const CODEX_EXEC_STARTUP_PROMPT = 'Reply with exactly: READY. Do not inspect or modify files.'

function trimCommandOutput(output) {
  const normalized = output.replace(/\s+/g, ' ').trim()
  return normalized.length > 500 ? `${normalized.slice(0, 500)}...` : normalized
}

export async function isExecutableAvailable(command, pathEnv = process.env.PATH || '') {
  const hasPathSeparator = command.includes('/') || command.includes(path.sep)
  const candidates = hasPathSeparator
    ? [command]
    : pathEnv.split(path.delimiter).map(directory => path.join(directory, command))

  for (const candidate of candidates) {
    try {
      await access(candidate, fsConstants.X_OK)
      return true
    } catch {
      // Try the next candidate.
    }
  }

  return false
}

function describeCommand(command, args) {
  return [command, ...args].join(' ')
}

function runCodexCliCommand(command, args, {
  spawnImpl = spawn,
  timeoutMs = DEFAULT_CODEX_VALIDATION_TIMEOUT_MS,
  stdin = '',
} = {}) {
  return new Promise((resolve, reject) => {
    let child
    try {
      child = spawnImpl(command, args, {
        env: { ...process.env, NO_COLOR: '1' },
        stdio: ['pipe', 'pipe', 'pipe'],
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      reject(new Error(`Codex CLI validation could not start: ${message}`))
      return
    }

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
      child.kill?.('SIGKILL')
      finish(() => reject(new Error(`Codex CLI validation timed out after ${Math.ceil(timeoutMs / 1000)}s while running "${describeCommand(command, args)}"`)))
    }, timeoutMs)

    child.stdout?.on('data', chunk => {
      stdout += chunk.toString('utf8')
    })
    child.stderr?.on('data', chunk => {
      stderr += chunk.toString('utf8')
    })
    child.on('error', err => {
      finish(() => reject(new Error(`Codex CLI validation failed to start: ${err.message}`)))
    })
    child.on('close', exitCode => {
      finish(() => resolve({ stdout, stderr, exitCode }))
    })
    child.stdin?.on('error', () => {})
    child.stdin?.end(stdin)
  })
}

function buildCodexExecStartupArgs({ codexModel = '', codexProfile = '' } = {}) {
  const args = [
    'exec',
    '--ephemeral',
    '--sandbox',
    'read-only',
    '--skip-git-repo-check',
    '--color',
    'never',
  ]

  if (codexModel) {
    args.push('--model', codexModel)
  }
  if (codexProfile) {
    args.push('--profile', codexProfile)
  }
  args.push('-')

  return args
}

export async function runCodexCliStartupCheck(command, {
  spawnImpl = spawn,
  timeoutMs = DEFAULT_CODEX_VALIDATION_TIMEOUT_MS,
  codexModel = '',
  codexProfile = '',
} = {}) {
  const version = await runCodexCliCommand(command, ['--version'], {
    spawnImpl,
    timeoutMs,
  })

  if (version.exitCode !== 0) {
    return { version, exec: null }
  }

  const exec = await runCodexCliCommand(command, buildCodexExecStartupArgs({ codexModel, codexProfile }), {
    spawnImpl,
    timeoutMs,
    stdin: CODEX_EXEC_STARTUP_PROMPT,
  })

  return { version, exec }
}

function getStartupCheckPhase(check, phase) {
  if (check?.[phase]) {
    return check[phase]
  }

  if (phase === 'version' && check && Object.hasOwn(check, 'exitCode')) {
    return check
  }

  return null
}

export async function validateSelectedChatProvider(config, logger = console, {
  providers = CHAT_PROVIDERS,
  fetchImpl = globalThis.fetch,
  codexCheckImpl = runCodexCliStartupCheck,
} = {}) {
  if (!providers.includes(config.chatProvider)) {
    throw new Error(`Unsupported chat provider "${config.chatProvider}". Choose one of: ${providers.join(', ')}`)
  }

  if (config.chatProvider === 'codex') {
    if (!(await isExecutableAvailable(config.codexPath))) {
      throw new Error(`Codex chat provider selected, but CODEX_PATH "${config.codexPath}" is not executable`)
    }

    let check
    try {
      check = await codexCheckImpl(config.codexPath, {
        codexModel: config.codexModel,
        codexProfile: config.codexProfile,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      throw new Error(`Codex chat provider selected, but CODEX_PATH "${config.codexPath}" failed startup validation: ${message}`)
    }

    const versionCheck = getStartupCheckPhase(check, 'version')
    const versionOutput = trimCommandOutput(`${versionCheck?.stdout || ''}\n${versionCheck?.stderr || ''}`)
    if (!versionCheck || versionCheck.exitCode !== 0) {
      throw new Error(`Codex chat provider selected, but CODEX_PATH "${config.codexPath}" failed startup validation with exit code ${versionCheck?.exitCode ?? 'unknown'}: ${versionOutput || 'no CLI output'}`)
    }

    if (!/\bcodex\b/i.test(versionOutput)) {
      throw new Error(`Codex chat provider selected, but CODEX_PATH "${config.codexPath}" did not appear to be the Codex CLI: ${versionOutput || 'no CLI output'}`)
    }

    const execCheck = getStartupCheckPhase(check, 'exec')
    if (!execCheck) {
      throw new Error(`Codex chat provider selected, but CODEX_PATH "${config.codexPath}" did not run a Codex exec startup smoke check`)
    }

    const execOutput = trimCommandOutput(`${execCheck.stdout || ''}\n${execCheck.stderr || ''}`)
    if (execCheck.exitCode !== 0) {
      throw new Error(`Codex chat provider selected, but CODEX_PATH "${config.codexPath}" failed Codex exec startup smoke check with exit code ${execCheck.exitCode}: ${execOutput || 'no CLI output'}`)
    }

    logger.info?.({ provider: config.chatProvider }, 'Chat provider validated')
    return
  }

  if (config.chatProvider === 'gpt') {
    if (!config.openaiApiKey) {
      throw new Error('GPT chat provider selected, but OPENAI_API_KEY is not set')
    }
    logger.info?.({ provider: config.chatProvider, model: config.openaiModel }, 'Chat provider validated')
    return
  }

  if (typeof fetchImpl !== 'function') {
    throw new Error('Ollama chat provider selected, but fetch is not available')
  }

  let response
  try {
    response = await fetchImpl(`${config.ollamaBaseUrl.replace(/\/$/, '')}/api/tags`, {
      signal: AbortSignal.timeout(Math.min(config.ollamaTimeout, 10) * 1000),
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Ollama chat provider selected, but ${config.ollamaBaseUrl} is unavailable: ${message}`)
  }

  if (!response.ok) {
    throw new Error(`Ollama chat provider selected, but /api/tags returned HTTP ${response.status}`)
  }

  let data
  try {
    data = await response.json()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`Ollama chat provider selected, but /api/tags returned invalid JSON: ${message}`)
  }

  const requestedModel = String(config.ollamaModel || '').trim()
  if (!requestedModel) {
    throw new Error('Ollama chat provider selected, but OLLAMA_MODEL is not set')
  }

  const models = Array.isArray(data?.models)
    ? data.models.map(model => model?.name || '').filter(Boolean)
    : []
  if (!models.some(model => model.includes(requestedModel))) {
    throw new Error(`Ollama chat provider selected, but model "${requestedModel}" is not available at ${config.ollamaBaseUrl}. Available models: ${models.join(', ') || 'none'}`)
  }

  logger.info?.({ provider: config.chatProvider, model: config.ollamaModel }, 'Chat provider validated')
}
