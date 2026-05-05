import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')
const runServersPath = path.join(repoRoot, 'run_servers.sh')

function runDeployDryRun(envOverrides = {}) {
  return new Promise(resolve => {
    execFile(runServersPath, ['--hub-only', '--dry-run'], {
      cwd: repoRoot,
      env: {
        ...process.env,
        CHAT_PROVIDER: 'codex',
        LOG_LEVEL: 'silent',
        MEMORY_LOAD_TIMEOUT: '1',
        ...envOverrides,
      },
      maxBuffer: 1024 * 1024,
      timeout: 7000,
    }, (error, stdout, stderr) => {
      resolve({
        error,
        stdout,
        stderr,
        exitCode: error ? error.code : 0,
        signal: error?.signal ?? null,
      })
    })
  })
}

test('deploy dry-run starts only the merged hub without context worker preflight', async () => {
  const result = await runDeployDryRun({
    CONTEXT_WORKER_URL: 'http://127.0.0.1:1',
  })

  assert.equal(result.exitCode, 0, result.stderr || result.stdout)
  assert.equal(result.signal, null)
  assert.match(result.stdout, /\[dry-run\] \(hub\) cd .*\/hub &&/)
  assert.match(result.stdout, /CHAT_PROVIDER=codex/)
  assert.doesNotMatch(result.stdout, /CONTEXT_WORKER_URL=/)
  assert.equal(result.stderr, '')
})
