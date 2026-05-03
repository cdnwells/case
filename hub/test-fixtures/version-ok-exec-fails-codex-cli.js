#!/usr/bin/env node

import { writeFileSync } from 'node:fs'

if (process.argv.includes('--version')) {
  writeFileSync(1, 'codex test-cli 0.0.0\n')
  process.exit(0)
}

writeFileSync(2, 'Codex config is invalid: missing auth token\n')
process.exit(78)
