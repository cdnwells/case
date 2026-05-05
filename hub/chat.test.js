import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

process.env.CODEX_PATH = new URL('./test-fixtures/fake-codex-cli.js', import.meta.url).pathname
process.env.CLAUDE_PATH = new URL('./test-fixtures/fake-claude-cli.js', import.meta.url).pathname

const {
  buildCodexPrompt,
  buildGptMessages,
  buildOllamaMessages,
  commandResults,
  config,
  CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES,
  fastify,
  formatSavedMemoryBlock,
  loadContextThenRunChatProvider,
  loadChatContext,
  logMemoryDependencyFailure,
  MemoryDependencyError,
  normalizeChatRequestBody,
  parseContextResponsePayload,
  validateLoadedChatContextForInjection,
} = await import('./hub.js')
const originalFetch = globalThis.fetch
const originalConfig = { ...config }
const failingCodexPath = new URL('./test-fixtures/failing-codex-cli.js', import.meta.url).pathname
const failingClaudePath = new URL('./test-fixtures/failing-claude-cli.js', import.meta.url).pathname
const repoRootUrl = new URL('../', import.meta.url)
const acceptedJpegFixtureDataBase64 = readFileSync(
  new URL('./test-fixtures/visible-object.jpg', import.meta.url),
).toString('base64')

test.before(async () => {
  await fastify.ready()
})

test.after(async () => {
  commandResults.clear()
  delete process.env.FAKE_CODEX_EXPECT_PROMPT_CONTAINS
  delete process.env.FAKE_CODEX_REJECT_PROMPT_CONTAINS
  delete process.env.FAKE_CODEX_EXPECT_PROMPT_SEQUENCE
  delete process.env.FAKE_CODEX_CAPTURE_PROMPT_PATH
  delete process.env.FAKE_CODEX_RESPONSE
  delete process.env.FAKE_CLAUDE_RESPONSE
  globalThis.fetch = originalFetch
  await fastify.close()
})

test.beforeEach(() => {
  commandResults.clear()
  Object.assign(config, originalConfig)
  config.contextWorkerUrl = 'http://context.test'
  delete process.env.FAKE_CODEX_EXPECT_PROMPT_CONTAINS
  delete process.env.FAKE_CODEX_REJECT_PROMPT_CONTAINS
  delete process.env.FAKE_CODEX_EXPECT_PROMPT_SEQUENCE
  delete process.env.FAKE_CODEX_CAPTURE_PROMPT_PATH
  delete process.env.FAKE_CODEX_RESPONSE
  delete process.env.FAKE_CLAUDE_RESPONSE
  globalThis.fetch = originalFetch
})

async function postChat(payload) {
  return fastify.inject({
    method: 'POST',
    url: '/chat',
    headers: { 'content-type': 'application/json' },
    payload,
  })
}

function contextResponse(context = '', memoryCount = null) {
  const resolvedMemoryCount = memoryCount ?? context
    .split(/\r?\n/)
    .filter(line => line.trim().startsWith('- '))
    .length

  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify({
      context,
      memory_count: resolvedMemoryCount,
    }),
  }
}

function contextPayloadResponse(payload) {
  return {
    ok: true,
    status: 200,
    text: async () => JSON.stringify(payload),
  }
}

function assertContextFetch(call) {
  const [url, options] = call
  assert.equal(url, 'http://context.test/context')
  assert.equal(options.method, 'GET')
  assert.equal(options.headers.accept, 'application/json')
}

function assertMemorySaveFetch(call, expectedMemories, source = 'codex') {
  const [url, options] = call
  assert.equal(url, 'http://context.test/context/memories')
  assert.equal(options.method, 'POST')
  assert.equal(options.headers.accept, 'application/json')
  assert.equal(options.headers['content-type'], 'application/json')
  assert.deepEqual(JSON.parse(options.body), {
    memories: expectedMemories,
    source,
  })
}

function assertNoMemoryPayload(body) {
  assert.equal(Object.hasOwn(body, 'memory'), false)
  assert.equal(Object.hasOwn(body, 'memories'), false)
  assert.equal(Object.hasOwn(body, 'rejectedMemorySummary'), false)
  assert.equal(Object.hasOwn(body.message, 'memory'), false)
  assert.equal(Object.hasOwn(body.message, 'memories'), false)
  assert.equal(Object.hasOwn(body.message.parsedContent, 'memory'), false)
  assert.equal(Object.hasOwn(body.message.parsedContent, 'memories'), false)
}

function assertImageAttachmentValidationResponse(response, expectedMessage, expectedField = null) {
  const body = response.json()

  assert.equal(response.statusCode, 400)
  assert.equal(body.error, 'Bad Request')
  assert.equal(body.code, 'CHAT_IMAGE_ATTACHMENT_VALIDATION_FAILED')
  assert.match(body.message, expectedMessage)
  assert.equal(body.validation.accepted, false)
  assert.equal(body.validation.error.code, 'CHAT_IMAGE_ATTACHMENT_VALIDATION_FAILED')
  assert.equal(body.validation.error.message, body.message)
  if (expectedField) {
    assert.equal(body.validation.error.field, expectedField)
  }
  assert.deepEqual(body.details, [body.validation.error])

  return body
}

function createAcceptedJpegAttachment(overrides = {}) {
  const dataBase64 = acceptedJpegFixtureDataBase64
  const imageBytes = Buffer.from(dataBase64, 'base64')

  return {
    type: 'image',
    mimeType: 'image/jpeg',
    contentType: 'image/jpeg',
    dataBase64,
    file: dataBase64,
    encoding: 'base64',
    imageSource: 'content://case-picker/photo.jpg',
    name: 'photo.jpg',
    sizeBytes: imageBytes.length,
    source: 'file-picker',
    ...overrides,
  }
}

function createAcceptedPngAttachment(overrides = {}) {
  const dataBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII='
  const imageBytes = Buffer.from(dataBase64, 'base64')

  return {
    type: 'image',
    mimeType: 'image/png',
    contentType: 'image/png',
    dataBase64,
    file: dataBase64,
    encoding: 'base64',
    imageSource: 'content://case-picker/chart.png',
    name: 'chart.png',
    sizeBytes: imageBytes.length,
    source: 'file-picker',
    ...overrides,
  }
}

const TEST_PNG_CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1)
  }

  return value >>> 0
})

function pngCrc32(buffer, startOffset, endOffset) {
  let crc = 0xffffffff

  for (let offset = startOffset; offset < endOffset; offset += 1) {
    crc = TEST_PNG_CRC_TABLE[(crc ^ buffer[offset]) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function corruptPngIdatWithFreshCrc(dataBase64) {
  const bytes = Buffer.from(dataBase64, 'base64')
  let offset = 8

  while (offset < bytes.length) {
    const chunkLength = bytes.readUInt32BE(offset)
    const chunkTypeOffset = offset + 4
    const chunkType = bytes.toString('ascii', chunkTypeOffset, chunkTypeOffset + 4)
    const chunkDataOffset = offset + 8
    const chunkDataEndOffset = chunkDataOffset + chunkLength
    const chunkEndOffset = chunkDataEndOffset + 4

    if (chunkType === 'IDAT' && chunkLength > 0) {
      const corrupted = Buffer.from(bytes)
      corrupted[chunkDataOffset] ^= 0xff
      corrupted.writeUInt32BE(
        pngCrc32(corrupted, chunkTypeOffset, chunkDataEndOffset),
        chunkDataEndOffset,
      )
      return corrupted
    }

    offset = chunkEndOffset
  }

  throw new Error('test PNG fixture does not contain an IDAT chunk')
}

function corruptJpegScanWithInvalidMarker(dataBase64) {
  const bytes = Buffer.from(dataBase64, 'base64')
  let offset = 2

  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) {
      throw new Error('test JPEG fixture has invalid marker alignment')
    }

    while (bytes[offset] === 0xff) {
      offset += 1
    }

    const marker = bytes[offset]
    offset += 1
    const segmentLength = bytes.readUInt16BE(offset)
    const segmentEndOffset = offset + segmentLength

    if (marker === 0xda) {
      if (segmentEndOffset + 2 >= bytes.length) {
        throw new Error('test JPEG fixture scan data is too short')
      }

      const corrupted = Buffer.from(bytes)
      corrupted[segmentEndOffset] = 0xff
      corrupted[segmentEndOffset + 1] = 0xc0
      return corrupted
    }

    offset = segmentEndOffset
  }

  throw new Error('test JPEG fixture does not contain a start-of-scan marker')
}

function mockContextFetch({ context = '', providerFetch, saveFetch } = {}) {
  const fetchCalls = []
  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    const [url, options] = args
    if (url === 'http://context.test/context') {
      return contextResponse(context)
    }

    if (url === 'http://context.test/context/memories') {
      if (saveFetch) {
        return saveFetch(...args)
      }

      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          saved: JSON.parse(options.body).memories.length,
          memories: [],
        }),
      }
    }

    if (providerFetch) {
      return providerFetch(...args)
    }

    throw new Error(`unexpected provider fetch: ${url}`)
  }
  return fetchCalls
}

function parsedChatContextFromMemories(memories = []) {
  const context = memories.length
    ? [
        'Known facts about the user:',
        ...memories.map(memory => `- ${memory}`),
      ].join('\n')
    : ''

  return parseContextResponsePayload({
    context,
    memory_count: memories.length,
  })
}

async function readRepoText(relativePath) {
  return (await readFile(new URL(relativePath, repoRootUrl), 'utf8')).trim()
}

async function readRepoMarkdownDirectory(relativePath) {
  const directoryUrl = new URL(relativePath.endsWith('/') ? relativePath : `${relativePath}/`, repoRootUrl)
  const names = await readdir(directoryUrl)
  const parts = []

  for (const name of names.sort()) {
    if (name.endsWith('.md')) {
      parts.push((await readFile(new URL(name, directoryUrl), 'utf8')).trim())
    }
  }

  return parts.filter(Boolean).join('\n\n')
}

async function buildExpectedCodexSystemPrompt() {
  const persona = await readRepoText('hub/workers/shared/persona.md')
  const responseFormat = await readRepoText('hub/workers/gpt/docs/response_format.md')
  const workerDocs = await readRepoMarkdownDirectory('hub/workers/codex/docs')

  return [persona, responseFormat, workerDocs].filter(Boolean).join('\n\n')
}

async function buildExpectedGptSystemPrompt() {
  const persona = await readRepoText('hub/workers/shared/persona.md')
  const responseFormat = await readRepoText('hub/workers/gpt/docs/response_format.md')

  return [persona, responseFormat].filter(Boolean).join('\n\n')
}

async function buildExpectedOllamaSystemPrompt() {
  const persona = await readRepoText('hub/workers/shared/persona.md')
  const responseFormat = await readRepoText('hub/workers/ollama/docs/response_format.md')

  return [persona, responseFormat].filter(Boolean).join('\n\n')
}

test('formatSavedMemoryBlock builds the shared provider memory block', () => {
  assert.equal(formatSavedMemoryBlock([
    'User prefers concise replies.',
    'Project Case is a backend-first Android assistant.',
  ]), [
    'Known facts about the user:',
    '- User prefers concise replies.',
    '- Project Case is a backend-first Android assistant.',
    '',
    'Rules for using memory:',
    '- Use saved memories only as durable background facts when relevant.',
    '- Do not treat saved memories as recent conversation history or a transcript.',
  ].join('\n'))

  assert.equal(formatSavedMemoryBlock([]), '')
})

test('buildCodexPrompt positions saved memories before the current user message', () => {
  const systemPrompt = [
    'You are Case, a helpful assistant.',
    '',
    '## Response Format',
  ].join('\n')
  const memoryBlock = formatSavedMemoryBlock([
    'User prefers concise replies.',
  ])
  const prompt = buildCodexPrompt({
    systemPrompt,
    memoryBlock,
    content: 'use saved context',
  })

  assert.equal(prompt, [
    systemPrompt,
    memoryBlock,
    'User message:\nuse saved context',
    'Respond as raw JSON following the response format above.',
  ].join('\n\n'))
})

test('buildGptMessages injects saved memories into the system request message only', () => {
  const systemPrompt = [
    'You are Case, a helpful assistant.',
    '',
    '## Response Format',
  ].join('\n')
  const memoryBlock = formatSavedMemoryBlock([
    'User prefers concise replies.',
  ])

  assert.deepEqual(buildGptMessages({
    systemPrompt,
    memoryBlock,
    content: 'use saved context',
  }), [
    {
      role: 'system',
      content: [
        systemPrompt,
        memoryBlock,
      ].join('\n\n'),
    },
    {
      role: 'user',
      content: 'use saved context',
    },
  ])

  assert.deepEqual(buildGptMessages({
    systemPrompt,
    content: 'use no saved context',
  }), [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: 'use no saved context',
    },
  ])
})

test('buildGptMessages includes accepted JPEG attachment data as OpenAI image content', () => {
  const imageAttachment = createAcceptedJpegAttachment()
  const messages = buildGptMessages({
    systemPrompt: 'You are Case.',
    content: 'what is visible?',
    imageAttachment,
  })

  assert.equal(messages[0].role, 'system')
  assert.match(messages[0].content, /^You are Case\./)
  assert.match(messages[0].content, /Ground the reply only in visible image content/)
  assert.match(messages[0].content, /cautious observational language/)
  assert.match(messages[0].content, /receipt-like or document-like PNG images/)
  assert.match(messages[0].content, /exact OCR is not required/)
  assert.match(messages[0].content, /visible yellowing leaves/)
  assert.match(messages[0].content, /from the photo/)
  assert.deepEqual(messages[1], {
    role: 'user',
    content: [
      {
        type: 'text',
        text: 'what is visible?',
      },
      {
        type: 'image_url',
        image_url: {
          url: `data:image/jpeg;base64,${imageAttachment.dataBase64}`,
        },
      },
    ],
  })
})

test('normalizeChatRequestBody preserves accepted JPEG MIME type, filename, and raw bytes', () => {
  const dataBase64 = acceptedJpegFixtureDataBase64
  const imageBytes = Buffer.from(dataBase64, 'base64')
  const requestBody = normalizeChatRequestBody({
    content: 'describe this image',
    conversationId: 'jpeg-ingress-preservation-test',
    attachments: [
      createAcceptedJpegAttachment({
        dataBase64,
        file: dataBase64,
        filename: 'desk-photo.jpg',
        name: 'desk-photo.jpg',
        sizeBytes: imageBytes.length,
      }),
    ],
  })

  assert.equal(requestBody.content, 'describe this image')
  assert.equal(requestBody.conversationId, 'jpeg-ingress-preservation-test')
  assert.equal(requestBody.attachments.length, 1)

  const [attachment] = requestBody.attachments
  assert.equal(attachment.mimeType, 'image/jpeg')
  assert.equal(attachment.contentType, 'image/jpeg')
  assert.equal(attachment.filename, 'desk-photo.jpg')
  assert.equal(attachment.name, 'desk-photo.jpg')
  assert.equal(attachment.dataBase64, dataBase64)
  assert.equal(attachment.file, dataBase64)
  assert.equal(attachment.sizeBytes, imageBytes.length)
  assert.equal(Buffer.isBuffer(attachment.bytes), true)
  assert.deepEqual(attachment.bytes, imageBytes)
})

test('normalizeChatRequestBody trims trailing phone JPEG data after the image end marker', () => {
  const jpegBytes = Buffer.from(acceptedJpegFixtureDataBase64, 'base64')
  const trailingBytes = Buffer.from('motion-photo-trailer-data')
  const phonePhotoBytes = Buffer.concat([jpegBytes, trailingBytes])
  const dataBase64 = phonePhotoBytes.toString('base64')
  const requestBody = normalizeChatRequestBody({
    content: 'describe this phone photo',
    conversationId: 'phone-jpeg-trailing-data-test',
    attachments: [
      createAcceptedJpegAttachment({
        dataBase64,
        file: dataBase64,
        filename: 'phone-photo.jpg',
        name: 'phone-photo.jpg',
        sizeBytes: phonePhotoBytes.length,
      }),
    ],
  })

  const [attachment] = requestBody.attachments
  assert.equal(attachment.mimeType, 'image/jpeg')
  assert.equal(attachment.filename, 'phone-photo.jpg')
  assert.equal(attachment.sizeBytes, jpegBytes.length)
  assert.equal(attachment.dataBase64, acceptedJpegFixtureDataBase64)
  assert.equal(attachment.file, acceptedJpegFixtureDataBase64)
  assert.deepEqual(attachment.bytes, jpegBytes)
})

test('normalizeChatRequestBody accepts PNG MIME metadata and preserves raw bytes', () => {
  const pngAttachment = createAcceptedPngAttachment()
  const imageBytes = Buffer.from(pngAttachment.dataBase64, 'base64')
  const requestBody = normalizeChatRequestBody({
    content: 'describe this png',
    conversationId: 'png-ingress-preservation-test',
    attachments: [
      createAcceptedPngAttachment({
        filename: 'chart.png',
        name: 'chart.png',
      }),
    ],
  })

  assert.equal(requestBody.content, 'describe this png')
  assert.equal(requestBody.conversationId, 'png-ingress-preservation-test')
  assert.equal(requestBody.attachments.length, 1)

  const [attachment] = requestBody.attachments
  assert.equal(attachment.mimeType, 'image/png')
  assert.equal(attachment.contentType, 'image/png')
  assert.equal(attachment.filename, 'chart.png')
  assert.equal(attachment.name, 'chart.png')
  assert.equal(attachment.dataBase64, pngAttachment.dataBase64)
  assert.equal(attachment.file, pngAttachment.file)
  assert.equal(attachment.sizeBytes, imageBytes.length)
  assert.equal(Buffer.isBuffer(attachment.bytes), true)
  assert.deepEqual(attachment.bytes, imageBytes)
})

