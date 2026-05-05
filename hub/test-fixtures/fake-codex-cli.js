#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'node:fs'

if (process.argv.includes('--version')) {
  writeFileSync(1, 'codex test-cli 0.0.0\n')
  process.exit(0)
}

const prompt = readFileSync(0, 'utf8')
if (process.env.FAKE_CODEX_CAPTURE_PROMPT_PATH) {
  writeFileSync(process.env.FAKE_CODEX_CAPTURE_PROMPT_PATH, prompt)
}

const userMarker = 'User message:\n'
const responseMarker = '\n\nRespond as raw JSON'
const userStart = prompt.lastIndexOf(userMarker)
const userBlock = userStart === -1 ? '' : prompt.slice(userStart + userMarker.length)
const responseStart = userBlock.indexOf(responseMarker)
const userMessage = (responseStart === -1 ? userBlock : userBlock.slice(0, responseStart)).trim()

if (process.env.FAKE_CODEX_EXPECT_PROMPT_CONTAINS && !prompt.includes(process.env.FAKE_CODEX_EXPECT_PROMPT_CONTAINS)) {
  writeFileSync(2, 'Expected Codex prompt fragment was missing\n')
  process.exit(79)
}

if (process.env.FAKE_CODEX_REJECT_PROMPT_CONTAINS && prompt.includes(process.env.FAKE_CODEX_REJECT_PROMPT_CONTAINS)) {
  writeFileSync(2, 'Rejected Codex prompt fragment was present\n')
  process.exit(79)
}

if (process.env.FAKE_CODEX_EXPECT_PROMPT_SEQUENCE) {
  let fragments
  try {
    fragments = JSON.parse(process.env.FAKE_CODEX_EXPECT_PROMPT_SEQUENCE)
  } catch {
    writeFileSync(2, 'Expected Codex prompt sequence was not valid JSON\n')
    process.exit(80)
  }

  if (!Array.isArray(fragments) || fragments.some(fragment => typeof fragment !== 'string')) {
    writeFileSync(2, 'Expected Codex prompt sequence was not a string array\n')
    process.exit(80)
  }

  let cursor = 0
  for (const fragment of fragments) {
    const index = prompt.indexOf(fragment, cursor)
    if (index === -1) {
      writeFileSync(2, 'Expected Codex prompt sequence was missing or out of order\n')
      process.exit(79)
    }
    cursor = index + fragment.length
  }
}

if (process.env.FAKE_CODEX_RESPONSE) {
  writeFileSync(1, process.env.FAKE_CODEX_RESPONSE)
  process.exit(0)
}

writeFileSync(1, JSON.stringify({
  message: `codex handled: ${userMessage}`,
}))
