import readline from 'readline'

export const CHAT_PROVIDERS = Object.freeze(['codex', 'gpt', 'ollama'])
export const DEFAULT_CHAT_PROVIDER = 'codex'

function providerIndex(provider, providers = CHAT_PROVIDERS) {
  const index = providers.indexOf(provider)
  return index === -1 ? 0 : index
}

function renderProviderMenu(selectedIndex, providers = CHAT_PROVIDERS) {
  const lines = [
    'Select chat provider',
    'Use arrow keys to choose a provider, then press Enter.',
    '',
  ]

  providers.forEach((provider, index) => {
    const selected = index === selectedIndex
    lines.push(`${selected ? '>' : ' '} ${provider}`)
  })

  return lines
}

function renderMenu(output, renderedLineCount, selectedIndex, providers) {
  if (renderedLineCount > 0) {
    readline.moveCursor(output, 0, -renderedLineCount)
    readline.clearScreenDown(output)
  }

  const lines = renderProviderMenu(selectedIndex, providers)
  output.write(`${lines.join('\n')}\n`)
  return lines.length
}

export async function selectStartupChatProvider({
  input = process.stdin,
  output = process.stdout,
  providers = CHAT_PROVIDERS,
  defaultProvider = DEFAULT_CHAT_PROVIDER,
} = {}) {
  let selectedIndex = providerIndex(defaultProvider, providers)

  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function') {
    renderProviderMenu(selectedIndex, providers).forEach(line => output.write(`${line}\n`))
    output.write(`Non-interactive terminal detected; using ${providers[selectedIndex]}.\n`)
    return providers[selectedIndex]
  }

  readline.emitKeypressEvents(input)

  return new Promise((resolve, reject) => {
    const wasRaw = input.isRaw
    let renderedLineCount = 0

    const cleanup = () => {
      input.off('keypress', onKeypress)
      input.setRawMode(wasRaw)
      input.pause()
      output.write('\x1b[?25h')
    }

    const confirm = () => {
      cleanup()
      output.write(`Selected chat provider: ${providers[selectedIndex]}\n`)
      resolve(providers[selectedIndex])
    }

    const cancel = () => {
      cleanup()
      output.write('\nProvider selection cancelled.\n')
      const error = new Error('Provider selection cancelled')
      error.code = 'PROVIDER_SELECTION_CANCELLED'
      reject(error)
    }

    function onKeypress(str, key = {}) {
      if (key.ctrl && key.name === 'c') {
        cancel()
        return
      }

      if (key.name === 'return' || key.name === 'enter') {
        confirm()
        return
      }

      if (key.name === 'down' || key.name === 'right' || key.name === 'tab') {
        selectedIndex = (selectedIndex + 1) % providers.length
        renderedLineCount = renderMenu(output, renderedLineCount, selectedIndex, providers)
        return
      }

      if (key.name === 'up' || key.name === 'left') {
        selectedIndex = (selectedIndex - 1 + providers.length) % providers.length
        renderedLineCount = renderMenu(output, renderedLineCount, selectedIndex, providers)
        return
      }

      const numericChoice = Number.parseInt(str, 10)
      if (numericChoice >= 1 && numericChoice <= providers.length) {
        selectedIndex = numericChoice - 1
        renderedLineCount = renderMenu(output, renderedLineCount, selectedIndex, providers)
      }
    }

    output.write('\x1b[?25l')
    input.setRawMode(true)
    input.resume()
    input.on('keypress', onKeypress)
    renderedLineCount = renderMenu(output, renderedLineCount, selectedIndex, providers)
  })
}