test('normalizeChatRequestBody preserves complete PNG content through GPT message normalization', () => {
  const dataBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAACXBIWXMAAA7EAAAOxAGVKw4bAAAAOnRFWHREZXNjcmlwdGlvbgBDYXNlIFBORyBtZXRhZGF0YSBzaG91bGQgc3Vydml2ZSBub3JtYWxpemF0aW9uAfwRDgAAAAtJREFUeNpj/P8fAAMDAgDvoqdbAAAAAElFTkSuQmCC'
  const imageBytes = Buffer.from(dataBase64, 'base64')
  assert.equal(imageBytes.includes(Buffer.from('pHYs', 'ascii')), true)
  assert.equal(imageBytes.includes(Buffer.from('tEXt', 'ascii')), true)
  assert.equal(imageBytes.includes(Buffer.from('Case PNG metadata should survive normalization', 'ascii')), true)

  const requestBody = normalizeChatRequestBody({
    content: 'describe the annotated png',
    conversationId: 'png-complete-content-normalization-test',
    attachments: [
      createAcceptedPngAttachment({
        dataBase64,
        file: dataBase64,
        filename: 'annotated-chart.png',
        name: 'annotated-chart.png',
        imageSource: 'content://case-picker/annotated-chart.png',
        sizeBytes: imageBytes.length,
      }),
    ],
  })

  assert.equal(requestBody.content, 'describe the annotated png')
  assert.equal(requestBody.conversationId, 'png-complete-content-normalization-test')
  assert.equal(requestBody.attachments.length, 1)

  const [attachment] = requestBody.attachments
  assert.equal(attachment.mimeType, 'image/png')
  assert.equal(attachment.contentType, 'image/png')
  assert.equal(attachment.filename, 'annotated-chart.png')
  assert.equal(attachment.name, 'annotated-chart.png')
  assert.equal(attachment.imageSource, 'content://case-picker/annotated-chart.png')
  assert.equal(attachment.encoding, 'base64')
  assert.equal(attachment.source, 'file-picker')
  assert.equal(attachment.sizeBytes, imageBytes.length)
  assert.equal(attachment.dataBase64, dataBase64)
  assert.equal(attachment.file, dataBase64)
  assert.equal(Buffer.compare(attachment.bytes, imageBytes), 0)

  const messages = buildGptMessages({
    systemPrompt: 'You are Case.',
    content: requestBody.content,
    imageAttachment: attachment,
  })
  const imagePart = messages[1].content[1]
  assert.equal(imagePart.image_url.url, `data:image/png;base64,${dataBase64}`)

  const transportedBase64 = imagePart.image_url.url.split(',')[1]
  assert.equal(transportedBase64, dataBase64)
  assert.equal(Buffer.compare(Buffer.from(transportedBase64, 'base64'), imageBytes), 0)
})

test('loadContextThenRunChatProvider preserves normalized JPEG attachment through provider dispatch', async () => {
  const dataBase64 = acceptedJpegFixtureDataBase64
  const imageBytes = Buffer.from(dataBase64, 'base64')
  const chatContext = parsedChatContextFromMemories([
    'User prefers concise replies.',
  ])
  const requestBody = normalizeChatRequestBody({
    content: 'describe this image',
    conversationId: 'jpeg-service-layer-preservation-test',
    attachments: [
      createAcceptedJpegAttachment({
        dataBase64,
        file: dataBase64,
        filename: 'service-photo.jpg',
        name: 'service-photo.jpg',
        imageSource: 'content://case-picker/service-photo.jpg',
        sizeBytes: imageBytes.length,
      }),
    ],
  })
  const providerContent = JSON.stringify({ message: 'provider saw image' })
  let providerCalled = false

  const result = await loadContextThenRunChatProvider('gpt', requestBody, {
    logger: { info() {} },
    loadContext: async ({ conversationId }) => {
      assert.equal(conversationId, 'jpeg-service-layer-preservation-test')
      return chatContext
    },
    dispatchProvider: async (provider, dispatchedRequestBody, context) => {
      providerCalled = true
      assert.equal(provider, 'gpt')
      assert.equal(dispatchedRequestBody, requestBody)
      assert.equal(context, chatContext.memoryBlock)
      assert.equal(dispatchedRequestBody.attachments.length, 1)

      const [attachment] = dispatchedRequestBody.attachments
      assert.equal(attachment.mimeType, 'image/jpeg')
      assert.equal(attachment.contentType, 'image/jpeg')
      assert.equal(attachment.filename, 'service-photo.jpg')
      assert.equal(attachment.name, 'service-photo.jpg')
      assert.equal(attachment.imageSource, 'content://case-picker/service-photo.jpg')
      assert.equal(attachment.sizeBytes, imageBytes.length)
      assert.equal(attachment.dataBase64, dataBase64)
      assert.equal(attachment.file, dataBase64)
      assert.deepEqual(attachment.bytes, imageBytes)

      return providerContent
    },
  })

  assert.deepEqual(result, {
    chatContext,
    providerContent,
  })
  assert.equal(providerCalled, true)
})

test('loadContextThenRunChatProvider rejects image attachments for unsupported provider/model before context load and provider dispatch', async (t) => {
  const requestBody = normalizeChatRequestBody({
    content: 'describe this image',
    conversationId: 'unsupported-image-provider-preflight-service-test',
    attachments: [createAcceptedJpegAttachment()],
  })
  const cases = [
    {
      provider: 'codex',
      configure: () => {
        config.chatProvider = 'codex'
        config.codexModel = 'gpt-5.2'
      },
      expectedMessage: /Image understanding requires a multimodal provider\/model.*selected provider "codex".*does not support image input in Case v1/,
    },
    {
      provider: 'claude',
      configure: () => {
        config.chatProvider = 'claude'
      },
      expectedMessage: /Image understanding requires a multimodal provider\/model.*selected provider "claude".*does not support image input in Case v1/,
    },
    {
      provider: 'ollama',
      configure: () => {
        config.chatProvider = 'ollama'
        config.ollamaModel = 'llava:latest'
      },
      expectedMessage: /Image understanding requires a multimodal provider\/model.*selected provider "ollama".*does not support image input in Case v1/,
    },
    {
      provider: 'gpt',
      configure: () => {
        config.chatProvider = 'gpt'
        config.openaiModel = 'gpt-4'
      },
      expectedMessage: /Image understanding requires a multimodal provider\/model.*selected provider "gpt".*OPENAI_MODEL "gpt-4".*does not support image input in Case v1/,
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.provider, async () => {
      Object.assign(config, originalConfig)
      testCase.configure()
      let loadContextCalled = false
      let dispatchProviderCalled = false

      await assert.rejects(
        () => loadContextThenRunChatProvider(testCase.provider, requestBody, {
          loadContext: async () => {
            loadContextCalled = true
            throw new Error('context must not load for unsupported image providers')
          },
          dispatchProvider: async () => {
            dispatchProviderCalled = true
            throw new Error('provider must not dispatch for unsupported image providers')
          },
        }),
        err => {
          assert.match(err.message, testCase.expectedMessage)
          return true
        },
      )

      assert.equal(loadContextCalled, false)
      assert.equal(dispatchProviderCalled, false)
    })
  }
})

test('loadContextThenRunChatProvider rejects unsupported raw image attachments before context load and provider dispatch', async (t) => {
  config.chatProvider = 'gpt'
  config.openaiModel = 'gpt-4o'

  const cases = [
    {
      name: 'webp attachment',
      attachment: createAcceptedJpegAttachment({
        mimeType: 'image/webp',
        contentType: 'image/webp',
        filename: 'photo.webp',
        name: 'photo.webp',
      }),
      expectedMessage: /attachments\[0\]\.mimeType must be image\/jpeg or image\/png/,
    },
    {
      name: 'pdf attachment',
      attachment: createAcceptedJpegAttachment({
        mimeType: 'application/pdf',
        contentType: 'application/pdf',
        filename: 'report.pdf',
        name: 'report.pdf',
      }),
      expectedMessage: /PDF files are not supported for image understanding/,
    },
    {
      name: 'unreadable jpeg attachment',
      attachment: (() => {
        const unreadableJpegData = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64')
        return createAcceptedJpegAttachment({
          dataBase64: unreadableJpegData,
          file: unreadableJpegData,
          sizeBytes: 4,
        })
      })(),
      expectedMessage: /readable image\/jpeg image data/,
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      let loadContextCalled = false
      let dispatchProviderCalled = false

      await assert.rejects(
        () => loadContextThenRunChatProvider('gpt', {
          content: 'describe this unsupported image',
          conversationId: `unsupported-raw-image-${testCase.name}`,
          attachments: [testCase.attachment],
        }, {
          loadContext: async () => {
            loadContextCalled = true
            throw new Error('context must not load for rejected image attachments')
          },
          dispatchProvider: async () => {
            dispatchProviderCalled = true
            throw new Error('provider must not dispatch for rejected image attachments')
          },
        }),
        err => {
          assert.match(err.message, testCase.expectedMessage)
          return true
        },
      )

      assert.equal(loadContextCalled, false)
      assert.equal(dispatchProviderCalled, false)
    })
  }
})

test('loadContextThenRunChatProvider rejects invalid image payloads before invoking any AI provider', async (t) => {
  const corruptPngData = Buffer.from('not really a png').toString('base64')
  const providerCases = [
    {
      provider: 'codex',
      configure: () => {
        config.chatProvider = 'codex'
        config.codexModel = 'gpt-5.2'
      },
    },
    {
      provider: 'claude',
      configure: () => {
        config.chatProvider = 'claude'
      },
    },
    {
      provider: 'gpt',
      configure: () => {
        config.chatProvider = 'gpt'
        config.openaiModel = 'gpt-4o'
      },
    },
    {
      provider: 'ollama',
      configure: () => {
        config.chatProvider = 'ollama'
        config.ollamaModel = 'llava:latest'
      },
    },
  ]
  const invalidPayloadCases = [
    {
      name: 'unsupported webp mime type',
      attachment: createAcceptedJpegAttachment({
        mimeType: 'image/webp',
        contentType: 'image/webp',
        filename: 'photo.webp',
        name: 'photo.webp',
      }),
      expectedMessage: /attachments\[0\]\.mimeType must be image\/jpeg or image\/png/,
    },
    {
      name: 'invalid base64 data',
      attachment: createAcceptedJpegAttachment({
        dataBase64: '@@@',
        file: '@@@',
        sizeBytes: 3,
      }),
      expectedMessage: /valid non-empty base64 image data/,
    },
    {
      name: 'corrupt png bytes',
      attachment: createAcceptedPngAttachment({
        dataBase64: corruptPngData,
        file: corruptPngData,
        sizeBytes: Buffer.byteLength('not really a png'),
      }),
      expectedMessage: /readable image\/png image data/,
    },
  ]

  for (const providerCase of providerCases) {
    await t.test(providerCase.provider, async (providerTest) => {
      for (const payloadCase of invalidPayloadCases) {
        await providerTest.test(payloadCase.name, async () => {
          Object.assign(config, originalConfig)
          providerCase.configure()
          let loadContextCalls = 0
          let providerDispatchCalls = 0

          await assert.rejects(
            () => loadContextThenRunChatProvider(
              providerCase.provider,
              {
                content: 'describe this invalid image',
                conversationId: `invalid-image-no-provider-${providerCase.provider}-${payloadCase.name}`,
                attachments: [payloadCase.attachment],
              },
              {
                loadContext: async () => {
                  loadContextCalls += 1
                  return parsedChatContextFromMemories([])
                },
                dispatchProvider: async () => {
                  providerDispatchCalls += 1
                  return '{"message":"provider dispatch must not run"}'
                },
              },
            ),
            err => {
              assert.match(err.message, payloadCase.expectedMessage)
              return true
            },
          )

          assert.equal(loadContextCalls, 0)
          assert.equal(providerDispatchCalls, 0)
          assert.equal(commandResults.size, 0)
        })
      }
    })
  }
})

test('buildOllamaMessages injects saved memories into the system request message only', () => {
  const systemPrompt = [
    'You are Case, a helpful assistant.',
    '',
    '## Response Format',
  ].join('\n')
  const memoryBlock = formatSavedMemoryBlock([
    'User prefers concise replies.',
  ])

  assert.deepEqual(buildOllamaMessages({
    systemPrompt,
    memoryBlock,
    content: 'use saved context',
  }), [
    {
      role: 'system',
      content: [
        systemPrompt,
        memoryBlock,
      ].join('\n\n'),
    },
    {
      role: 'user',
      content: 'use saved context',
    },
  ])

  assert.deepEqual(buildOllamaMessages({
    systemPrompt,
    content: 'use no saved context',
  }), [
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: 'use no saved context',
    },
  ])
})

test('provider prompt builders inject equivalent curated saved memory payloads', () => {
  const systemPrompt = [
    'You are Case, a helpful assistant.',
    '',
    '## Response Format',
  ].join('\n')
  const content = 'use saved context without treating it as chat history'
  const memoryBlock = formatSavedMemoryBlock([
    'User prefers concise replies.',
    'Project Case is a backend-first Android assistant.',
  ])

  const codexPrompt = buildCodexPrompt({
    systemPrompt,
    memoryBlock,
    content,
  })
  const gptMessages = buildGptMessages({
    systemPrompt,
    memoryBlock,
    content,
  })
  const ollamaMessages = buildOllamaMessages({
    systemPrompt,
    memoryBlock,
    content,
  })

  const providerMemoryPayloads = {
    codex: codexPrompt
      .slice(systemPrompt.length + 2)
      .split('\n\nUser message:\n')[0],
    gpt: gptMessages[0].content.slice(systemPrompt.length + 2),
    ollama: ollamaMessages[0].content.slice(systemPrompt.length + 2),
  }

  assert.deepEqual(providerMemoryPayloads, {
    codex: memoryBlock,
    gpt: memoryBlock,
    ollama: memoryBlock,
  })
  assert.equal(Object.values(providerMemoryPayloads).every(payload => !payload.includes(content)), true)
})

