#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'

if (process.argv.includes('--version')) {
  writeFileSync(1, 'codex test-cli 0.0.0\n')
  process.exit(0)
}

const prompt = readFileSync(0, 'utf8')
const userMarker = 'User message:\n'
const responseMarker = '\n\nRespond as raw JSON'
const userStart = prompt.lastIndexOf(userMarker)
const userBlock = userStart === -1 ? '' : prompt.slice(userStart + userMarker.length)
const responseStart = userBlock.indexOf(responseMarker)
const userMessage = (responseStart === -1 ? userBlock : userBlock.slice(0, responseStart)).trim()

if (process.env.FAKE_CODEX_RESPONSE) {
  writeFileSync(1, process.env.FAKE_CODEX_RESPONSE)
  process.exit(0)
}

writeFileSync(1, JSON.stringify({
  message: `codex handled: ${userMessage}`,
}))
