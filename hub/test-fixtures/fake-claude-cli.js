#!/usr/bin/env node

import { writeFileSync } from 'node:fs'

if (process.argv.includes('--version')) {
  writeFileSync(1, 'Claude Code test-cli 0.0.0\n')
  process.exit(0)
}

const promptIndex = process.argv.indexOf('-p')
const prompt = promptIndex === -1 ? '' : process.argv[promptIndex + 1] || ''
const userMessage = prompt.match(/User message:\n([\s\S]*?)(?:\n\nRespond as raw JSON|$)/)?.[1]?.trim() || ''

const response = process.env.FAKE_CLAUDE_RESPONSE || JSON.stringify({
  message: `claude handled: ${userMessage}`,
})

writeFileSync(1, `${response}\n`)