test('POST /chat does not call context worker when request validation fails', async () => {
  const fetchCalls = []
  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    throw new Error('context must not load for invalid chat bodies')
  }

  try {
    const response = await postChat({
      content: '',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 400)
    assert.equal(fetchCalls.length, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat rejects malformed image attachments before context or provider calls', async () => {
  const fetchCalls = []
  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    throw new Error('provider stack must not run for invalid image attachments')
  }

  try {
    const badImageData = Buffer.from('not an image').toString('base64')
    const response = await postChat({
      content: 'describe this',
      conversationId: 'invalid-image-payload-test',
      attachments: [
        createAcceptedJpegAttachment({
          dataBase64: badImageData,
          file: badImageData,
          sizeBytes: Buffer.byteLength('not an image'),
        }),
      ],
    })

    assert.equal(response.statusCode, 400)
    assert.match(response.json().message, /readable image\/jpeg image data/)
    assert.equal(fetchCalls.length, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat returns structured validation error for rejected image payloads', async () => {
  const fetchCalls = []
  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    throw new Error('context/provider stack must not run for rejected image payloads')
  }

  try {
    const response = await postChat({
      content: 'describe this unsupported image',
      conversationId: 'structured-image-validation-error-test',
      attachments: [
        createAcceptedJpegAttachment({
          mimeType: 'image/webp',
          contentType: 'image/webp',
          filename: 'photo.webp',
          name: 'photo.webp',
        }),
      ],
    })

    const body = response.json()

    assert.equal(response.statusCode, 400)
    assert.equal(body.error, 'Bad Request')
    assert.equal(body.code, 'CHAT_IMAGE_ATTACHMENT_VALIDATION_FAILED')
    assert.match(body.message, /attachments\[0\]\.mimeType must be image\/jpeg or image\/png/)
    assert.deepEqual(body.validation, {
      accepted: false,
      error: {
        code: 'CHAT_IMAGE_ATTACHMENT_VALIDATION_FAILED',
        field: 'attachments[0].mimeType',
        message: body.message,
      },
    })
    assert.deepEqual(body.details, [body.validation.error])
    assert.equal(fetchCalls.length, 0)
    assert.equal(commandResults.size, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat rejects malformed image attachment record shapes before context or provider calls', async (t) => {
  const cases = [
    {
      name: 'attachments is not an array',
      payload: {
        content: 'describe this',
        conversationId: 'invalid-attachments-container-test',
        attachments: { type: 'image' },
      },
      expectedMessage: /attachments must be an array/,
    },
    {
      name: 'attachments is empty',
      payload: {
        content: 'describe this',
        conversationId: 'empty-attachments-test',
        attachments: [],
      },
      expectedMessage: /exactly one image attachment/,
    },
    {
      name: 'attachment is not an object',
      attachment: null,
      expectedMessage: /attachments\[0\] must be an object/,
    },
    {
      name: 'unsupported attachment field',
      attachment: createAcceptedJpegAttachment({
        uri: 'content://case-picker/photo.jpg',
      }),
      expectedMessage: /attachments\[0\]\.uri is not supported/,
    },
    {
      name: 'missing contentType',
      attachment: (() => {
        const attachment = createAcceptedJpegAttachment()
        delete attachment.contentType
        return attachment
      })(),
      expectedMessage: /attachments\[0\]\.contentType is required/,
    },
    {
      name: 'missing file alias',
      attachment: (() => {
        const attachment = createAcceptedJpegAttachment()
        delete attachment.file
        return attachment
      })(),
      expectedMessage: /attachments\[0\]\.file is required/,
    },
    {
      name: 'mismatched file alias',
      attachment: createAcceptedJpegAttachment({
        file: createAcceptedPngAttachment().dataBase64,
      }),
      expectedMessage: /attachments\[0\]\.dataBase64 and attachments\[0\]\.file must match/,
    },
    {
      name: 'missing name',
      attachment: (() => {
        const attachment = createAcceptedJpegAttachment()
        delete attachment.name
        return attachment
      })(),
      expectedMessage: /attachments\[0\]\.name is required/,
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const fetchCalls = []
      globalThis.fetch = async (...args) => {
        fetchCalls.push(args)
        throw new Error(`context/provider stack must not run for ${testCase.name}`)
      }

      try {
        const response = await postChat(testCase.payload ?? {
          content: 'describe this malformed attachment',
          conversationId: `malformed-image-record-${testCase.name}`,
          attachments: [testCase.attachment],
        })

        assert.equal(response.statusCode, 400)
        assert.match(response.json().message, testCase.expectedMessage)
        assert.equal(fetchCalls.length, 0)
        assert.equal(commandResults.size, 0)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  }
})

test('POST /chat rejects missing, unsupported, and unreadable image data before context or provider calls', async (t) => {
  const cases = [
    {
      name: 'missing image data',
      attachment: (() => {
        const attachment = createAcceptedJpegAttachment()
        delete attachment.dataBase64
        delete attachment.file
        return attachment
      })(),
      expectedMessage: /dataBase64.*file is required/,
    },
    {
      name: 'unsupported image MIME type',
      attachment: createAcceptedJpegAttachment({
        mimeType: 'image/webp',
        contentType: 'image/webp',
        name: 'photo.webp',
      }),
      expectedMessage: /mimeType must be image\/jpeg or image\/png/,
    },
    {
      name: 'unreadable jpeg bytes with jpeg signature',
      attachment: (() => {
        const unreadableJpegData = Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString('base64')
        return createAcceptedJpegAttachment({
          dataBase64: unreadableJpegData,
          file: unreadableJpegData,
          sizeBytes: 4,
        })
      })(),
      expectedMessage: /readable image\/jpeg image data/,
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const fetchCalls = []
      globalThis.fetch = async (...args) => {
        fetchCalls.push(args)
        throw new Error(`context/provider stack must not run for ${testCase.name}`)
      }

      try {
        const response = await postChat({
          content: 'describe this',
          conversationId: `image-validation-${testCase.name}`,
          attachments: [testCase.attachment],
        })

        assert.equal(response.statusCode, 400)
        assert.match(response.json().message, testCase.expectedMessage)
        assert.equal(fetchCalls.length, 0)
        assert.equal(commandResults.size, 0)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  }
})

test('POST /chat returns HTTP 502 when context load fails before provider execution', async () => {
  const fetchCalls = []
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'

  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    return {
      ok: false,
      status: 503,
      text: async () => 'context unavailable',
    }
  }

  try {
    const response = await postChat({
      content: 'hello',
      conversationId: 'test',
    })
    const expectedBody = {
      error: 'Memory Error',
      message: 'Memory context load failed: context worker returned HTTP 503',
      provider: 'gpt',
    }

    assert.equal(response.statusCode, 502)
    assert.equal(response.body, JSON.stringify(expectedBody))
    assert.deepEqual(response.json(), expectedBody)
    assert.equal(fetchCalls.length, 1)
    assertContextFetch(fetchCalls[0])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat fails the request on context worker memory load dependency errors', async (t) => {
  const cases = [
    {
      name: 'context worker request rejects',
      contextWorkerUrl: 'http://context.test',
      fetchContext: async () => {
        throw new Error('connect ECONNREFUSED context.test:80')
      },
      expectedMessage: 'Memory context load failed: connect ECONNREFUSED context.test:80',
      expectedContextFetches: 1,
    },
    {
      name: 'context worker returns invalid JSON',
      contextWorkerUrl: 'http://context.test',
      fetchContext: async () => ({
        ok: true,
        status: 200,
        text: async () => '{not-json',
      }),
      expectedMessage: 'Memory context load failed: context worker returned invalid JSON',
      expectedContextFetches: 1,
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      Object.assign(config, originalConfig)
      config.contextWorkerUrl = testCase.contextWorkerUrl
      config.chatProvider = 'gpt'
      config.openaiApiKey = 'test-openai-key'
      config.openaiBaseUrl = 'http://openai.test/v1'
      config.openaiModel = 'gpt-test-model'

      const fetchCalls = []
      const providerFetchCalls = []
      globalThis.fetch = async (...args) => {
        fetchCalls.push(args)
        const [url] = args
        if (url === 'http://context.test/context') {
          return testCase.fetchContext()
        }

        providerFetchCalls.push(args)
        throw new Error(`provider must not be called after memory load dependency failure: ${url}`)
      }

      try {
        const response = await postChat({
          content: 'hello',
          conversationId: `memory-load-dependency-${testCase.name}`,
        })
        const expectedBody = {
          error: 'Memory Error',
          message: testCase.expectedMessage,
          provider: 'gpt',
        }

        assert.equal(response.statusCode, 502)
        assert.equal(response.body, JSON.stringify(expectedBody))
        assert.deepEqual(response.json(), expectedBody)
        assert.equal(fetchCalls.length, testCase.expectedContextFetches)
        if (testCase.expectedContextFetches) {
          assertContextFetch(fetchCalls[0])
        }
        assert.deepEqual(providerFetchCalls, [])
        assert.equal(commandResults.size, 0)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  }
})

test('POST /chat skips Codex, GPT, and Ollama provider calls when memory load fails', async (t) => {
  const cases = [
    {
      provider: 'codex',
      configure: () => {
        config.chatProvider = 'codex'
        config.codexPath = failingCodexPath
      },
    },
    {
      provider: 'gpt',
      configure: () => {
        config.chatProvider = 'gpt'
        config.openaiApiKey = 'test-openai-key'
        config.openaiBaseUrl = 'http://openai.test/v1'
        config.openaiModel = 'gpt-test-model'
      },
    },
    {
      provider: 'ollama',
      configure: () => {
        config.chatProvider = 'ollama'
        config.ollamaBaseUrl = 'http://ollama.test'
        config.ollamaModel = 'ollama-test-model'
      },
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.provider, async () => {
      commandResults.clear()
      Object.assign(config, originalConfig)
      config.contextWorkerUrl = 'http://context.test'
      testCase.configure()

      const fetchCalls = []
      const providerFetchCalls = []
      globalThis.fetch = async (...args) => {
        fetchCalls.push(args)
        const [url] = args
        if (url === 'http://context.test/context') {
          return {
            ok: false,
            status: 503,
            text: async () => 'context unavailable',
          }
        }

        providerFetchCalls.push(args)
        throw new Error(`${testCase.provider} provider must not be called after memory load failure: ${url}`)
      }

      try {
        const response = await postChat({
          content: 'hello',
          conversationId: `${testCase.provider}-memory-load-failure-test`,
        })

        assert.equal(response.statusCode, 502)
        assert.deepEqual(response.json(), {
          error: 'Memory Error',
          message: 'Memory context load failed: context worker returned HTTP 503',
          provider: testCase.provider,
        })
        assert.equal(fetchCalls.length, 1)
        assertContextFetch(fetchCalls[0])
        assert.deepEqual(providerFetchCalls, [])
        assert.equal(commandResults.size, 0)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  }
})

test('memory load failures log context worker URL, conversation, provider, and failure stage', () => {
  const logs = []
  const err = new MemoryDependencyError(
    'Memory context load failed: context worker returned HTTP 503',
    { provider: 'gpt', stage: 'load' },
  )

  logMemoryDependencyFailure({
    error(fields, message) {
      logs.push({ fields, message })
    },
  }, err, {
    provider: 'codex',
    conversationId: 'memory-load-log-test',
  })

  assert.deepEqual(logs, [{
    message: 'Memory dependency failed',
    fields: {
      contextWorkerUrl: 'http://context.test',
      provider: 'gpt',
      conversationId: 'memory-load-log-test',
      failureStage: 'load',
      error: 'Memory context load failed: context worker returned HTTP 503',
    },
  }])
})

test('loadChatContext reports context worker loading failures as typed memory dependency errors', async (t) => {
  const cases = [
    {
      name: 'fetch unavailable',
      contextWorkerUrl: 'http://context.test',
      fetchImpl: undefined,
      expectedMessage: 'Memory context load failed: fetch is not available',
      expectedContextFetches: 0,
    },
    {
      name: 'request rejects',
      contextWorkerUrl: 'http://context.test',
      fetchImpl: async () => {
        throw new Error('socket closed')
      },
      expectedMessage: 'Memory context load failed: socket closed',
      expectedContextFetches: 1,
    },
    {
      name: 'HTTP failure',
      contextWorkerUrl: 'http://context.test',
      fetchImpl: async () => ({
        ok: false,
        status: 503,
        text: async () => 'context unavailable',
      }),
      expectedMessage: 'Memory context load failed: context worker returned HTTP 503',
      expectedContextFetches: 1,
    },
    {
      name: 'invalid JSON',
      contextWorkerUrl: 'http://context.test',
      fetchImpl: async () => ({
        ok: true,
        status: 200,
        text: async () => '{not-json',
      }),
      expectedMessage: 'Memory context load failed: context worker returned invalid JSON',
      expectedContextFetches: 1,
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      Object.assign(config, originalConfig)
      config.contextWorkerUrl = testCase.contextWorkerUrl

      const fetchCalls = []
      if (testCase.fetchImpl) {
        globalThis.fetch = async (...args) => {
          fetchCalls.push(args)
          return testCase.fetchImpl(...args)
        }
      } else {
        globalThis.fetch = undefined
      }

      const logger = {
        info() {
          throw new Error('memory load failures must not emit successful load logs')
        },
      }

      try {
        await assert.rejects(
          () => loadChatContext({
            conversationId: `load-context-${testCase.name}`,
            logger,
          }),
          err => {
            assert.ok(err instanceof MemoryDependencyError)
            assert.equal(err.message, testCase.expectedMessage)
            assert.equal(err.stage, 'load')
            assert.equal(err.provider, undefined)
            return true
          },
        )

        assert.equal(fetchCalls.length, testCase.expectedContextFetches)
        if (testCase.expectedContextFetches) {
          assertContextFetch(fetchCalls[0])
        }
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  }
})

test('loadChatContext extracts saved memories into the internal chat context', async () => {
  const fetchCalls = []
  const context = [
    'Known facts about the user:',
    '- User prefers concise replies.',
    '- Project Case is a backend-first Android assistant.',
  ].join('\n')

  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    return contextResponse(context, 2)
  }

  try {
    const chatContext = await loadChatContext({
      conversationId: 'memory-parse-test',
      logger: { info() {} },
    })

    assert.equal(chatContext.context, context)
    assert.equal(chatContext.memoryCount, 2)
    assert.deepEqual(chatContext.savedMemories, [
      'User prefers concise replies.',
      'Project Case is a backend-first Android assistant.',
    ])
    assert.equal(chatContext.memoryBlock, [
      'Known facts about the user:',
      '- User prefers concise replies.',
      '- Project Case is a backend-first Android assistant.',
      '',
      'Rules for using memory:',
      '- Use saved memories only as durable background facts when relevant.',
      '- Do not treat saved memories as recent conversation history or a transcript.',
    ].join('\n'))
    assert.equal(fetchCalls.length, 1)
    assertContextFetch(fetchCalls[0])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('parseContextResponsePayload rejects malformed saved-memory payloads', () => {
  assert.throws(
    () => parseContextResponsePayload({
      context: 'Conversation history:\n- This must not be accepted as saved memory.',
      memory_count: 1,
    }),
    /invalid context data/,
  )

  assert.throws(
    () => parseContextResponsePayload({
      context: 'Known facts about the user:\n- User prefers concise replies.',
      memory_count: 2,
    }),
    /invalid context data/,
  )
})

test('parseContextResponsePayload validates loaded context fields before provider formatting', () => {
  assert.throws(
    () => parseContextResponsePayload({}),
    /invalid context data/,
  )

  assert.throws(
    () => parseContextResponsePayload({
      context: '',
      memory_count: 0,
      memories: [],
    }),
    /invalid context data/,
  )

  assert.throws(
    () => parseContextResponsePayload({
      context: [
        'Known facts about the user:',
        '- User prefers concise replies.',
        'source: context-worker',
      ].join('\n'),
      memory_count: 1,
    }),
    /invalid context data/,
  )

  assert.throws(
    () => parseContextResponsePayload({
      context: [
        'Known facts about the user:',
        `- ${'x'.repeat(301)}`,
      ].join('\n'),
      memory_count: 1,
    }),
    /invalid context data/,
  )
})

test('validateLoadedChatContextForInjection rejects loaded context that no longer matches the curated memory block', () => {
  const chatContext = parsedChatContextFromMemories([
    'User prefers concise replies.',
  ])

  assert.equal(validateLoadedChatContextForInjection(chatContext), chatContext.memoryBlock)

  assert.throws(
    () => validateLoadedChatContextForInjection({
      ...chatContext,
      memoryBlock: chatContext.context,
    }),
    err => {
      assert.ok(err instanceof MemoryDependencyError)
      assert.equal(err.message, 'Memory context injection failed: context worker returned invalid context data')
      assert.equal(err.stage, 'inject')
      return true
    },
  )
})

test('POST /chat returns HTTP 502 when context payload parsing fails before provider execution', async () => {
  const fetchCalls = []
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'

  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    const [url] = args
    if (url === 'http://context.test/context') {
      return contextResponse('Conversation history:\n- This must not reach the provider.', 1)
    }

    throw new Error(`provider must not be called after invalid context data: ${url}`)
  }

  try {
    const response = await postChat({
      content: 'hello',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 502)
    assert.deepEqual(response.json(), {
      error: 'Memory Error',
      message: 'Memory context load failed: context worker returned invalid context data',
      provider: 'gpt',
    })
    assert.equal(fetchCalls.length, 1)
    assertContextFetch(fetchCalls[0])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat returns exact HTTP 502 body for invalid context data', async () => {
  const fetchCalls = []
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'

  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    const [url] = args
    if (url === 'http://context.test/context') {
      return contextResponse('Known facts about the user:\n- User prefers concise replies.', 2)
    }

    throw new Error(`provider must not be called after invalid context data: ${url}`)
  }

  try {
    const response = await postChat({
      content: 'hello',
      conversationId: 'invalid-context-data-body-test',
    })

    assert.equal(response.statusCode, 502)
    assert.equal(response.body, JSON.stringify({
      error: 'Memory Error',
      message: 'Memory context load failed: context worker returned invalid context data',
      provider: 'gpt',
    }))
    assert.equal(fetchCalls.length, 1)
    assertContextFetch(fetchCalls[0])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat rejects malformed context worker data without provider memory injection', async (t) => {
  const badMemory = 'BAD_MEMORY_SHOULD_NOT_REACH_PROVIDER'
  const cases = [
    {
      name: 'top-level array payload',
      payload: [
        {
          context: `Known facts about the user:\n- ${badMemory}`,
          memory_count: 1,
        },
      ],
    },
    {
      name: 'context is not a string',
      payload: {
        context: ['Known facts about the user:', `- ${badMemory}`],
        memory_count: 1,
      },
    },
    {
      name: 'memory_count is not an integer',
      payload: {
        context: `Known facts about the user:\n- ${badMemory}`,
        memory_count: 1.5,
      },
    },
    {
      name: 'unsupported memories field',
      payload: {
        context: '',
        memory_count: 0,
        memories: [badMemory],
      },
    },
    {
      name: 'wrong context header',
      payload: {
        context: `Conversation transcript:\n- ${badMemory}`,
        memory_count: 1,
      },
    },
    {
      name: 'malformed memory line',
      payload: {
        context: [
          'Known facts about the user:',
          badMemory,
        ].join('\n'),
        memory_count: 1,
      },
    },
    {
      name: 'blank memory entry',
      payload: {
        context: [
          'Known facts about the user:',
          '-   ',
        ].join('\n'),
        memory_count: 1,
      },
    },
    {
      name: 'oversized memory entry',
      payload: {
        context: [
          'Known facts about the user:',
          `- ${badMemory} ${'x'.repeat(301)}`,
        ].join('\n'),
        memory_count: 1,
      },
    },
    {
      name: 'memory count mismatch',
      payload: {
        context: `Known facts about the user:\n- ${badMemory}`,
        memory_count: 2,
      },
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      Object.assign(config, originalConfig)
      config.contextWorkerUrl = 'http://context.test'
      config.chatProvider = 'gpt'
      config.openaiApiKey = 'test-openai-key'
      config.openaiBaseUrl = 'http://openai.test/v1'
      config.openaiModel = 'gpt-test-model'

      const fetchCalls = []
      const providerFetchCalls = []
      globalThis.fetch = async (...args) => {
        fetchCalls.push(args)
        const [url] = args

        if (url === 'http://context.test/context') {
          return contextPayloadResponse(testCase.payload)
        }

        providerFetchCalls.push(args)
        throw new Error(`provider must not receive malformed memory context: ${url}`)
      }

      try {
        const response = await postChat({
          content: 'hello',
          conversationId: `malformed-context-${testCase.name}`,
        })

        assert.equal(response.statusCode, 502)
        assert.deepEqual(response.json(), {
          error: 'Memory Error',
          message: 'Memory context load failed: context worker returned invalid context data',
          provider: 'gpt',
        })
        assert.equal(fetchCalls.length, 1)
        assertContextFetch(fetchCalls[0])
        assert.deepEqual(providerFetchCalls, [])
        assert.equal(commandResults.size, 0)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  }
})

test('POST /chat provider dispatch waits until context load succeeds', async () => {
  let resolveContext
  let notifyContextStarted
  const contextStarted = new Promise(resolve => {
    notifyContextStarted = resolve
  })
  const contextResult = new Promise(resolve => {
    resolveContext = resolve
  })
  const chatContext = parsedChatContextFromMemories([
    'User prefers concise replies.',
  ])
  const providerContent = JSON.stringify({ message: 'provider ran after context' })
  let providerCalled = false

  const dispatchResult = loadContextThenRunChatProvider('gpt', {
    content: 'hello',
    conversationId: 'ordering-test',
  }, {
    logger: { info() {} },
    loadContext: async ({ conversationId }) => {
      assert.equal(conversationId, 'ordering-test')
      notifyContextStarted()
      return contextResult
    },
    dispatchProvider: async (provider, requestBody, context) => {
      providerCalled = true
      assert.equal(provider, 'gpt')
      assert.equal(requestBody.content, 'hello')
      assert.equal(context, chatContext.memoryBlock)
      return providerContent
    },
  })

  await contextStarted
  await Promise.resolve()

  assert.equal(providerCalled, false)

  resolveContext(chatContext)

  assert.deepEqual(await dispatchResult, {
    chatContext,
    providerContent,
  })
  assert.equal(providerCalled, true)
})

test('loadContextThenRunChatProvider injects validated loaded memory context for memory providers', async (t) => {
  const chatContext = parsedChatContextFromMemories([
    'User prefers concise replies.',
    'Project Case is a backend-first Android assistant.',
  ])

  for (const provider of ['codex', 'gpt', 'ollama']) {
    await t.test(provider, async () => {
      const providerContent = JSON.stringify({ message: `${provider} handled memory context` })
      let providerCalled = false

      const result = await loadContextThenRunChatProvider(provider, {
        content: 'use saved memory',
        conversationId: `${provider}-valid-loaded-memory-test`,
      }, {
        logger: { info() {} },
        loadContext: async ({ conversationId }) => {
          assert.equal(conversationId, `${provider}-valid-loaded-memory-test`)
          return chatContext
        },
        dispatchProvider: async (actualProvider, requestBody, context) => {
          providerCalled = true
          assert.equal(actualProvider, provider)
          assert.equal(requestBody.content, 'use saved memory')
          assert.equal(requestBody.conversationId, `${provider}-valid-loaded-memory-test`)
          assert.equal(context, chatContext.memoryBlock)
          assert.equal(context.includes('Rules for using memory:'), true)
          return providerContent
        },
      })

      assert.deepEqual(result, {
        chatContext,
        providerContent,
      })
      assert.equal(providerCalled, true)
    })
  }
})

test('parseContextResponsePayload reports malformed loaded memory data as typed load memory errors', (t) => {
  const cases = [
    {
      name: 'missing context',
      payload: {
        memory_count: 0,
      },
    },
    {
      name: 'unsupported field',
      payload: {
        context: '',
        memory_count: 0,
        memories: [],
      },
    },
    {
      name: 'wrong header',
      payload: {
        context: 'Conversation history:\n- This must not be accepted as saved memory.',
        memory_count: 1,
      },
    },
    {
      name: 'malformed memory line',
      payload: {
        context: [
          'Known facts about the user:',
          'User prefers concise replies.',
        ].join('\n'),
        memory_count: 1,
      },
    },
    {
      name: 'memory count mismatch',
      payload: {
        context: 'Known facts about the user:\n- User prefers concise replies.',
        memory_count: 2,
      },
    },
    {
      name: 'oversized memory',
      payload: {
        context: [
          'Known facts about the user:',
          `- ${'x'.repeat(301)}`,
        ].join('\n'),
        memory_count: 1,
      },
    },
  ]

  for (const { name, payload } of cases) {
    t.test(name, () => {
      assert.throws(
        () => parseContextResponsePayload(payload),
        err => {
          assert.ok(err instanceof MemoryDependencyError)
          assert.equal(err.message, 'Memory context load failed: context worker returned invalid context data')
          assert.equal(err.stage, 'load')
          assert.equal(err.provider, undefined)
          return true
        },
      )
    })
  }
})

test('loadContextThenRunChatProvider validates loaded context before provider dispatch for memory providers', async (t) => {
  for (const provider of ['codex', 'gpt', 'ollama']) {
    await t.test(provider, async () => {
      const validChatContext = parsedChatContextFromMemories([
        'User prefers concise replies.',
      ])
      const invalidChatContext = {
        ...validChatContext,
        memoryBlock: validChatContext.context,
      }
      let providerCalled = false

      await assert.rejects(
        () => loadContextThenRunChatProvider(provider, {
          content: 'hello',
          conversationId: `${provider}-invalid-injection-test`,
        }, {
          logger: { info() {} },
          loadContext: async () => invalidChatContext,
          dispatchProvider: async () => {
            providerCalled = true
            return ''
          },
        }),
        err => {
          assert.ok(err instanceof MemoryDependencyError)
          assert.equal(err.message, 'Memory context injection failed: context worker returned invalid context data')
          assert.equal(err.provider, provider)
          assert.equal(err.stage, 'inject')
          return true
        },
      )

      assert.equal(providerCalled, false)
    })
  }
})

test('loadContextThenRunChatProvider reports all loaded-context validation failures as typed injection memory errors', async (t) => {
  const validChatContext = parsedChatContextFromMemories([
    'User prefers concise replies.',
  ])
  const cases = [
    {
      name: 'malformed context lines',
      chatContext: {
        ...validChatContext,
        context: [
          'Known facts about the user:',
          '- User prefers concise replies.',
          'source: context-worker',
        ].join('\n'),
      },
    },
    {
      name: 'invalid saved memory item',
      chatContext: {
        ...validChatContext,
        savedMemories: [123],
      },
    },
    {
      name: 'oversized saved memory item',
      chatContext: {
        ...validChatContext,
        savedMemories: ['x'.repeat(301)],
      },
    },
  ]

  for (const { name, chatContext } of cases) {
    await t.test(name, async () => {
      let providerCalled = false

      await assert.rejects(
        () => loadContextThenRunChatProvider('gpt', {
          content: 'hello',
          conversationId: `loaded-validation-${name}`,
        }, {
          logger: { info() {} },
          loadContext: async () => chatContext,
          dispatchProvider: async () => {
            providerCalled = true
            return ''
          },
        }),
        err => {
          assert.ok(err instanceof MemoryDependencyError)
          assert.equal(err.message, 'Memory context injection failed: context worker returned invalid context data')
          assert.equal(err.provider, 'gpt')
          assert.equal(err.stage, 'inject')
          assert.ok(err.cause instanceof MemoryDependencyError)
          assert.equal(err.cause.stage, 'inject')
          return true
        },
      )

      assert.equal(providerCalled, false)
    })
  }
})

test('loadContextThenRunChatProvider converts context load failures to provider memory errors', async () => {
  const cause = new Error('context worker request failed')
  let providerCalled = false

  await assert.rejects(
    () => loadContextThenRunChatProvider('ollama', {
      content: 'hello',
      conversationId: 'typed-memory-error-test',
    }, {
      logger: { info() {} },
      loadContext: async ({ conversationId }) => {
        assert.equal(conversationId, 'typed-memory-error-test')
        throw cause
      },
      dispatchProvider: async () => {
        providerCalled = true
        return ''
      },
    }),
    err => {
      assert.ok(err instanceof MemoryDependencyError)
      assert.equal(err.message, 'Memory context load failed: context worker request failed')
      assert.equal(err.provider, 'ollama')
      assert.equal(err.stage, 'load')
      assert.equal(err.cause, cause)
      return true
    },
  )

  assert.equal(providerCalled, false)
})

test('POST /chat completes GET /context before invoking gpt provider', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-test-model'

  let resolveContextBody
  let notifyContextBodyStarted
  const contextBodyStarted = new Promise(resolve => {
    notifyContextBodyStarted = resolve
  })
  const contextBodyReleased = new Promise(resolve => {
    resolveContextBody = resolve
  })
  const fetchCalls = []
  const events = []
  let providerCalled = false

  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    const [url] = args

    if (url === 'http://context.test/context') {
      events.push('context-fetch')
      return {
        ok: true,
        status: 200,
        text: async () => {
          events.push('context-body-start')
          notifyContextBodyStarted()
          await contextBodyReleased
          events.push('context-body-complete')
          return JSON.stringify({
            context: 'Known facts about the user:\n- User prefers concise replies.',
            memory_count: 1,
          })
        },
      }
    }

    if (url === 'http://openai.test/v1/chat/completions') {
      providerCalled = true
      events.push('provider-fetch')
      assert.deepEqual(events, [
        'context-fetch',
        'context-body-start',
        'context-body-complete',
        'provider-fetch',
      ])
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  message: 'gpt handled after context',
                }),
              },
            },
          ],
        }),
      }
    }

    throw new Error(`unexpected fetch: ${url}`)
  }

  try {
    const responsePromise = postChat({
      content: 'hello',
      conversationId: 'ordering-test',
    })

    await contextBodyStarted
    await Promise.resolve()

    assert.equal(providerCalled, false)
    assert.deepEqual(events, ['context-fetch', 'context-body-start'])

    resolveContextBody()

    const response = await responsePromise
    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'gpt handled after context')
    assert.equal(providerCalled, true)
    assert.deepEqual(events, [
      'context-fetch',
      'context-body-start',
      'context-body-complete',
      'provider-fetch',
    ])
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])
    assert.equal(fetchCalls[1][0], 'http://openai.test/v1/chat/completions')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat injects curated saved memories from GET /context into gpt provider payload', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-test-model'

  const savedMemoryContext = [
    'Known facts about the user:',
    '- User prefers concise replies.',
    '- Project Case is a backend-first Android assistant.',
  ].join('\n')
  const expectedMemoryBlock = [
    'Known facts about the user:',
    '- User prefers concise replies.',
    '- Project Case is a backend-first Android assistant.',
    '',
    'Rules for using memory:',
    '- Use saved memories only as durable background facts when relevant.',
    '- Do not treat saved memories as recent conversation history or a transcript.',
  ].join('\n')

  const fetchCalls = mockContextFetch({
    context: savedMemoryContext,
    providerFetch: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                message: 'gpt used saved memories',
              }),
            },
          },
        ],
      }),
    }),
  })

  try {
    const response = await postChat({
      content: 'what should you remember?',
      conversationId: 'memory-injection-test',
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'gpt used saved memories')
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])

    const [url, options] = fetchCalls[1]
    assert.equal(url, 'http://openai.test/v1/chat/completions')
    const requestBody = JSON.parse(options.body)
    assert.equal(requestBody.messages[0].role, 'system')
    assert.match(requestBody.messages[0].content, /You are Case/)
    assert.equal(requestBody.messages[0].content.includes(expectedMemoryBlock), true)
    assert.equal(requestBody.messages[1].role, 'user')
    assert.equal(requestBody.messages[1].content, 'what should you remember?')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat sends exact GPT messages with injected curated saved memories', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-test-model'

  const savedMemories = [
    'User prefers concise replies.',
    'Project Case is a backend-first Android assistant.',
  ]
  const savedMemoryContext = [
    'Known facts about the user:',
    ...savedMemories.map(memory => `- ${memory}`),
  ].join('\n')
  const expectedMemoryBlock = formatSavedMemoryBlock(savedMemories)
  const expectedSystemPrompt = await buildExpectedGptSystemPrompt()

  const fetchCalls = mockContextFetch({
    context: savedMemoryContext,
    providerFetch: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                message: 'gpt exact messages captured',
              }),
            },
          },
        ],
      }),
    }),
  })

  try {
    const response = await postChat({
      content: 'what should you remember exactly?',
      conversationId: 'gpt-exact-memory-messages-test',
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'gpt exact messages captured')
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])

    const [url, options] = fetchCalls[1]
    assert.equal(url, 'http://openai.test/v1/chat/completions')
    const requestBody = JSON.parse(options.body)
    const expectedSystemContent = [
      expectedSystemPrompt,
      expectedMemoryBlock,
    ].join('\n\n')

    assert.equal(expectedMemoryBlock, [
      'Known facts about the user:',
      '- User prefers concise replies.',
      '- Project Case is a backend-first Android assistant.',
      '',
      'Rules for using memory:',
      '- Use saved memories only as durable background facts when relevant.',
      '- Do not treat saved memories as recent conversation history or a transcript.',
    ].join('\n'))
    assert.equal(requestBody.messages[0].content, expectedSystemContent)
    assert.equal(
      requestBody.messages[0].content.slice(expectedSystemPrompt.length + 2),
      expectedMemoryBlock,
    )
    assert.deepEqual(requestBody.messages, [
      {
        role: 'system',
        content: expectedSystemContent,
      },
      {
        role: 'user',
        content: 'what should you remember exactly?',
      },
    ])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat threads formatted saved memories into codex invocation input', async () => {
  config.chatProvider = 'codex'

  const savedMemoryContext = [
    'Known facts about the user:',
    '- User prefers concise replies.',
    '- Project Case is a backend-first Android assistant.',
  ].join('\n')
  const expectedMemoryBlock = formatSavedMemoryBlock([
    'User prefers concise replies.',
    'Project Case is a backend-first Android assistant.',
  ])
  const fetchCalls = mockContextFetch({ context: savedMemoryContext })

  process.env.FAKE_CODEX_EXPECT_PROMPT_CONTAINS = expectedMemoryBlock
  process.env.FAKE_CODEX_EXPECT_PROMPT_SEQUENCE = JSON.stringify([
    'You are Case',
    'Always respond in Korean.',
    expectedMemoryBlock,
    'User message:\nuse saved context',
    'Respond as raw JSON following the response format above.',
  ])
  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: 'codex received saved memories',
  })

  try {
    const response = await postChat({
      content: 'use saved context',
      conversationId: 'codex-memory-injection-test',
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'codex received saved memories')
    assert.equal(fetchCalls.length, 1)
    assertContextFetch(fetchCalls[0])
  } finally {
    delete process.env.FAKE_CODEX_EXPECT_PROMPT_CONTAINS
    delete process.env.FAKE_CODEX_EXPECT_PROMPT_SEQUENCE
    delete process.env.FAKE_CODEX_RESPONSE
    globalThis.fetch = originalFetch
  }
})

