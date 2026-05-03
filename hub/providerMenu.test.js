import assert from 'node:assert/strict'
import test from 'node:test'

import { DEFAULT_CHAT_PROVIDER, selectStartupChatProvider } from './providerMenu.js'

test('startup provider menu highlights codex by default', async () => {
  const writes = []

  const selectedProvider = await selectStartupChatProvider({
    input: { isTTY: false },
    output: {
      isTTY: false,
      write(chunk) {
        writes.push(String(chunk))
        return true
      },
    },
  })

  const renderedMenu = writes.join('')

  assert.equal(DEFAULT_CHAT_PROVIDER, 'codex')
  assert.equal(selectedProvider, 'codex')
  assert.match(renderedMenu, /^> codex$/m)
  assert.match(renderedMenu, /^  gpt$/m)
  assert.match(renderedMenu, /^  ollama$/m)
})