test('POST /chat sends exact Codex prompt with injected curated saved memories', async () => {
  config.chatProvider = 'codex'

  const savedMemories = [
    'User prefers concise replies.',
    'Project Case is a backend-first Android assistant.',
  ]
  const savedMemoryContext = [
    'Known facts about the user:',
    ...savedMemories.map(memory => `- ${memory}`),
  ].join('\n')
  const expectedMemoryBlock = [
    'Known facts about the user:',
    '- User prefers concise replies.',
    '- Project Case is a backend-first Android assistant.',
    '',
    'Rules for using memory:',
    '- Use saved memories only as durable background facts when relevant.',
    '- Do not treat saved memories as recent conversation history or a transcript.',
  ].join('\n')
  const expectedPrompt = [
    await buildExpectedCodexSystemPrompt(),
    expectedMemoryBlock,
    'User message:\nuse saved context exactly',
    'Respond as raw JSON following the response format above.',
  ].join('\n\n')
  const tempDir = await mkdtemp(path.join(tmpdir(), 'case-codex-prompt-'))
  const promptPath = path.join(tempDir, 'prompt.txt')
  const fetchCalls = mockContextFetch({ context: savedMemoryContext })

  process.env.FAKE_CODEX_CAPTURE_PROMPT_PATH = promptPath
  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: 'codex exact prompt captured',
  })

  try {
    const response = await postChat({
      content: 'use saved context exactly',
      conversationId: 'codex-exact-memory-prompt-test',
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'codex exact prompt captured')
    assert.equal(fetchCalls.length, 1)
    assertContextFetch(fetchCalls[0])
    const capturedPrompt = await readFile(promptPath, 'utf8')
    assert.equal(capturedPrompt, expectedPrompt)
    assert.equal(capturedPrompt.endsWith([
      expectedMemoryBlock,
      'User message:\nuse saved context exactly',
      'Respond as raw JSON following the response format above.',
    ].join('\n\n')), true)
  } finally {
    delete process.env.FAKE_CODEX_CAPTURE_PROMPT_PATH
    delete process.env.FAKE_CODEX_RESPONSE
    globalThis.fetch = originalFetch
    await rm(tempDir, { recursive: true, force: true })
  }
})

test('POST /chat sends codex invocation input without a memory block when no memories are saved', async () => {
  config.chatProvider = 'codex'

  const fetchCalls = mockContextFetch()

  process.env.FAKE_CODEX_REJECT_PROMPT_CONTAINS = 'Known facts about the user:'
  process.env.FAKE_CODEX_EXPECT_PROMPT_SEQUENCE = JSON.stringify([
    'You are Case',
    'User message:\nuse no saved context',
    'Respond as raw JSON following the response format above.',
  ])
  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: 'codex received no saved memories',
  })

  try {
    const response = await postChat({
      content: 'use no saved context',
      conversationId: 'codex-empty-memory-test',
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'codex received no saved memories')
    assert.equal(fetchCalls.length, 1)
    assertContextFetch(fetchCalls[0])
  } finally {
    delete process.env.FAKE_CODEX_REJECT_PROMPT_CONTAINS
    delete process.env.FAKE_CODEX_EXPECT_PROMPT_SEQUENCE
    delete process.env.FAKE_CODEX_RESPONSE
    globalThis.fetch = originalFetch
  }
})

test('POST /chat persists only canonical-new provider memories', async () => {
  config.chatProvider = 'codex'

  const savedMemoryContext = [
    'Known facts about the user:',
    '- User prefers concise replies.',
  ].join('\n')
  const fetchCalls = mockContextFetch({ context: savedMemoryContext })

  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: 'remembered durable facts',
    memory: [
      '  user prefers concise replies.  ',
      'Project Case stores durable memory.',
      'project   case stores DURABLE memory.',
      'The user prefers focused tests.',
    ],
  })

  try {
    const response = await postChat({
      content: 'remember this',
      conversationId: 'memory-dedupe-test',
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'remembered durable facts')
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])
    assertMemorySaveFetch(fetchCalls[1], [
      'Project Case stores durable memory.',
      'The user prefers focused tests.',
    ])
  } finally {
    delete process.env.FAKE_CODEX_RESPONSE
    globalThis.fetch = originalFetch
  }
})

test('POST /chat validates provider-returned durable memories and persists them to the memory store', async () => {
  config.chatProvider = 'codex'

  const savedMemoryStorage = []
  const fetchCalls = []
  const storedMemoryContext = () => savedMemoryStorage.length
    ? [
        'Known facts about the user:',
        ...savedMemoryStorage.map(memory => `- ${memory}`),
      ].join('\n')
    : ''

  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    const [url, options] = args
    if (url === 'http://context.test/context') {
      return contextResponse(storedMemoryContext(), savedMemoryStorage.length)
    }

    if (url === 'http://context.test/context/memories') {
      const body = JSON.parse(options.body)
      savedMemoryStorage.push(...body.memories)
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          saved: body.memories.length,
          memories: body.memories,
        }),
      }
    }

    throw new Error(`unexpected fetch: ${url}`)
  }

  const expectedPersistedMemories = [
    'User prefers concise status updates.',
    'Project Case stores durable memory.',
    'Use Asia/Seoul timezone for scheduling examples.',
  ]

  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: 'saved valid durable memories',
    memory: [
      '  User prefers concise status updates.  ',
      '\nProject Case stores durable memory.\t',
      'Use   Asia/Seoul   timezone for scheduling examples.',
    ],
  })

  try {
    const response = await postChat({
      content: 'remember these durable facts',
      conversationId: 'valid-memory-store-persistence-test',
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'saved valid durable memories')
    assert.deepEqual(savedMemoryStorage, expectedPersistedMemories)
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])
    assertMemorySaveFetch(fetchCalls[1], expectedPersistedMemories)

    process.env.FAKE_CODEX_EXPECT_PROMPT_CONTAINS = formatSavedMemoryBlock(expectedPersistedMemories)
    process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
      message: 'loaded persisted durable memories',
    })

    const followUpResponse = await postChat({
      content: 'use the saved durable facts',
      conversationId: 'valid-memory-store-persistence-test',
    })

    assert.equal(followUpResponse.statusCode, 200)
    assert.equal(followUpResponse.json().message.content, 'loaded persisted durable memories')
    assert.deepEqual(savedMemoryStorage, expectedPersistedMemories)
    assert.equal(fetchCalls.length, 3)
    assertContextFetch(fetchCalls[2])
  } finally {
    delete process.env.FAKE_CODEX_EXPECT_PROMPT_CONTAINS
    delete process.env.FAKE_CODEX_RESPONSE
    globalThis.fetch = originalFetch
  }
})

test('POST /chat returns assistant answer when provider memory handling succeeds', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-test-model'

  const assistantAnswer = 'I saved the durable project preference.'
  const savedMemories = ['User prefers concise replies.']
  const savedMemoryContext = [
    'Known facts about the user:',
    ...savedMemories.map(memory => `- ${memory}`),
  ].join('\n')
  const fetchCalls = mockContextFetch({
    context: savedMemoryContext,
    providerFetch: async (...args) => {
      const [url, options] = args
      assert.equal(url, 'http://openai.test/v1/chat/completions')
      assert.equal(options.method, 'POST')
      assert.equal(options.headers.authorization, 'Bearer test-openai-key')
      assert.equal(options.headers['content-type'], 'application/json')

      const requestBody = JSON.parse(options.body)
      assert.equal(requestBody.model, 'gpt-test-model')
      assert.equal(
        requestBody.messages[0].content.includes(formatSavedMemoryBlock(savedMemories)),
        true,
      )

      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  message: assistantAnswer,
                  memory: ['  Project Case stores durable memory.  '],
                }),
              },
            },
          ],
        }),
      }
    },
  })

  try {
    const response = await postChat({
      content: 'remember this durable fact',
      conversationId: 'provider-memory-success-test',
    })

    assert.equal(response.statusCode, 200)
    const body = response.json()
    assert.deepEqual(Object.keys(body), ['message'])
    assertNoMemoryPayload(body)
    assert.equal(body.message.content, assistantAnswer)
    assert.equal(body.message.role, 'assistant')
    assert.equal(body.message.status, 'sent')
    assert.deepEqual(body.message.parsedContent, {
      text: assistantAnswer,
      commands: null,
    })
    assert.equal(commandResults.size, 0)

    assert.equal(fetchCalls.length, 3)
    assertContextFetch(fetchCalls[0])
    assert.equal(fetchCalls[1][0], 'http://openai.test/v1/chat/completions')
    assertMemorySaveFetch(fetchCalls[2], ['Project Case stores durable memory.'], 'gpt')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat skips rejected provider memories before durable storage write', async () => {
  config.chatProvider = 'codex'

  const savedMemoryContext = [
    'Known facts about the user:',
    '- User prefers concise replies.',
  ].join('\n')
  const fetchCalls = mockContextFetch({ context: savedMemoryContext })

  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: 'saved only accepted durable memories',
    memory: [
      '  user   prefers CONCISE replies.  ',
      'Project Case stores durable memory.',
      '',
      '   ',
      null,
      { content: 'Do not stringify this object.' },
      `x${'y'.repeat(300)}`,
      'project   case stores DURABLE memory.',
      'The user prefers focused tests.',
    ],
  })

  try {
    const response = await postChat({
      content: 'remember only durable memory',
      conversationId: 'rejected-memory-skipped-before-save-test',
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'saved only accepted durable memories')
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])
    assertMemorySaveFetch(fetchCalls[1], [
      'Project Case stores durable memory.',
      'The user prefers focused tests.',
    ])
  } finally {
    delete process.env.FAKE_CODEX_RESPONSE
    globalThis.fetch = originalFetch
  }
})

test('POST /chat does not persist rejected provider memory to saved memory storage', async () => {
  config.chatProvider = 'codex'
  config.memoryMaxChars = 40

  const rejectedMemory = `Rejected durable preference ${'x'.repeat(40)}`
  const savedMemoryStorage = ['User prefers concise replies.']
  const fetchCalls = []
  const contextFromSavedMemoryStorage = () => [
    'Known facts about the user:',
    ...savedMemoryStorage.map(memory => `- ${memory}`),
  ].join('\n')

  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    const [url, options] = args
    if (url === 'http://context.test/context') {
      return contextResponse(contextFromSavedMemoryStorage(), savedMemoryStorage.length)
    }

    if (url === 'http://context.test/context/memories') {
      const body = JSON.parse(options.body)
      savedMemoryStorage.push(...body.memories)
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          saved: body.memories.length,
          memories: body.memories,
        }),
      }
    }

    throw new Error(`unexpected fetch: ${url}`)
  }

  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: 'persisted accepted durable memory only',
    memory: [
      'Project Case stores durable memory.',
      rejectedMemory,
    ],
  })

  try {
    const response = await postChat({
      content: 'remember only valid durable memory',
      conversationId: 'rejected-memory-not-persisted-test',
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'persisted accepted durable memory only')
    assert.deepEqual(savedMemoryStorage, [
      'User prefers concise replies.',
      'Project Case stores durable memory.',
    ])
    assert.equal(savedMemoryStorage.includes(rejectedMemory), false)
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])
    assertMemorySaveFetch(fetchCalls[1], ['Project Case stores durable memory.'])
  } finally {
    delete process.env.FAKE_CODEX_RESPONSE
    globalThis.fetch = originalFetch
  }
})

test('POST /chat excludes rejected provider memories from APK response payload', async () => {
  config.chatProvider = 'codex'

  const duplicateRejectedMemory = 'Saved duplicate memory must not be returned.'
  const oversizedRejectedMemory = `Oversized rejected memory ${'x'.repeat(280)}`
  const savedMemoryContext = [
    'Known facts about the user:',
    `- ${duplicateRejectedMemory}`,
  ].join('\n')
  const fetchCalls = mockContextFetch({ context: savedMemoryContext })

  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: 'visible answer only',
    memory: [
      `  ${duplicateRejectedMemory.toUpperCase()}  `,
      'Project Case stores durable memory.',
      'project   case stores DURABLE memory.',
      '',
      null,
      oversizedRejectedMemory,
    ],
  })

  try {
    const response = await postChat({
      content: 'answer without returning memory internals',
      conversationId: 'rejected-memory-not-in-apk-response-test',
    })

    assert.equal(response.statusCode, 200)
    const body = response.json()
    assert.deepEqual(Object.keys(body), ['message'])
    assertNoMemoryPayload(body)
    assert.equal(JSON.stringify(body).includes(duplicateRejectedMemory), false)
    assert.equal(JSON.stringify(body).includes(oversizedRejectedMemory), false)
    assert.equal(body.message.content, 'visible answer only')
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])
    assertMemorySaveFetch(fetchCalls[1], [
      'Project Case stores durable memory.',
    ])
  } finally {
    delete process.env.FAKE_CODEX_RESPONSE
    globalThis.fetch = originalFetch
  }
})

test('POST /chat does not inject or return rejected provider memory in Android chat flow', async () => {
  config.chatProvider = 'codex'

  const acceptedMemory = 'Project Case stores durable memory.'
  const rejectedMemory = `Rejected APK memory must not appear ${'x'.repeat(300)}`
  const savedMemoryStorage = []
  const fetchCalls = []
  const contextFromSavedMemoryStorage = () => savedMemoryStorage.length
    ? [
        'Known facts about the user:',
        ...savedMemoryStorage.map(memory => `- ${memory}`),
      ].join('\n')
    : ''

  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    const [url, options] = args
    if (url === 'http://context.test/context') {
      return contextResponse(contextFromSavedMemoryStorage(), savedMemoryStorage.length)
    }

    if (url === 'http://context.test/context/memories') {
      const body = JSON.parse(options.body)
      savedMemoryStorage.push(...body.memories)
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          saved: body.memories.length,
          memories: body.memories,
        }),
      }
    }

    throw new Error(`unexpected fetch: ${url}`)
  }

  process.env.FAKE_CODEX_REJECT_PROMPT_CONTAINS = rejectedMemory
  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: 'first visible answer only',
    memory: [
      acceptedMemory,
      rejectedMemory,
    ],
  })

  try {
    const firstResponse = await postChat({
      content: 'remember only valid memory',
      conversationId: 'apk-rejected-memory-flow-test',
    })

    assert.equal(firstResponse.statusCode, 200)
    const firstBody = firstResponse.json()
    assert.deepEqual(Object.keys(firstBody), ['message'])
    assertNoMemoryPayload(firstBody)
    assert.equal(JSON.stringify(firstBody).includes(rejectedMemory), false)
    assert.equal(firstBody.message.content, 'first visible answer only')
    assert.deepEqual(savedMemoryStorage, [acceptedMemory])
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])
    assertMemorySaveFetch(fetchCalls[1], [acceptedMemory])

    process.env.FAKE_CODEX_EXPECT_PROMPT_CONTAINS = formatSavedMemoryBlock([acceptedMemory])
    process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
      message: 'second visible answer only',
    })

    const secondResponse = await postChat({
      content: 'use saved memory',
      conversationId: 'apk-rejected-memory-flow-test',
    })

    assert.equal(secondResponse.statusCode, 200)
    const secondBody = secondResponse.json()
    assert.deepEqual(Object.keys(secondBody), ['message'])
    assertNoMemoryPayload(secondBody)
    assert.equal(JSON.stringify(secondBody).includes(rejectedMemory), false)
    assert.equal(secondBody.message.content, 'second visible answer only')
    assert.deepEqual(savedMemoryStorage, [acceptedMemory])
    assert.equal(fetchCalls.length, 3)
    assertContextFetch(fetchCalls[2])
  } finally {
    delete process.env.FAKE_CODEX_EXPECT_PROMPT_CONTAINS
    delete process.env.FAKE_CODEX_REJECT_PROMPT_CONTAINS
    delete process.env.FAKE_CODEX_RESPONSE
    globalThis.fetch = originalFetch
  }
})

test('POST /chat ignores invalid provider memory and still returns a valid assistant answer', async () => {
  config.chatProvider = 'codex'

  const savedMemoryContext = [
    'Known facts about the user:',
    '- User prefers concise replies.',
  ].join('\n')
  const fetchCalls = mockContextFetch({ context: savedMemoryContext })

  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: 'valid answer with no durable memory',
    memory: [
      '  user   prefers CONCISE replies.  ',
      '',
      '   ',
      null,
      { content: 'Do not stringify this object.' },
      `x${'y'.repeat(300)}`,
    ],
  })

  try {
    const response = await postChat({
      content: 'answer without saving invalid memory',
      conversationId: 'invalid-memory-does-not-block-test',
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'valid answer with no durable memory')
    assert.equal(commandResults.size, 0)
    assert.equal(fetchCalls.length, 1)
    assertContextFetch(fetchCalls[0])
  } finally {
    delete process.env.FAKE_CODEX_RESPONSE
    globalThis.fetch = originalFetch
  }
})

test('POST /chat rejects invalid GPT and Ollama provider memories without persisting them', async (t) => {
  const duplicateMemory = 'User prefers concise replies.'
  const oversizedMemory = `Rejected durable preference ${'x'.repeat(40)}`
  const savedMemoryContext = [
    'Known facts about the user:',
    `- ${duplicateMemory}`,
  ].join('\n')

  const cases = [
    {
      provider: 'gpt',
      configure: () => {
        config.chatProvider = 'gpt'
        config.openaiApiKey = 'test-openai-key'
        config.openaiBaseUrl = 'http://openai.test/v1'
        config.openaiModel = 'gpt-test-model'
      },
      providerUrl: 'http://openai.test/v1/chat/completions',
      providerResponseBody: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                message: 'gpt returned only rejected memory',
                memory: [
                  `  ${duplicateMemory.toUpperCase()}  `,
                  '',
                  '   ',
                  null,
                  { content: 'Do not stringify this object.' },
                  oversizedMemory,
                ],
              }),
            },
          },
        ],
      },
      expectedAnswer: 'gpt returned only rejected memory',
    },
    {
      provider: 'ollama',
      configure: () => {
        config.chatProvider = 'ollama'
        config.ollamaBaseUrl = 'http://ollama.test'
        config.ollamaModel = 'ollama-test-model'
      },
      providerUrl: 'http://ollama.test/api/chat',
      providerResponseBody: {
        message: {
          content: JSON.stringify({
            message: 'ollama returned only rejected memory',
            memory: [
              `  ${duplicateMemory.toUpperCase()}  `,
              '',
              '   ',
              null,
              { content: 'Do not stringify this object.' },
              oversizedMemory,
            ],
          }),
        },
      },
      expectedAnswer: 'ollama returned only rejected memory',
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.provider, async () => {
      Object.assign(config, originalConfig)
      config.contextWorkerUrl = 'http://context.test'
      config.memoryMaxChars = 40
      testCase.configure()

      const fetchCalls = mockContextFetch({
        context: savedMemoryContext,
        providerFetch: async (...args) => {
          const [url] = args
          assert.equal(url, testCase.providerUrl)
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(testCase.providerResponseBody),
          }
        },
        saveFetch: async () => {
          throw new Error(`${testCase.provider} rejected provider memory must not be persisted`)
        },
      })

      try {
        const response = await postChat({
          content: 'answer without saving invalid provider memory',
          conversationId: `${testCase.provider}-invalid-memory-not-persisted-test`,
        })

        assert.equal(response.statusCode, 200)
        const body = response.json()
        assert.deepEqual(Object.keys(body), ['message'])
        assertNoMemoryPayload(body)
        assert.equal(body.message.content, testCase.expectedAnswer)
        assert.equal(commandResults.size, 0)
        assert.equal(fetchCalls.length, 2)
        assertContextFetch(fetchCalls[0])
        assert.equal(fetchCalls[1][0], testCase.providerUrl)
        assert.equal(fetchCalls.some(([url]) => url === 'http://context.test/context/memories'), false)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  }
})

test('POST /chat posts accepted provider memories with the selected provider as source', async (t) => {
  const cases = [
    {
      provider: 'gpt',
      configure: () => {
        config.chatProvider = 'gpt'
        config.openaiApiKey = 'test-openai-key'
        config.openaiBaseUrl = 'http://openai.test/v1'
        config.openaiModel = 'gpt-test-model'
      },
      providerUrl: 'http://openai.test/v1/chat/completions',
      expectedMemories: ['GPT durable memory.'],
      providerResponseBody: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                message: 'gpt durable memory saved',
                memory: ['GPT durable memory.'],
              }),
            },
          },
        ],
      },
    },
    {
      provider: 'ollama',
      configure: () => {
        config.chatProvider = 'ollama'
        config.ollamaBaseUrl = 'http://ollama.test'
        config.ollamaModel = 'ollama-test-model'
      },
      providerUrl: 'http://ollama.test/api/chat',
      expectedMemories: ['Ollama durable memory.'],
      providerResponseBody: {
        message: {
          content: JSON.stringify({
            message: 'ollama durable memory saved',
            memory: ['Ollama durable memory.'],
          }),
        },
      },
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.provider, async () => {
      Object.assign(config, originalConfig)
      config.contextWorkerUrl = 'http://context.test'
      testCase.configure()

      const fetchCalls = mockContextFetch({
        providerFetch: async (...args) => {
          const [url] = args
          assert.equal(url, testCase.providerUrl)
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(testCase.providerResponseBody),
          }
        },
      })

      try {
        const response = await postChat({
          content: 'remember provider source',
          conversationId: `${testCase.provider}-memory-source-test`,
        })

        assert.equal(response.statusCode, 200)
        assert.equal(fetchCalls.length, 3)
        assertContextFetch(fetchCalls[0])
        assert.equal(fetchCalls[1][0], testCase.providerUrl)
        assertMemorySaveFetch(fetchCalls[2], testCase.expectedMemories, testCase.provider)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  }
})

test('POST /chat returns HTTP 502 without assistant answer when POST /context/memories fails', async () => {
  config.chatProvider = 'codex'
  const generatedAnswer = 'this answer must be discarded'

  const fetchCalls = mockContextFetch({
    saveFetch: async () => ({
      ok: false,
      status: 503,
      text: async () => 'memory save unavailable',
    }),
  })

  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: generatedAnswer,
    memory: ['Project Case stores durable memory.'],
  })

  try {
    const response = await postChat({
      content: 'remember this',
      conversationId: 'memory-save-failure-test',
    })
    const expectedBody = {
      error: 'Memory Error',
      message: 'Memory context save failed: context worker returned HTTP 503: memory save unavailable',
      provider: 'codex',
    }

    assert.equal(response.statusCode, 502)
    assert.equal(response.body, JSON.stringify(expectedBody))
    assert.equal(response.body.includes(generatedAnswer), false)
    const body = response.json()
    assert.deepEqual(body, expectedBody)
    assert.deepEqual(Object.keys(body), ['error', 'message', 'provider'])
    assert.equal(typeof body.message, 'string')
    assert.equal(Object.hasOwn(body, 'assistantAnswer'), false)
    assert.equal(Object.hasOwn(body, 'response'), false)
    assert.equal(commandResults.size, 0)
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])
    assertMemorySaveFetch(fetchCalls[1], ['Project Case stores durable memory.'])
  } finally {
    delete process.env.FAKE_CODEX_RESPONSE
    globalThis.fetch = originalFetch
  }
})

test('POST /chat returns HTTP 502 when POST /context/memories rejects instead of ignoring the save failure', async () => {
  config.chatProvider = 'codex'
  const generatedAnswer = 'discarded answer after rejected memory save'

  const fetchCalls = mockContextFetch({
    saveFetch: async () => {
      throw new Error('context memory write connection refused')
    },
  })

  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: generatedAnswer,
    memory: ['User prefers memory persistence failures to fail loudly.'],
  })

  try {
    const response = await postChat({
      content: 'remember this, but persistence is down',
      conversationId: 'memory-save-rejection-test',
    })
    const expectedBody = {
      error: 'Memory Error',
      message: 'Memory context save failed: context memory write connection refused',
      provider: 'codex',
    }

    assert.equal(response.statusCode, 502)
    assert.deepEqual(response.json(), expectedBody)
    assert.equal(response.body.includes(generatedAnswer), false)
    assert.equal(commandResults.size, 0)
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])
    assertMemorySaveFetch(fetchCalls[1], [
      'User prefers memory persistence failures to fail loudly.',
    ])
  } finally {
    delete process.env.FAKE_CODEX_RESPONSE
    globalThis.fetch = originalFetch
  }
})

test('POST /chat reports selected HTTP provider and context error when memory persistence fails', async (t) => {
  const cases = [
    {
      provider: 'gpt',
      configure: () => {
        config.chatProvider = 'gpt'
        config.openaiApiKey = 'test-openai-key'
        config.openaiBaseUrl = 'http://openai.test/v1'
        config.openaiModel = 'gpt-test-model'
      },
      providerUrl: 'http://openai.test/v1/chat/completions',
      generatedAnswer: 'this gpt answer must be discarded',
      providerResponseBody: {
        choices: [
          {
            message: {
              content: JSON.stringify({
                message: 'this gpt answer must be discarded',
                memory: ['GPT memory that cannot be saved.'],
              }),
            },
          },
        ],
      },
      expectedMemories: ['GPT memory that cannot be saved.'],
    },
    {
      provider: 'ollama',
      configure: () => {
        config.chatProvider = 'ollama'
        config.ollamaBaseUrl = 'http://ollama.test'
        config.ollamaModel = 'ollama-test-model'
      },
      providerUrl: 'http://ollama.test/api/chat',
      generatedAnswer: 'this ollama answer must be discarded',
      providerResponseBody: {
        message: {
          content: JSON.stringify({
            message: 'this ollama answer must be discarded',
            memory: ['Ollama memory that cannot be saved.'],
          }),
        },
      },
      expectedMemories: ['Ollama memory that cannot be saved.'],
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.provider, async () => {
      Object.assign(config, originalConfig)
      config.contextWorkerUrl = 'http://context.test'
      testCase.configure()

      const fetchCalls = mockContextFetch({
        providerFetch: async (...args) => {
          const [url] = args
          assert.equal(url, testCase.providerUrl)
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify(testCase.providerResponseBody),
          }
        },
        saveFetch: async () => ({
          ok: false,
          status: 500,
          text: async () => JSON.stringify({
            detail: `${testCase.provider} memory storage write failed`,
          }),
        }),
      })

      try {
        const response = await postChat({
          content: 'remember this after provider generation',
          conversationId: `${testCase.provider}-memory-save-failure-test`,
        })
        const expectedBody = {
          error: 'Memory Error',
          message: `Memory context save failed: context worker returned HTTP 500: ${testCase.provider} memory storage write failed`,
          provider: testCase.provider,
        }

        assert.equal(response.statusCode, 502)
        assert.equal(response.body, JSON.stringify(expectedBody))
        assert.equal(response.body.includes(testCase.generatedAnswer), false)
        assert.deepEqual(response.json(), expectedBody)
        assert.equal(commandResults.size, 0)
        assert.equal(fetchCalls.length, 3)
        assertContextFetch(fetchCalls[0])
        assert.equal(fetchCalls[1][0], testCase.providerUrl)
        assertMemorySaveFetch(fetchCalls[2], testCase.expectedMemories, testCase.provider)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  }
})

test('POST /chat with codex returns HTTP 200 and Android message fields', async () => {
  const fetchCalls = mockContextFetch()

  try {
    const response = await postChat({
      content: 'hello',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 200)

    const body = response.json()
    assert.deepEqual(Object.keys(body), ['message'])

    const { message } = body
    assert.equal(typeof message.id, 'string')
    assert.match(message.id, /^msg_[a-f0-9]{12}$/)
    assert.equal(typeof message.timestamp, 'string')
    assert.equal(Number.isNaN(Date.parse(message.timestamp)), false)
    assert.equal(message.content, 'codex handled: hello')
    assert.equal(message.role, 'assistant')
    assert.equal(message.status, 'sent')
    assert.equal(message.executionStatus, null)
    assert.equal(message.hasCommands, false)
    assert.equal(message.executionId, null)
    assert.deepEqual(message.parsedContent, {
      text: message.content,
      commands: null,
    })
    assert.equal(commandResults.size, 0)
    assert.equal(fetchCalls.length, 1)
    assertContextFetch(fetchCalls[0])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat normalizes successful codex JSON actions into Android message shape', async () => {
  const fetchCalls = mockContextFetch()
  process.env.FAKE_CODEX_RESPONSE = JSON.stringify({
    message: 'I will check the working tree.',
    action: {
      type: 'execute',
      instruction: 'Check the current git status',
    },
    memory: ['The user asks for concise status updates.'],
  })

  try {
    const response = await postChat({
      content: 'check status',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 200)

    const body = response.json()
    assert.deepEqual(Object.keys(body), ['message'])
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])
    assertMemorySaveFetch(fetchCalls[1], ['The user asks for concise status updates.'])

    const { message } = body
    assert.equal(typeof message.id, 'string')
    assert.equal(typeof message.timestamp, 'string')
    assert.equal(Number.isNaN(Date.parse(message.timestamp)), false)
    assert.equal(message.content, 'I will check the working tree.')
    assert.equal(message.role, 'assistant')
    assert.equal(message.status, 'sent')
    assert.equal(message.executionStatus, 'queued')
    assert.equal(message.hasCommands, true)
    assert.equal(typeof message.executionId, 'string')
    assert.deepEqual(message.parsedContent, {
      text: 'I will check the working tree.',
      commands: [
        {
          command: 'Check the current git status',
          description: 'Computer task',
          workingDirectory: null,
          requiresConfirmation: false,
          timeoutSeconds: 120,
        },
      ],
    })

    const queued = commandResults.get(message.executionId)
    assert.equal(queued.status, 'queued')
    assert.equal(queued.result, null)
    assert.deepEqual(queued.commands, message.parsedContent.commands)
  } finally {
    delete process.env.FAKE_CODEX_RESPONSE
    globalThis.fetch = originalFetch
  }
})

test('POST /chat with claude returns HTTP 200 and Android message fields', async () => {
  const fetchCalls = mockContextFetch()
  config.chatProvider = 'claude'

  try {
    const response = await postChat({
      content: 'hello',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 200)

    const body = response.json()
    assert.deepEqual(Object.keys(body), ['message'])

    const { message } = body
    assert.equal(typeof message.id, 'string')
    assert.match(message.id, /^msg_[a-f0-9]{12}$/)
    assert.equal(typeof message.timestamp, 'string')
    assert.equal(Number.isNaN(Date.parse(message.timestamp)), false)
    assert.equal(message.content, 'claude handled: hello')
    assert.equal(message.role, 'assistant')
    assert.equal(message.status, 'sent')
    assert.equal(message.executionStatus, null)
    assert.equal(message.hasCommands, false)
    assert.equal(message.executionId, null)
    assert.deepEqual(message.parsedContent, {
      text: message.content,
      commands: null,
    })
    assert.equal(commandResults.size, 0)
    assert.equal(fetchCalls.length, 1)
    assertContextFetch(fetchCalls[0])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat normalizes successful claude JSON actions into Android message shape', async () => {
  const fetchCalls = mockContextFetch()
  config.chatProvider = 'claude'
  process.env.FAKE_CLAUDE_RESPONSE = JSON.stringify({
    message: 'I will inspect the project.',
    action: {
      type: 'execute',
      instruction: 'Inspect the current project files',
    },
  })

  try {
    const response = await postChat({
      content: 'inspect project',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 200)

    const body = response.json()
    assert.deepEqual(Object.keys(body), ['message'])
    assert.equal(fetchCalls.length, 1)
    assertContextFetch(fetchCalls[0])

    const { message } = body
    assert.equal(message.content, 'I will inspect the project.')
    assert.equal(message.executionStatus, 'queued')
    assert.equal(message.hasCommands, true)
    assert.equal(typeof message.executionId, 'string')
    assert.deepEqual(message.parsedContent, {
      text: 'I will inspect the project.',
      commands: [
        {
          command: 'Inspect the current project files',
          description: 'Computer task',
          workingDirectory: null,
          requiresConfirmation: false,
          timeoutSeconds: 120,
        },
      ],
    })

    const queued = commandResults.get(message.executionId)
    assert.equal(queued.status, 'queued')
    assert.deepEqual(queued.commands, message.parsedContent.commands)
  } finally {
    delete process.env.FAKE_CLAUDE_RESPONSE
    globalThis.fetch = originalFetch
  }
})

test('POST /chat with gpt returns HTTP 200 and Android message fields', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-test-model'

  const fetchCalls = mockContextFetch({
    context: 'Known facts about the user:\n- User prefers concise replies.',
    providerFetch: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                message: 'gpt handled: hello',
              }),
            },
          },
        ],
      }),
    }),
  })

  try {
    const response = await postChat({
      content: 'hello',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 200)

    const body = response.json()
    assert.deepEqual(Object.keys(body), ['message'])

    const { message } = body
    assert.equal(typeof message.id, 'string')
    assert.match(message.id, /^msg_[a-f0-9]{12}$/)
    assert.equal(typeof message.timestamp, 'string')
    assert.equal(Number.isNaN(Date.parse(message.timestamp)), false)
    assert.equal(message.content, 'gpt handled: hello')
    assert.equal(message.role, 'assistant')
    assert.equal(message.status, 'sent')
    assert.equal(message.executionStatus, null)
    assert.equal(message.hasCommands, false)
    assert.equal(message.executionId, null)
    assert.deepEqual(message.parsedContent, {
      text: message.content,
      commands: null,
    })
    assert.equal(commandResults.size, 0)

    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])

    const [url, options] = fetchCalls[1]
    assert.equal(url, 'http://openai.test/v1/chat/completions')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers.authorization, 'Bearer test-openai-key')
    assert.equal(options.headers['content-type'], 'application/json')
    const requestBody = JSON.parse(options.body)
    assert.equal(requestBody.model, 'gpt-test-model')
    assert.match(requestBody.messages[0].content, /Known facts about the user/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat sends accepted JPEG attachment data and metadata in GPT payload', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-4o'

  const imageAttachment = createAcceptedJpegAttachment()
  const fetchCalls = mockContextFetch({
    providerFetch: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                message: 'gpt described the image',
              }),
            },
          },
        ],
      }),
    }),
  })

  try {
    const response = await postChat({
      content: 'describe the attached image',
      conversationId: 'gpt-image-payload-test',
      attachments: [imageAttachment],
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'gpt described the image')
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])

    const [url, options] = fetchCalls[1]
    assert.equal(url, 'http://openai.test/v1/chat/completions')
    const requestBody = JSON.parse(options.body)
    assert.equal(requestBody.model, 'gpt-4o')
    assert.deepEqual(requestBody.messages.at(-1), {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'describe the attached image',
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:${imageAttachment.mimeType};base64,${imageAttachment.dataBase64}`,
          },
        },
      ],
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat forwards a JPEG fixture byte-equivalently with MIME metadata in GPT payload', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-4o'

  const fixtureBytes = await readFile(new URL('./test-fixtures/visible-object.jpg', import.meta.url))
  const fixtureDataBase64 = fixtureBytes.toString('base64')
  const imageAttachment = createAcceptedJpegAttachment({
    mimeType: 'image/jpeg',
    contentType: 'IMAGE/JPEG',
    dataBase64: fixtureDataBase64,
    file: fixtureDataBase64,
    filename: 'visible-object.jpg',
    name: 'visible-object.jpg',
    imageSource: 'content://case-picker/visible-object.jpg',
    sizeBytes: fixtureBytes.length,
  })
  const fetchCalls = mockContextFetch({
    providerFetch: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                message: 'gpt described the fixture',
              }),
            },
          },
        ],
      }),
    }),
  })

  try {
    const response = await postChat({
      content: 'describe the fixture image',
      conversationId: 'gpt-jpeg-fixture-forwarding-test',
      attachments: [imageAttachment],
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'gpt described the fixture')
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])

    const [url, options] = fetchCalls[1]
    assert.equal(url, 'http://openai.test/v1/chat/completions')
    const requestBody = JSON.parse(options.body)
    const userMessage = requestBody.messages.at(-1)
    assert.equal(userMessage.role, 'user')
    assert.deepEqual(userMessage.content.at(0), {
      type: 'text',
      text: 'describe the fixture image',
    })

    const imageContent = userMessage.content.at(-1)
    assert.equal(imageContent.type, 'image_url')

    const dataUrlMatch = imageContent.image_url.url.match(/^data:([^;]+);base64,([A-Za-z0-9+/]+={0,2})$/)
    assert.ok(dataUrlMatch)
    assert.equal(dataUrlMatch[1], 'image/jpeg')
    assert.equal(dataUrlMatch[2], fixtureDataBase64)
    assert.deepEqual(Buffer.from(dataUrlMatch[2], 'base64'), fixtureBytes)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat trims trailing phone JPEG data before forwarding image content', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-4o'

  const fixtureBytes = await readFile(new URL('./test-fixtures/visible-object.jpg', import.meta.url))
  const phonePhotoBytes = Buffer.concat([
    fixtureBytes,
    Buffer.from('motion-photo-trailer-data'),
  ])
  const phonePhotoDataBase64 = phonePhotoBytes.toString('base64')
  const imageAttachment = createAcceptedJpegAttachment({
    dataBase64: phonePhotoDataBase64,
    file: phonePhotoDataBase64,
    filename: 'phone-photo.jpg',
    name: 'phone-photo.jpg',
    imageSource: 'content://case-picker/phone-photo.jpg',
    sizeBytes: phonePhotoBytes.length,
  })
  const fetchCalls = mockContextFetch({
    providerFetch: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                message: 'gpt described the phone photo',
              }),
            },
          },
        ],
      }),
    }),
  })

  try {
    const response = await postChat({
      content: 'describe the phone photo',
      conversationId: 'gpt-phone-photo-trim-test',
      attachments: [imageAttachment],
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'gpt described the phone photo')

    const [, options] = fetchCalls[1]
    const requestBody = JSON.parse(options.body)
    const imageContent = requestBody.messages.at(-1).content.at(-1)
    const dataUrlMatch = imageContent.image_url.url.match(/^data:([^;]+);base64,([A-Za-z0-9+/]+={0,2})$/)
    assert.ok(dataUrlMatch)
    assert.equal(dataUrlMatch[1], 'image/jpeg')
    assert.equal(dataUrlMatch[2], fixtureBytes.toString('base64'))
    assert.deepEqual(Buffer.from(dataUrlMatch[2], 'base64'), fixtureBytes)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat response for desk JPEG fixture must mention laptop and coffee without unrelated scenes', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-4o'

  const fixtureBytes = await readFile(new URL('./test-fixtures/desk-laptop-coffee.jpg', import.meta.url))
  assert.ok(fixtureBytes.length < 5 * 1024 * 1024)
  const fixtureDataBase64 = fixtureBytes.toString('base64')
  const imageAttachment = createAcceptedJpegAttachment({
    dataBase64: fixtureDataBase64,
    file: fixtureDataBase64,
    filename: 'desk-laptop-coffee.jpg',
    name: 'desk-laptop-coffee.jpg',
    imageSource: 'content://case-picker/desk-laptop-coffee.jpg',
    sizeBytes: fixtureBytes.length,
  })
  const groundedDeskResponse = 'The image shows a laptop on a desk with a cup of coffee nearby.'
  const unrelatedSceneDescriptions = new RegExp([
    '\\bbeach\\b',
    '\\bocean\\b',
    '\\bmountain\\b',
    '\\bforest\\b',
    '\\bstreet\\b',
    '\\btraffic\\b',
    '\\bcar\\b',
    '\\bdog\\b',
    '\\bcat\\b',
    '\\bperson\\b',
    '\\bpeople\\b',
    '\\bkitchen\\b',
    '\\bbedroom\\b',
    '\\bplant\\b',
    '\\bleaves\\b',
    '\\breceipt\\b',
    '\\bdocument\\b',
  ].join('|'), 'i')
  const fetchCalls = mockContextFetch({
    providerFetch: async (_url, options) => {
      const requestBody = JSON.parse(options.body)
      assert.deepEqual(requestBody.messages.at(-1), {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'Describe the visible objects in this image.',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${imageAttachment.dataBase64}`,
            },
          },
        ],
      })

      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  message: groundedDeskResponse,
                }),
              },
            },
          ],
        }),
      }
    },
  })

  try {
    const response = await postChat({
      content: 'Describe the visible objects in this image.',
      conversationId: 'gpt-desk-laptop-coffee-visual-grounding-test',
      attachments: [imageAttachment],
    })

    assert.equal(response.statusCode, 200)
    const message = response.json().message.content
    assert.match(message, /\blaptop\b/i)
    assert.match(message, /\bcoffee\b/i)
    assert.doesNotMatch(message, unrelatedSceneDescriptions)
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])
    assert.equal(fetchCalls[1][0], 'http://openai.test/v1/chat/completions')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat rejects invalid v1 image attachment variants before context or provider calls', async (t) => {
  const corruptPngData = Buffer.from('not really a png').toString('base64')
  const truncatedPngBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
  const truncatedPngData = truncatedPngBytes.toString('base64')
  const crcCorruptPngBytes = Buffer.from(createAcceptedPngAttachment().dataBase64, 'base64')
  const idatChunkTypeOffset = crcCorruptPngBytes.indexOf(Buffer.from('IDAT', 'ascii'))
  assert.notEqual(idatChunkTypeOffset, -1)
  crcCorruptPngBytes[idatChunkTypeOffset + 4] ^= 0xff
  const crcCorruptPngData = crcCorruptPngBytes.toString('base64')
  const decodeCorruptPngBytes = corruptPngIdatWithFreshCrc(createAcceptedPngAttachment().dataBase64)
  const decodeCorruptPngData = decodeCorruptPngBytes.toString('base64')
  const corruptJpegScanBytes = corruptJpegScanWithInvalidMarker(createAcceptedJpegAttachment().dataBase64)
  const corruptJpegScanData = corruptJpegScanBytes.toString('base64')
  const cases = [
    {
      name: 'gif attachment',
      attachment: createAcceptedJpegAttachment({
        mimeType: 'image/gif',
        contentType: 'image/gif',
        filename: 'animated.gif',
        name: 'animated.gif',
      }),
      expectedMessage: /mimeType must be image\/jpeg or image\/png/,
      expectedField: 'attachments[0].mimeType',
    },
    {
      name: 'webp attachment',
      attachment: createAcceptedJpegAttachment({
        mimeType: 'image/webp',
        contentType: 'image/webp',
        filename: 'photo.webp',
        name: 'photo.webp',
      }),
      expectedMessage: /mimeType must be image\/jpeg or image\/png/,
      expectedField: 'attachments[0].mimeType',
    },
    {
      name: 'pdf attachment',
      attachment: createAcceptedJpegAttachment({
        mimeType: 'application/pdf',
        contentType: 'application/pdf',
        filename: 'document.pdf',
        name: 'document.pdf',
      }),
      expectedMessage: /mimeType must be image\/jpeg or image\/png/,
      expectedField: 'attachments[0].mimeType',
    },
    {
      name: 'heic attachment',
      attachment: createAcceptedJpegAttachment({
        mimeType: 'image/heic',
        contentType: 'image/heic',
        filename: 'photo.heic',
        name: 'photo.heic',
      }),
      expectedMessage: /mimeType must be image\/jpeg or image\/png/,
      expectedField: 'attachments[0].mimeType',
    },
    {
      name: 'heif attachment',
      attachment: createAcceptedJpegAttachment({
        mimeType: 'image/heif',
        contentType: 'image/heif',
        filename: 'photo.heif',
        name: 'photo.heif',
      }),
      expectedMessage: /mimeType must be image\/jpeg or image\/png/,
      expectedField: 'attachments[0].mimeType',
    },
    {
      name: 'svg attachment',
      attachment: createAcceptedJpegAttachment({
        mimeType: 'image/svg+xml',
        contentType: 'image/svg+xml',
        filename: 'diagram.svg',
        name: 'diagram.svg',
      }),
      expectedMessage: /mimeType must be image\/jpeg or image\/png/,
      expectedField: 'attachments[0].mimeType',
    },
    {
      name: 'oversized jpeg',
      attachment: createAcceptedJpegAttachment({
        sizeBytes: 5 * 1024 * 1024 + 1,
      }),
      expectedMessage: /sizeBytes must be 5MB or smaller/,
      expectedField: 'attachments[0].sizeBytes',
    },
    {
      name: 'corrupt png',
      attachment: createAcceptedPngAttachment({
        dataBase64: corruptPngData,
        file: corruptPngData,
        sizeBytes: Buffer.byteLength('not really a png'),
      }),
      expectedMessage: /readable image\/png image data/,
      expectedField: 'attachments[0].dataBase64',
    },
    {
      name: 'truncated png',
      attachment: createAcceptedPngAttachment({
        dataBase64: truncatedPngData,
        file: truncatedPngData,
        sizeBytes: truncatedPngBytes.length,
      }),
      expectedMessage: /readable image\/png image data/,
      expectedField: 'attachments[0].dataBase64',
    },
    {
      name: 'crc-corrupt png',
      attachment: createAcceptedPngAttachment({
        dataBase64: crcCorruptPngData,
        file: crcCorruptPngData,
        sizeBytes: crcCorruptPngBytes.length,
      }),
      expectedMessage: /readable image\/png image data/,
      expectedField: 'attachments[0].dataBase64',
    },
    {
      name: 'decode-corrupt png',
      attachment: createAcceptedPngAttachment({
        dataBase64: decodeCorruptPngData,
        file: decodeCorruptPngData,
        sizeBytes: decodeCorruptPngBytes.length,
      }),
      expectedMessage: /readable image\/png image data/,
      expectedField: 'attachments[0].dataBase64',
    },
    {
      name: 'corrupt jpeg scan',
      attachment: createAcceptedJpegAttachment({
        dataBase64: corruptJpegScanData,
        file: corruptJpegScanData,
        sizeBytes: corruptJpegScanBytes.length,
      }),
      expectedMessage: /readable image\/jpeg image data/,
      expectedField: 'attachments[0].dataBase64',
    },
    {
      name: 'invalid base64',
      attachment: createAcceptedJpegAttachment({
        dataBase64: '@@@',
        file: '@@@',
        sizeBytes: 3,
      }),
      expectedMessage: /valid non-empty base64 image data/,
      expectedField: 'attachments[0].dataBase64',
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.name, async () => {
      const fetchCalls = []
      globalThis.fetch = async (...args) => {
        fetchCalls.push(args)
        throw new Error(`context/provider stack must not run for ${testCase.name}`)
      }

      try {
        const response = await postChat({
          content: 'describe this invalid attachment',
          conversationId: `v1-invalid-image-${testCase.name}`,
          attachments: [testCase.attachment],
        })

        assertImageAttachmentValidationResponse(
          response,
          testCase.expectedMessage,
          testCase.expectedField,
        )
        assert.equal(fetchCalls.length, 0)
        assert.equal(commandResults.size, 0)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  }
})

test('POST /chat rejects oversized JPEG and PNG declared sizes before context or provider calls', async (t) => {
  const cases = [
    {
      label: 'JPEG',
      attachment: createAcceptedJpegAttachment({
        filename: 'oversized.jpg',
        name: 'oversized.jpg',
        imageSource: 'content://case-picker/oversized.jpg',
        sizeBytes: CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
      }),
    },
    {
      label: 'PNG',
      attachment: createAcceptedPngAttachment({
        filename: 'oversized.png',
        name: 'oversized.png',
        imageSource: 'content://case-picker/oversized.png',
        sizeBytes: CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
      }),
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.label, async () => {
      const fetchCalls = []
      globalThis.fetch = async (...args) => {
        fetchCalls.push(args)
        throw new Error(`${testCase.label} oversized image must not reach context or provider calls`)
      }

      try {
        const response = await postChat({
          content: `describe this oversized ${testCase.label} image`,
          conversationId: `declared-oversized-${testCase.label.toLowerCase()}-image-test`,
          attachments: [testCase.attachment],
        })

        const body = response.json()
        assert.equal(testCase.attachment.sizeBytes, CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1)
        assert.equal(response.statusCode, 400)
        assert.equal(body.error, 'Bad Request')
        assert.match(body.message, /attachments\[0\]\.sizeBytes must be 5MB or smaller/)
        assert.equal(fetchCalls.length, 0)
        assert.equal(commandResults.size, 0)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  }
})

test('POST /chat rejects actual oversized image payload before provider request construction', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-4o'

  const oversizedPngBytes = Buffer.alloc(5 * 1024 * 1024 + 1)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(oversizedPngBytes)
  const oversizedPngBase64 = oversizedPngBytes.toString('base64')
  const fetchCalls = []

  globalThis.fetch = async (...args) => {
    fetchCalls.push(args)
    throw new Error('context or provider stack must not run for oversized image payloads')
  }

  try {
    const response = await postChat({
      content: 'describe this oversized image',
      conversationId: 'actual-oversized-image-rejection-test',
      attachments: [
        createAcceptedPngAttachment({
          dataBase64: oversizedPngBase64,
          file: oversizedPngBase64,
          filename: 'oversized.png',
          name: 'oversized.png',
          imageSource: 'content://case-picker/oversized.png',
          sizeBytes: 5 * 1024 * 1024,
        }),
      ],
    })

    const body = response.json()
    assert.equal(response.statusCode, 400)
    assert.equal(body.error, 'Bad Request')
    assert.match(body.message, /decoded image payload must be 5MB or smaller/)
    assert.equal(fetchCalls.length, 0)
    assert.equal(commandResults.size, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('provider boundary rejects oversized image requests before AI provider dispatch', async (t) => {
  const oversizedPngBytes = Buffer.alloc(CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1)
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(oversizedPngBytes)
  const oversizedPngBase64 = oversizedPngBytes.toString('base64')
  const providers = ['codex', 'claude', 'gpt', 'ollama']
  const cases = [
    {
      label: 'declared-size',
      attachment: createAcceptedJpegAttachment({
        filename: 'oversized.jpg',
        name: 'oversized.jpg',
        imageSource: 'content://case-picker/oversized.jpg',
        sizeBytes: CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
      }),
      expectedMessage: /attachments\[0\]\.sizeBytes must be 5MB or smaller/,
    },
    {
      label: 'decoded-payload',
      attachment: createAcceptedPngAttachment({
        dataBase64: oversizedPngBase64,
        file: oversizedPngBase64,
        filename: 'oversized.png',
        name: 'oversized.png',
        imageSource: 'content://case-picker/oversized.png',
        sizeBytes: CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES,
      }),
      expectedMessage: /attachments\[0\]\.dataBase64 and attachments\[0\]\.file decoded image payload must be 5MB or smaller/,
    },
  ]

  for (const provider of providers) {
    await t.test(provider, async (providerTest) => {
      for (const testCase of cases) {
        await providerTest.test(testCase.label, async () => {
          let contextLoadCalls = 0
          let providerDispatchCalls = 0

          await assert.rejects(
            () => loadContextThenRunChatProvider(
              provider,
              {
                content: `describe this oversized ${testCase.label} image`,
                conversationId: `provider-boundary-oversized-${provider}-${testCase.label}`,
                attachments: [testCase.attachment],
              },
              {
                loadContext: async () => {
                  contextLoadCalls += 1
                  return parsedChatContextFromMemories([])
                },
                dispatchProvider: async () => {
                  providerDispatchCalls += 1
                  return '{"message":"provider dispatch must not run"}'
                },
              },
            ),
            (err) => {
              assert.match(err.message, testCase.expectedMessage)
              return true
            },
          )

          assert.equal(contextLoadCalls, 0)
          assert.equal(providerDispatchCalls, 0)
          assert.equal(commandResults.size, 0)
        })
      }
    })
  }
})

test('POST /chat rejects PDF attachments with a clear unsupported-file error before provider mock calls', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-4o'

  const pdfBytes = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n')
  const pdfBase64 = pdfBytes.toString('base64')
  const providerCalls = []
  const contextCalls = []

  globalThis.fetch = async (...args) => {
    const [url] = args
    if (url === 'http://context.test/context') {
      contextCalls.push(args)
      return contextResponse('')
    }

    if (url === 'http://openai.test/v1/chat/completions') {
      providerCalls.push(args)
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          choices: [
            {
              message: {
                content: 'provider mock should not describe rejected PDF content',
              },
            },
          ],
        }),
      }
    }

    throw new Error(`unexpected fetch for PDF rejection test: ${url}`)
  }

  try {
    const response = await postChat({
      content: 'describe this PDF',
      conversationId: 'pdf-attachment-rejection-test',
      attachments: [
        createAcceptedJpegAttachment({
          mimeType: 'application/pdf',
          contentType: 'application/pdf',
          dataBase64: pdfBase64,
          file: pdfBase64,
          filename: 'case-report.pdf',
          name: 'case-report.pdf',
          imageSource: 'content://case-picker/case-report.pdf',
          sizeBytes: pdfBytes.length,
        }),
      ],
    })

    const body = response.json()
    assert.equal(response.statusCode, 400)
    assert.equal(body.error, 'Bad Request')
    assert.match(body.message, /unsupported file type/i)
    assert.match(body.message, /PDF files are not supported/)
    assert.match(body.message, /image\/jpeg or image\/png/)
    assert.equal(providerCalls.length, 0)
    assert.equal(contextCalls.length, 0)
    assert.equal(commandResults.size, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat rejects HEIC and HEIF attachments with clear unsupported-format errors before provider mock calls', async (t) => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-4o'

  const cases = [
    {
      label: 'HEIC',
      mimeType: 'image/heic',
      filename: 'phone-photo.heic',
      imageSource: 'content://case-picker/phone-photo.heic',
    },
    {
      label: 'HEIF',
      mimeType: 'image/heif',
      filename: 'phone-photo.heif',
      imageSource: 'content://case-picker/phone-photo.heif',
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.label, async () => {
      const unsupportedImageBytes = Buffer.from(`case unsupported ${testCase.label} fixture`)
      const unsupportedImageBase64 = unsupportedImageBytes.toString('base64')
      const providerCalls = []
      const contextCalls = []

      globalThis.fetch = async (...args) => {
        const [url] = args
        if (url === 'http://context.test/context') {
          contextCalls.push(args)
          return contextResponse('')
        }

        if (url === 'http://openai.test/v1/chat/completions') {
          providerCalls.push(args)
          return {
            ok: true,
            status: 200,
            text: async () => JSON.stringify({
              choices: [
                {
                  message: {
                    content: `provider mock should not describe rejected ${testCase.label} content`,
                  },
                },
              ],
            }),
          }
        }

        throw new Error(`unexpected fetch for ${testCase.label} rejection test: ${url}`)
      }

      try {
        const response = await postChat({
          content: `describe this ${testCase.label} image`,
          conversationId: `${testCase.label.toLowerCase()}-attachment-rejection-test`,
          attachments: [
            createAcceptedJpegAttachment({
              mimeType: testCase.mimeType,
              contentType: testCase.mimeType,
              dataBase64: unsupportedImageBase64,
              file: unsupportedImageBase64,
              filename: testCase.filename,
              name: testCase.filename,
              imageSource: testCase.imageSource,
              sizeBytes: unsupportedImageBytes.length,
            }),
          ],
        })

        const body = response.json()
        assert.equal(response.statusCode, 400)
        assert.equal(body.error, 'Bad Request')
        assert.match(body.message, /unsupported file type/i)
        assert.match(body.message, new RegExp(`${testCase.label} files are not supported`))
        assert.match(body.message, /image\/jpeg or image\/png/)
        assert.equal(providerCalls.length, 0)
        assert.equal(contextCalls.length, 0)
        assert.equal(commandResults.size, 0)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  }
})

test('POST /chat sends accepted PNG attachment data and metadata in GPT payload', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-4o'

  const imageAttachment = createAcceptedPngAttachment({
    contentType: 'IMAGE/PNG',
  })
  const fetchCalls = mockContextFetch({
    providerFetch: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                message: 'gpt described the png',
              }),
            },
          },
        ],
      }),
    }),
  })

  try {
    const response = await postChat({
      content: 'describe the attached png',
      conversationId: 'gpt-png-image-payload-test',
      attachments: [imageAttachment],
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'gpt described the png')
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])

    const [url, options] = fetchCalls[1]
    assert.equal(url, 'http://openai.test/v1/chat/completions')
    const requestBody = JSON.parse(options.body)
    assert.equal(requestBody.model, 'gpt-4o')
    assert.deepEqual(requestBody.messages.at(-1), {
      role: 'user',
      content: [
        {
          type: 'text',
          text: 'describe the attached png',
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${imageAttachment.dataBase64}`,
          },
        },
      ],
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat rejects GPT image requests when OPENAI_MODEL is not vision-capable before context or provider calls', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-4'

  const imageAttachment = createAcceptedJpegAttachment()
  const fetchCalls = mockContextFetch({
    providerFetch: async () => {
      throw new Error('OpenAI provider must not be called for unsupported image models')
    },
  })

  try {
    const response = await postChat({
      content: 'describe the attached image',
      conversationId: 'gpt-image-unsupported-model-test',
      attachments: [imageAttachment],
    })

    assert.equal(response.statusCode, 502)
    const body = response.json()
    assert.equal(body.error, 'Provider Error')
    assert.equal(body.provider, 'gpt')
    assert.match(body.message, /Image understanding requires a multimodal provider\/model/)
    assert.match(body.message, /selected provider "gpt"/)
    assert.match(body.message, /OPENAI_MODEL "gpt-4"/)
    assert.match(body.message, /does not support image input/)
    assert.equal(fetchCalls.length, 0)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat rejects non-GPT image requests before context or provider calls', async (t) => {
  const cases = [
    {
      provider: 'codex',
      configure: () => {
        config.chatProvider = 'codex'
        config.codexModel = 'gpt-5.2'
      },
      expectedMessage: /Image understanding requires a multimodal provider\/model.*selected provider "codex".*does not support image input in Case v1/,
    },
    {
      provider: 'claude',
      configure: () => {
        config.chatProvider = 'claude'
      },
      expectedMessage: /Image understanding requires a multimodal provider\/model.*selected provider "claude".*does not support image input in Case v1/,
    },
    {
      provider: 'ollama',
      configure: () => {
        config.chatProvider = 'ollama'
        config.ollamaBaseUrl = 'http://ollama.test'
        config.ollamaModel = 'llava:latest'
      },
      expectedMessage: /Image understanding requires a multimodal provider\/model.*selected provider "ollama".*does not support image input in Case v1/,
    },
  ]

  for (const testCase of cases) {
    await t.test(testCase.provider, async () => {
      Object.assign(config, originalConfig)
      config.contextWorkerUrl = 'http://context.test'
      testCase.configure()

      const fetchCalls = []
      globalThis.fetch = async (...args) => {
        fetchCalls.push(args)
        throw new Error(`${testCase.provider} context/provider stack must not run for unsupported image requests`)
      }

      try {
        const response = await postChat({
          content: 'describe the attached image',
          conversationId: `${testCase.provider}-image-unsupported-provider-test`,
          attachments: [createAcceptedJpegAttachment()],
        })

        assert.equal(response.statusCode, 502)
        const body = response.json()
        assert.equal(body.error, 'Provider Error')
        assert.equal(body.provider, testCase.provider)
        assert.match(body.message, testCase.expectedMessage)
        assert.equal(fetchCalls.length, 0)
        assert.equal(commandResults.size, 0)
      } finally {
        globalThis.fetch = originalFetch
      }
    })
  }
})

test('POST /chat returns a cautious yellowing-leaves response for a plant image request', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-4o'

  const imageAttachment = createAcceptedJpegAttachment({
    filename: 'plant-yellowing-leaves.jpg',
    name: 'plant-yellowing-leaves.jpg',
    imageSource: 'content://case-picker/plant-yellowing-leaves.jpg',
  })
  const cautiousPlantResponse = 'From the photo, several plant leaves appear yellowing. I cannot be certain from the image alone, but water, light, or nutrient stress would be worth checking.'
  const fetchCalls = mockContextFetch({
    providerFetch: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                message: cautiousPlantResponse,
              }),
            },
          },
        ],
      }),
    }),
  })

  try {
    const response = await postChat({
      content: 'check this plant',
      conversationId: 'gpt-plant-yellowing-leaves-test',
      attachments: [imageAttachment],
    })

    assert.equal(response.statusCode, 200)
    const message = response.json().message.content
    assert.match(message, /leaves/)
    assert.match(message, /yellowing/)
    assert.match(message, /From the photo|appear|cannot be certain/)
    const definitivePlantDiagnosisLanguage = new RegExp([
      '\\bdefinitely\\b',
      '\\bcertainly\\b',
      '\\bclearly\\b',
      '\\bobviously\\b',
      '\\bconfirmed\\b',
      '\\bdiagnos(?:e|ed|is)\\b',
      '\\bproves?\\b',
      '\\bmust be\\b',
      '\\bis caused by\\b',
      '\\bhas (?:root rot|blight|fungal infection|bacterial infection|viral infection|nutrient deficiency|disease|pest infestation)\\b',
    ].join('|'), 'i')
    assert.doesNotMatch(message, definitivePlantDiagnosisLanguage)
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])

    const requestBody = JSON.parse(fetchCalls[1][1].body)
    assert.match(requestBody.messages[0].content, /visible yellowing leaves/)
    assert.match(requestBody.messages[0].content, /cautious observational language/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat guides receipt-like PNG responses toward receipt or document identification without exact OCR', async () => {
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'
  config.openaiModel = 'gpt-4o'

  const fixtureBytes = await readFile(new URL('./test-fixtures/store-receipt.png', import.meta.url))
  assert.ok(fixtureBytes.length < 5 * 1024 * 1024)
  const fixtureDataBase64 = fixtureBytes.toString('base64')
  const imageAttachment = createAcceptedPngAttachment({
    filename: 'store-receipt.png',
    name: 'store-receipt.png',
    dataBase64: fixtureDataBase64,
    file: fixtureDataBase64,
    imageSource: 'content://case-picker/store-receipt.png',
    sizeBytes: fixtureBytes.length,
  })
  const fetchCalls = mockContextFetch({
    providerFetch: async (_url, options) => {
      const requestBody = JSON.parse(options.body)
      assert.match(requestBody.messages[0].content, /receipt-like or document-like PNG images/)
      assert.match(requestBody.messages[0].content, /receipt or document/)
      assert.match(requestBody.messages[0].content, /exact OCR is not required/)
      assert.deepEqual(requestBody.messages.at(-1), {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'What kind of image is this?',
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${imageAttachment.dataBase64}`,
            },
          },
        ],
      })

      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  message: 'This looks like a receipt or document image with visible receipt or document content. I can describe the visible layout without exact OCR.',
                }),
              },
            },
          ],
        }),
      }
    },
  })

  try {
    const response = await postChat({
      content: 'What kind of image is this?',
      conversationId: 'gpt-receipt-like-png-behavior-test',
      attachments: [imageAttachment],
    })

    assert.equal(response.statusCode, 200)
    const message = response.json().message.content
    assert.match(message, /receipt or document image/i)
    assert.match(message, /receipt or document content/i)
    assert.match(message, /without exact OCR/i)
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])
    assert.equal(fetchCalls[1][0], 'http://openai.test/v1/chat/completions')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat with ollama returns HTTP 200 and Android message fields', async () => {
  config.chatProvider = 'ollama'
  config.ollamaBaseUrl = 'http://ollama.test'
  config.ollamaModel = 'ollama-test-model'

  const expectedMemoryBlock = formatSavedMemoryBlock([
    'User prefers concise replies.',
  ])

  const fetchCalls = mockContextFetch({
    context: 'Known facts about the user:\n- User prefers concise replies.',
    providerFetch: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        message: {
          content: 'ollama handled: hello',
        },
      }),
    }),
  })

  try {
    const response = await postChat({
      content: 'hello',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 200)

    const body = response.json()
    assert.deepEqual(Object.keys(body), ['message'])

    const { message } = body
    assert.equal(typeof message.id, 'string')
    assert.match(message.id, /^msg_[a-f0-9]{12}$/)
    assert.equal(typeof message.timestamp, 'string')
    assert.equal(Number.isNaN(Date.parse(message.timestamp)), false)
    assert.equal(message.content, 'ollama handled: hello')
    assert.equal(message.role, 'assistant')
    assert.equal(message.status, 'sent')
    assert.equal(message.executionStatus, null)
    assert.equal(message.hasCommands, false)
    assert.equal(message.executionId, null)
    assert.deepEqual(message.parsedContent, {
      text: message.content,
      commands: null,
    })
    assert.equal(commandResults.size, 0)

    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])

    const [url, options] = fetchCalls[1]
    assert.equal(url, 'http://ollama.test/api/chat')
    assert.equal(options.method, 'POST')
    assert.equal(options.headers['content-type'], 'application/json')

    const requestBody = JSON.parse(options.body)
    assert.equal(requestBody.model, 'ollama-test-model')
    assert.equal(requestBody.stream, false)
    assert.equal(requestBody.messages.at(-1).role, 'user')
    assert.equal(requestBody.messages.at(-1).content, 'hello')
    assert.match(requestBody.messages[0].content, /shell code blocks/)
    assert.equal(requestBody.messages[0].content.includes(expectedMemoryBlock), true)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat sends exact Ollama messages with injected curated saved memories', async () => {
  config.chatProvider = 'ollama'
  config.ollamaBaseUrl = 'http://ollama.test'
  config.ollamaModel = 'ollama-test-model'

  const savedMemories = [
    'User prefers concise replies.',
    'Project Case is a backend-first Android assistant.',
  ]
  const savedMemoryContext = [
    'Known facts about the user:',
    ...savedMemories.map(memory => `- ${memory}`),
  ].join('\n')
  const expectedMemoryBlock = formatSavedMemoryBlock(savedMemories)
  const expectedSystemPrompt = await buildExpectedOllamaSystemPrompt()

  const fetchCalls = mockContextFetch({
    context: savedMemoryContext,
    providerFetch: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        message: {
          content: 'ollama exact messages captured',
        },
      }),
    }),
  })

  try {
    const response = await postChat({
      content: 'what should ollama remember exactly?',
      conversationId: 'ollama-exact-memory-messages-test',
    })

    assert.equal(response.statusCode, 200)
    assert.equal(response.json().message.content, 'ollama exact messages captured')
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])

    const [url, options] = fetchCalls[1]
    assert.equal(url, 'http://ollama.test/api/chat')
    const requestBody = JSON.parse(options.body)
    const expectedSystemContent = [
      expectedSystemPrompt,
      expectedMemoryBlock,
    ].join('\n\n')

    assert.equal(expectedMemoryBlock, [
      'Known facts about the user:',
      '- User prefers concise replies.',
      '- Project Case is a backend-first Android assistant.',
      '',
      'Rules for using memory:',
      '- Use saved memories only as durable background facts when relevant.',
      '- Do not treat saved memories as recent conversation history or a transcript.',
    ].join('\n'))
    assert.equal(requestBody.messages[0].content, expectedSystemContent)
    assert.equal(
      requestBody.messages[0].content.slice(expectedSystemPrompt.length + 2),
      expectedMemoryBlock,
    )
    assert.deepEqual(requestBody, {
      model: 'ollama-test-model',
      messages: [
        {
          role: 'system',
          content: expectedSystemContent,
        },
        {
          role: 'user',
          content: 'what should ollama remember exactly?',
        },
      ],
      stream: false,
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat normalizes ollama shell commands into Android message shape', async () => {
  config.chatProvider = 'ollama'
  config.ollamaBaseUrl = 'http://ollama.test'
  config.ollamaModel = 'ollama-test-model'

  const providerContent = [
    'I will inspect the project files with elevated privileges.',
    '',
    '```shell {"description":"Inspect project files","timeout_seconds":45}',
    'sudo ls -la',
    '```',
  ].join('\n')

  const fetchCalls = mockContextFetch({
    providerFetch: async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        message: {
          content: providerContent,
        },
      }),
    }),
  })

  try {
    const response = await postChat({
      content: 'list files',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 200)

    const body = response.json()
    assert.deepEqual(Object.keys(body), ['message'])

    const { message } = body
    assert.equal(typeof message.id, 'string')
    assert.match(message.id, /^msg_[a-f0-9]{12}$/)
    assert.equal(typeof message.timestamp, 'string')
    assert.equal(Number.isNaN(Date.parse(message.timestamp)), false)
    assert.equal(message.content, providerContent)
    assert.equal(message.role, 'assistant')
    assert.equal(message.status, 'sent')
    assert.equal(message.executionStatus, 'queued')
    assert.equal(message.hasCommands, true)
    assert.equal(typeof message.executionId, 'string')
    assert.deepEqual(message.parsedContent, {
      text: providerContent,
      commands: [
        {
          command: 'sudo ls -la',
          description: 'Inspect project files',
          workingDirectory: null,
          requiresConfirmation: true,
          timeoutSeconds: 45,
        },
      ],
    })

    const queued = commandResults.get(message.executionId)
    assert.equal(queued.status, 'queued')
    assert.equal(queued.result, null)
    assert.deepEqual(queued.commands, message.parsedContent.commands)
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat returns HTTP 502 with normalized provider error when codex fails after startup', async () => {
  const fetchCalls = mockContextFetch()
  config.chatProvider = 'codex'
  config.codexPath = failingCodexPath

  const response = await postChat({
    content: 'hello',
    conversationId: 'test',
  })

  assert.equal(response.statusCode, 502)
  assert.deepEqual(response.json(), {
    error: 'Provider Error',
    message: 'Codex chat failed with exit code 78: Codex config is invalid: missing auth token',
    provider: 'codex',
  })
  assert.equal(commandResults.size, 0)
  assert.equal(fetchCalls.length, 1)
  assertContextFetch(fetchCalls[0])
})

test('POST /chat returns HTTP 502 with normalized provider error when gpt fails after startup', async () => {
  const fetchCalls = mockContextFetch({
    providerFetch: async () => ({
      ok: false,
      status: 503,
      text: async () => 'upstream unavailable',
    }),
  })
  config.chatProvider = 'gpt'
  config.openaiApiKey = 'test-openai-key'
  config.openaiBaseUrl = 'http://openai.test/v1'

  try {
    const response = await postChat({
      content: 'hello',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 502)
    assert.deepEqual(response.json(), {
      error: 'Provider Error',
      message: 'OpenAI API returned 503: upstream unavailable',
      provider: 'gpt',
    })
    assert.equal(commandResults.size, 0)
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('POST /chat returns HTTP 502 with normalized provider error when claude fails after startup', async () => {
  const fetchCalls = mockContextFetch()
  config.chatProvider = 'claude'
  config.claudePath = failingClaudePath

  const response = await postChat({
    content: 'hello',
    conversationId: 'test',
  })

  assert.equal(response.statusCode, 502)
  assert.deepEqual(response.json(), {
    error: 'Provider Error',
    message: 'Claude Code chat failed with exit code 78: Claude Code config is invalid: missing auth token',
    provider: 'claude',
  })
  assert.equal(commandResults.size, 0)
  assert.equal(fetchCalls.length, 1)
  assertContextFetch(fetchCalls[0])
})

test('POST /chat returns HTTP 502 with normalized provider error when ollama fails after startup', async () => {
  const fetchCalls = mockContextFetch({
    providerFetch: async () => ({
      ok: false,
      status: 500,
      text: async () => 'daemon unavailable',
    }),
  })
  config.chatProvider = 'ollama'
  config.ollamaBaseUrl = 'http://ollama.test'

  try {
    const response = await postChat({
      content: 'hello',
      conversationId: 'test',
    })

    assert.equal(response.statusCode, 502)
    assert.deepEqual(response.json(), {
      error: 'Provider Error',
      message: 'Ollama API returned 500: daemon unavailable',
      provider: 'ollama',
    })
    assert.equal(commandResults.size, 0)
    assert.equal(fetchCalls.length, 2)
    assertContextFetch(fetchCalls[0])
  } finally {
    globalThis.fetch = originalFetch
  }
})
