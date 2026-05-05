import 'dotenv/config'
import Fastify from 'fastify'
import crypto from 'crypto'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import zlib from 'node:zlib'
import { DEFAULT_CHAT_PROVIDER, selectStartupChatProvider } from './providerMenu.js'
import { getSelectedChatProviderCapabilities } from './providerCapabilities.js'
import { isExecutableAvailable, validateSelectedChatProvider as validateChatProviderConfig } from './providerValidation.js'
import {
  canonicalMemoryText,
  extractSavedMemoriesFromContext as parseMemoryContext,
  formatSavedMemoryBlock,
  isLowValueMemory,
  LEGACY_SAVED_MEMORY_HEADER,
  normalizeMemoryRecord,
  normalizeMemoryText,
  selectMemoriesForContext,
} from './memory-v2.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, '..')

// Configuration
const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  chatProvider: process.env.CHAT_PROVIDER || DEFAULT_CHAT_PROVIDER,
  codexPath: process.env.CODEX_PATH || 'codex',
  codexModel: process.env.CODEX_MODEL || '',
  codexProfile: process.env.CODEX_PROFILE || '',
  codexValidationTimeout: parseInt(process.env.CODEX_VALIDATION_TIMEOUT || '30', 10),
  codexChatTimeout: parseInt(process.env.CODEX_CHAT_TIMEOUT || '120', 10),
  claudePath: process.env.CLAUDE_PATH || 'claude',
  claudeChatTimeout: parseInt(process.env.CLAUDE_CHAT_TIMEOUT || '120', 10),
  claudeValidationTimeout: parseInt(process.env.CLAUDE_VALIDATION_TIMEOUT || '30', 10),
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o',
  openaiTimeout: parseInt(process.env.OPENAI_TIMEOUT || '120', 10),
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'gpt-oss-20b',
  ollamaTimeout: parseInt(process.env.OLLAMA_TIMEOUT || '120', 10),
  contextWorkerUrl: process.env.CONTEXT_WORKER_URL || '',
  memoryDataDir: process.env.MEMORY_DATA_DIR || path.join(__dirname, 'data'),
  memoryFileName: process.env.MEMORY_FILE || 'memories.json',
  memoryStoreMaxEntries: parseInt(process.env.MEMORY_MAX_MEMORIES || '200', 10),
  memoryLoadTimeout: parseInt(process.env.MEMORY_LOAD_TIMEOUT || '5', 10),
  memoryMaxChars: parseInt(process.env.MEMORY_MAX_CHARS || '300', 10),
  memoryMaxEntries: parseInt(process.env.MEMORY_MAX_ENTRIES || '10', 10),
}

async function validateSelectedChatProvider(logger) {
  return validateChatProviderConfig(config, logger)
}

const CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024
const CHAT_IMAGE_ATTACHMENT_MAX_BASE64_BYTES = Math.ceil(CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES / 3) * 4
const CHAT_IMAGE_ATTACHMENT_MAX_REQUEST_BODY_BYTES = CHAT_IMAGE_ATTACHMENT_MAX_BASE64_BYTES * 2 + 512 * 1024

function validateContextWorkerUrl(options = {}, logger = fastify.log) {
  const hasExplicitUrl = options && typeof options === 'object' && Object.hasOwn(options, 'contextWorkerUrl')
  const contextWorkerUrl = hasExplicitUrl
    ? options.contextWorkerUrl
    : config.contextWorkerUrl
  const normalizedUrl = typeof contextWorkerUrl === 'string' ? contextWorkerUrl.trim() : ''
  if (!normalizedUrl) {
    throw new Error('CONTEXT_WORKER_URL is required because the context worker is a required dependency')
  }

  config.contextWorkerUrl = normalizedUrl
  logger.info?.({ contextWorkerUrl: normalizedUrl }, 'Context worker URL validated')
}

async function validateContextWorkerReachability(logger = fastify.log, { fetchImpl = globalThis.fetch } = {}) {
  validateContextWorkerUrl({}, logger)

  if (typeof fetchImpl !== 'function') {
    throw new Error('Context worker startup validation failed: fetch is not available')
  }

  let response
  try {
    response = await fetchImpl(buildContextWorkerUrl('/health'), {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: createTimeoutSignal(config.memoryLoadTimeout),
    })
  } catch (err) {
    const message = err instanceof Error && err.message ? err.message : String(err)
    const startupError = new Error(`Context worker startup validation failed: ${config.contextWorkerUrl} is unreachable: ${message}`)
    startupError.cause = err
    throw startupError
  }

  if (!response.ok) {
    throw new Error(`Context worker startup validation failed: ${config.contextWorkerUrl} returned HTTP ${response.status}`)
  }

  logger.info?.({ contextWorkerUrl: config.contextWorkerUrl }, 'Context worker reachable')
}

function configuredContextWorkerUrl() {
  return typeof config.contextWorkerUrl === 'string' ? config.contextWorkerUrl.trim() : ''
}

const fastify = Fastify({
  logger: { level: process.env.LOG_LEVEL || 'info' },
  genReqId: () => crypto.randomUUID(),
  bodyLimit: CHAT_IMAGE_ATTACHMENT_MAX_REQUEST_BODY_BYTES,
})

const ROBOTS_TAG = 'noindex, nofollow, noarchive'
const CRAWLER_USER_AGENT_PATTERN = /(bot|crawler|spider|slurp|bingpreview|facebookexternalhit)/i
const CHAT_IMAGE_ATTACHMENT_MIME_TYPES = new Set(['image/jpeg', 'image/png'])
const CHAT_IMAGE_ATTACHMENT_UNSUPPORTED_MIME_TYPE_MESSAGES = new Map([
  ['application/pdf', 'PDF files are not supported for image understanding'],
  ['image/heic', 'HEIC files are not supported for image understanding'],
  ['image/heif', 'HEIF files are not supported for image understanding'],
])
const CHAT_IMAGE_ATTACHMENT_SOURCE = 'file-picker'
const CHAT_IMAGE_ATTACHMENT_ENCODING = 'base64'
const CHAT_IMAGE_ATTACHMENT_REQUEST_FIELDS = new Set([
  'type',
  'mimeType',
  'contentType',
  'dataBase64',
  'file',
  'encoding',
  'imageSource',
  'name',
  'filename',
  'sizeBytes',
  'source',
])
const CHAT_IMAGE_ATTACHMENT_REQUIRED_FIELDS = [
  'type',
  'mimeType',
  'contentType',
  'dataBase64',
  'file',
  'encoding',
  'imageSource',
  'name',
  'sizeBytes',
  'source',
]
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const PNG_IHDR_LENGTH = 13
const PNG_CHUNK_HEADER_BYTES = 8
const PNG_CHUNK_CRC_BYTES = 4
const PNG_COLOR_TYPE_CHANNELS = new Map([
  [0, 1],
  [2, 3],
  [3, 1],
  [4, 2],
  [6, 4],
])
const PNG_ADAM7_PASSES = [
  { x: 0, y: 0, dx: 8, dy: 8 },
  { x: 4, y: 0, dx: 8, dy: 8 },
  { x: 0, y: 4, dx: 4, dy: 8 },
  { x: 2, y: 0, dx: 4, dy: 4 },
  { x: 0, y: 2, dx: 2, dy: 4 },
  { x: 1, y: 0, dx: 2, dy: 2 },
  { x: 0, y: 1, dx: 1, dy: 2 },
]
const PNG_CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1)
  }

  return value >>> 0
})

function isCrawlerRequest(request) {
  const userAgent = String(request.headers['user-agent'] || '')
  return CRAWLER_USER_AGENT_PATTERN.test(userAgent)
}

fastify.addHook('onRequest', async (request, reply) => {
  reply.header('X-Robots-Tag', ROBOTS_TAG)

  if (request.url.split('?')[0] === '/robots.txt') {
    return
  }

  if (isCrawlerRequest(request)) {
    return reply.code(403).send({
      error: 'Forbidden',
      message: 'Crawler access is not allowed',
    })
  }
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

class MemoryDependencyError extends Error {
  constructor(message, options = {}) {
    const hasOptionsShape = options && typeof options === 'object' && (
      Object.hasOwn(options, 'cause') ||
      Object.hasOwn(options, 'provider') ||
      Object.hasOwn(options, 'stage')
    )
    const resolvedOptions = hasOptionsShape ? options : { cause: options }
    super(message)
    this.name = 'MemoryDependencyError'
    this.cause = resolvedOptions.cause
    this.stage = resolvedOptions.stage || 'load'
    if (resolvedOptions.provider) {
      this.provider = resolvedOptions.provider
    }
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

function memoryErrorMessage(err) {
  if (err instanceof Error && err.message) {
    return err.message
  }

  if (typeof err === 'string' && err.trim()) {
    return err.trim()
  }

  return 'Memory context load failed'
}

function extractContextWorkerErrorMessage(responseText) {
  const trimmed = String(responseText || '').trim()
  if (!trimmed) {
    return ''
  }

  try {
    const parsed = JSON.parse(trimmed)
    for (const field of ['message', 'detail', 'error']) {
      if (typeof parsed?.[field] === 'string' && parsed[field].trim()) {
        return parsed[field].trim().slice(0, 500)
      }
    }

    return ''
  } catch {
    // Fall back to the raw response body below.
  }

  return trimmed.slice(0, 500)
}

async function readContextWorkerErrorMessage(response) {
  if (typeof response?.text !== 'function') {
    return ''
  }

  try {
    return extractContextWorkerErrorMessage(await response.text())
  } catch {
    return ''
  }
}

function appendContextWorkerErrorMessage(message, detail) {
  return detail ? `${message}: ${detail}` : message
}

function normalizeMemoryLoadMessage(err) {
  const message = memoryErrorMessage(err)
  return message.startsWith('Memory context load failed')
    ? message
    : `Memory context load failed: ${message}`
}

function asProviderMemoryLoadError(provider, err) {
  if (err instanceof MemoryDependencyError && err.provider === provider) {
    return err
  }

  return new MemoryDependencyError(normalizeMemoryLoadMessage(err), {
    cause: err,
    provider,
    stage: err?.stage || 'load',
  })
}

function buildMemoryErrorResponse(err, provider) {
  const resolvedProvider = err?.provider || provider
  const response = {
    error: 'Memory Error',
    message: memoryErrorMessage(err),
  }

  if (resolvedProvider) {
    response.provider = resolvedProvider
  }

  return response
}

function logMemoryDependencyFailure(logger, err, { provider, conversationId } = {}) {
  logger?.error?.({
    contextWorkerUrl: config.contextWorkerUrl,
    provider: err?.provider || provider,
    conversationId,
    failureStage: err?.stage || 'load',
    error: memoryErrorMessage(err),
  }, 'Memory dependency failed')
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0
}

function normalizeChatImageMimeType(value) {
  if (typeof value !== 'string') {
    return null
  }

  const mimeType = value.trim().toLowerCase()
  return CHAT_IMAGE_ATTACHMENT_MIME_TYPES.has(mimeType) ? mimeType : null
}

function unsupportedChatImageMimeTypeMessage(rawMimeType, pathPrefix, fieldName = 'mimeType') {
  const baseMessage = `${pathPrefix}.${fieldName} must be image/jpeg or image/png`
  if (typeof rawMimeType === 'string') {
    const unsupportedMessage = CHAT_IMAGE_ATTACHMENT_UNSUPPORTED_MIME_TYPE_MESSAGES.get(rawMimeType.trim().toLowerCase())
    if (unsupportedMessage) {
      return `${baseMessage}; unsupported file type: ${unsupportedMessage}`
    }
  }

  return baseMessage
}

function validationMessageField(message) {
  if (typeof message !== 'string') {
    return null
  }

  const trimmed = message.trim()
  if (trimmed.startsWith('attachments must') || trimmed.startsWith('exactly one image attachment')) {
    return 'attachments'
  }

  const attachmentFieldMatch = trimmed.match(/^(attachments\[\d+\](?:\.[A-Za-z][A-Za-z0-9]*)?)/)
  if (attachmentFieldMatch) {
    return attachmentFieldMatch[1]
  }

  if (trimmed.startsWith('content ')) {
    return 'content'
  }

  if (trimmed.startsWith('conversationId ')) {
    return 'conversationId'
  }

  return null
}

function isImageAttachmentValidationMessage(message) {
  if (typeof message !== 'string') {
    return false
  }

  return message.startsWith('attachments') ||
    message.startsWith('exactly one image attachment') ||
    message.includes('image/jpeg') ||
    message.includes('image/png') ||
    message.includes('image payload') ||
    message.includes('image attachments')
}

function buildValidationErrorResponse(message) {
  const code = isImageAttachmentValidationMessage(message)
    ? 'CHAT_IMAGE_ATTACHMENT_VALIDATION_FAILED'
    : 'CHAT_REQUEST_VALIDATION_FAILED'
  const field = validationMessageField(message)
  const validationError = {
    code,
    message,
    ...(field ? { field } : {}),
  }

  return {
    error: 'Bad Request',
    code,
    message,
    validation: {
      accepted: false,
      error: validationError,
    },
    details: [validationError],
  }
}

function normalizeBase64ImageData(value) {
  if (!isNonEmptyString(value)) {
    return null
  }

  const dataBase64 = value.trim()
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64)) {
    return null
  }

  const decoded = Buffer.from(dataBase64, 'base64')
  if (decoded.length === 0) {
    return null
  }

  const canonicalInput = dataBase64.replace(/=+$/, '')
  const canonicalDecoded = decoded.toString('base64').replace(/=+$/, '')
  if (canonicalInput !== canonicalDecoded) {
    return null
  }

  return {
    dataBase64,
    decoded,
  }
}

function estimateBase64DecodedSizeBytes(value) {
  if (!isNonEmptyString(value)) {
    return null
  }

  const dataBase64 = value.trim()
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(dataBase64)) {
    return null
  }

  const paddingBytes = dataBase64.endsWith('==')
    ? 2
    : dataBase64.endsWith('=')
      ? 1
      : 0
  const decodedSizeBytes = Math.floor((dataBase64.length * 3) / 4) - paddingBytes

  return decodedSizeBytes > 0 ? decodedSizeBytes : null
}

function hasJpegSignature(buffer) {
  return buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
}

function isJpegStartOfFrameMarker(marker) {
  return [
    0xc0,
    0xc1,
    0xc2,
    0xc3,
    0xc5,
    0xc6,
    0xc7,
    0xc9,
    0xca,
    0xcb,
    0xcd,
    0xce,
    0xcf,
  ].includes(marker)
}

function readJpegEntropyCodedSegmentEndOffset(buffer, scanDataOffset) {
  let offset = scanDataOffset
  let sawEntropyData = false

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      sawEntropyData = true
      offset += 1
      continue
    }

    while (buffer[offset] === 0xff) {
      offset += 1
    }

    if (offset >= buffer.length) {
      return null
    }

    const marker = buffer[offset]
    if (marker === 0x00) {
      sawEntropyData = true
      offset += 1
      continue
    }

    if (marker >= 0xd0 && marker <= 0xd7) {
      offset += 1
      continue
    }

    if (marker === 0xd9) {
      return sawEntropyData ? offset + 1 : null
    }

    const segmentLengthOffset = offset + 1
    if (segmentLengthOffset + 2 > buffer.length) {
      return null
    }

    const segmentLength = buffer.readUInt16BE(segmentLengthOffset)
    if (segmentLength < 2) {
      return null
    }

    const segmentEndOffset = segmentLengthOffset + segmentLength
    if (segmentEndOffset > buffer.length) {
      return null
    }

    offset = segmentEndOffset
  }

  return null
}

function readJpegImageEndOffset(buffer) {
  if (!hasJpegSignature(buffer)) {
    return null
  }

  let offset = 2
  let sawFrameWithDimensions = false

  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      return null
    }

    while (buffer[offset] === 0xff) {
      offset += 1
    }

    if (offset >= buffer.length) {
      return null
    }

    const marker = buffer[offset]
    offset += 1

    if (marker === 0x00 || marker === 0xd9) {
      return null
    }

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      continue
    }

    if (offset + 2 > buffer.length) {
      return null
    }

    const segmentLength = buffer.readUInt16BE(offset)
    if (segmentLength < 2) {
      return null
    }

    const segmentDataOffset = offset + 2
    const segmentEndOffset = offset + segmentLength
    if (segmentEndOffset > buffer.length) {
      return null
    }

    if (isJpegStartOfFrameMarker(marker)) {
      if (segmentLength < 8) {
        return null
      }

      const height = buffer.readUInt16BE(segmentDataOffset + 1)
      const width = buffer.readUInt16BE(segmentDataOffset + 3)
      const componentCount = buffer[segmentDataOffset + 5]
      if (segmentLength !== 8 + componentCount * 3) {
        return null
      }

      sawFrameWithDimensions = width > 0 && height > 0 && componentCount > 0
    }

    if (marker === 0xda) {
      if (segmentLength < 6) {
        return null
      }

      const scanComponentCount = buffer[segmentDataOffset]
      if (segmentLength !== 6 + scanComponentCount * 2) {
        return null
      }

      if (!sawFrameWithDimensions) {
        return null
      }

      return readJpegEntropyCodedSegmentEndOffset(buffer, segmentEndOffset)
    }

    offset = segmentEndOffset
  }

  return null
}

function hasReadableJpegStructure(buffer) {
  return readJpegImageEndOffset(buffer) !== null
}

function normalizeDecodedImageDataForMimeType(buffer, mimeType) {
  if (mimeType !== 'image/jpeg') {
    return buffer
  }

  const imageEndOffset = readJpegImageEndOffset(buffer)
  if (imageEndOffset === null) {
    return null
  }

  return imageEndOffset < buffer.length
    ? buffer.subarray(0, imageEndOffset)
    : buffer
}

function hasPngSignature(buffer) {
  return buffer.length >= PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every((byte, index) => buffer[index] === byte)
}

function isPngChunkType(chunkType) {
  return /^[A-Za-z]{4}$/.test(chunkType)
}

function pngCrc32(buffer, startOffset, endOffset) {
  let crc = 0xffffffff

  for (let offset = startOffset; offset < endOffset; offset += 1) {
    crc = PNG_CRC_TABLE[(crc ^ buffer[offset]) & 0xff] ^ (crc >>> 8)
  }

  return (crc ^ 0xffffffff) >>> 0
}

function readValidPngIhdr(buffer, dataOffset) {
  const width = buffer.readUInt32BE(dataOffset)
  const height = buffer.readUInt32BE(dataOffset + 4)
  const bitDepth = buffer[dataOffset + 8]
  const colorType = buffer[dataOffset + 9]
  const compressionMethod = buffer[dataOffset + 10]
  const filterMethod = buffer[dataOffset + 11]
  const interlaceMethod = buffer[dataOffset + 12]
  const validBitDepthsByColorType = new Map([
    [0, new Set([1, 2, 4, 8, 16])],
    [2, new Set([8, 16])],
    [3, new Set([1, 2, 4, 8])],
    [4, new Set([8, 16])],
    [6, new Set([8, 16])],
  ])

  const isValid = width > 0 &&
    height > 0 &&
    validBitDepthsByColorType.get(colorType)?.has(bitDepth) &&
    compressionMethod === 0 &&
    filterMethod === 0 &&
    (interlaceMethod === 0 || interlaceMethod === 1)

  if (!isValid) {
    return null
  }

  return {
    width,
    height,
    bitDepth,
    colorType,
    interlaceMethod,
  }
}

function pngScanlineDataBytes(width, bitDepth, colorType) {
  const channels = PNG_COLOR_TYPE_CHANNELS.get(colorType)
  if (!channels) {
    return null
  }

  return Math.ceil(width * bitDepth * channels / 8)
}

function pngAdam7PassDimension(size, start, step) {
  return size > start ? Math.ceil((size - start) / step) : 0
}

function expectedPngDecodedByteLength(metadata) {
  if (metadata.interlaceMethod === 0) {
    const scanlineDataBytes = pngScanlineDataBytes(
      metadata.width,
      metadata.bitDepth,
      metadata.colorType,
    )

    return scanlineDataBytes === null
      ? null
      : metadata.height * (scanlineDataBytes + 1)
  }

  let expectedLength = 0

  for (const pass of PNG_ADAM7_PASSES) {
    const passWidth = pngAdam7PassDimension(metadata.width, pass.x, pass.dx)
    const passHeight = pngAdam7PassDimension(metadata.height, pass.y, pass.dy)

    if (passWidth === 0 || passHeight === 0) {
      continue
    }

    const scanlineDataBytes = pngScanlineDataBytes(
      passWidth,
      metadata.bitDepth,
      metadata.colorType,
    )
    if (scanlineDataBytes === null) {
      return null
    }

    expectedLength += passHeight * (scanlineDataBytes + 1)
  }

  return expectedLength
}

function hasValidPngFilterBytes(decoded, metadata) {
  let offset = 0
  const validateRows = (width, height) => {
    if (width === 0 || height === 0) {
      return true
    }

    const scanlineDataBytes = pngScanlineDataBytes(width, metadata.bitDepth, metadata.colorType)
    if (scanlineDataBytes === null) {
      return false
    }

    for (let row = 0; row < height; row += 1) {
      if (offset >= decoded.length || decoded[offset] > 4) {
        return false
      }

      offset += scanlineDataBytes + 1
    }

    return true
  }

  if (metadata.interlaceMethod === 0) {
    return validateRows(metadata.width, metadata.height) && offset === decoded.length
  }

  for (const pass of PNG_ADAM7_PASSES) {
    const passWidth = pngAdam7PassDimension(metadata.width, pass.x, pass.dx)
    const passHeight = pngAdam7PassDimension(metadata.height, pass.y, pass.dy)

    if (!validateRows(passWidth, passHeight)) {
      return false
    }
  }

  return offset === decoded.length
}

function hasDecodablePngImageData(idatData, metadata) {
  const expectedDecodedLength = expectedPngDecodedByteLength(metadata)
  if (
    expectedDecodedLength === null ||
    !Number.isSafeInteger(expectedDecodedLength) ||
    expectedDecodedLength < 0
  ) {
    return false
  }

  let decoded
  try {
    decoded = zlib.inflateSync(idatData, {
      maxOutputLength: expectedDecodedLength + 1,
    })
  } catch {
    return false
  }

  return decoded.length === expectedDecodedLength && hasValidPngFilterBytes(decoded, metadata)
}

function hasReadablePngStructure(buffer) {
  if (!hasPngSignature(buffer)) {
    return false
  }

  let offset = PNG_SIGNATURE.length
  let metadata = null
  let sawIdat = false
  let sawChunkAfterIdat = false
  const idatChunks = []

  while (offset < buffer.length) {
    if (offset + PNG_CHUNK_HEADER_BYTES + PNG_CHUNK_CRC_BYTES > buffer.length) {
      return false
    }

    const chunkLength = buffer.readUInt32BE(offset)
    const chunkTypeOffset = offset + 4
    const chunkType = buffer.toString('ascii', chunkTypeOffset, chunkTypeOffset + 4)
    const chunkDataOffset = offset + PNG_CHUNK_HEADER_BYTES
    const chunkDataEndOffset = chunkDataOffset + chunkLength
    const chunkEndOffset = chunkDataEndOffset + PNG_CHUNK_CRC_BYTES

    if (!isPngChunkType(chunkType) || chunkEndOffset > buffer.length) {
      return false
    }

    if (pngCrc32(buffer, chunkTypeOffset, chunkDataEndOffset) !== buffer.readUInt32BE(chunkDataEndOffset)) {
      return false
    }

    if (!metadata) {
      if (chunkType !== 'IHDR' || chunkLength !== PNG_IHDR_LENGTH) {
        return false
      }

      metadata = readValidPngIhdr(buffer, chunkDataOffset)
      if (!metadata) {
        return false
      }
    } else if (chunkType === 'IHDR') {
      return false
    }

    if (chunkType === 'IDAT' && chunkLength > 0) {
      if (sawChunkAfterIdat) {
        return false
      }

      sawIdat = true
      idatChunks.push(buffer.subarray(chunkDataOffset, chunkDataEndOffset))
    } else if (sawIdat && chunkType !== 'IEND') {
      sawChunkAfterIdat = true
    }

    if (chunkType === 'IEND') {
      return chunkLength === 0 &&
        metadata !== null &&
        sawIdat &&
        chunkEndOffset === buffer.length &&
        hasDecodablePngImageData(Buffer.concat(idatChunks), metadata)
    }

    offset = chunkEndOffset
  }

  return false
}

function hasReadableImageData(buffer, mimeType) {
  if (mimeType === 'image/jpeg') {
    return hasReadableJpegStructure(buffer)
  }

  if (mimeType === 'image/png') {
    return hasReadablePngStructure(buffer)
  }

  return false
}

function validateChatImageAttachment(attachment, index = 0) {
  const pathPrefix = `attachments[${index}]`
  if (!isPlainObject(attachment)) {
    return `${pathPrefix} must be an object`
  }

  const unsupportedField = Object.keys(attachment).find(field => !CHAT_IMAGE_ATTACHMENT_REQUEST_FIELDS.has(field))
  if (unsupportedField) {
    return `${pathPrefix}.${unsupportedField} is not supported for image attachments`
  }

  if (attachment.dataBase64 === undefined && attachment.file === undefined) {
    return `${pathPrefix}.dataBase64 and ${pathPrefix}.file is required`
  }

  for (const field of CHAT_IMAGE_ATTACHMENT_REQUIRED_FIELDS) {
    if (attachment[field] === undefined) {
      return `${pathPrefix}.${field} is required`
    }
  }

  if (attachment.type !== 'image') {
    return `${pathPrefix}.type must be "image"`
  }

  if (attachment.source !== CHAT_IMAGE_ATTACHMENT_SOURCE) {
    return `${pathPrefix}.source must be "${CHAT_IMAGE_ATTACHMENT_SOURCE}"`
  }

  const mimeType = normalizeChatImageMimeType(attachment.mimeType)
  if (!mimeType) {
    return unsupportedChatImageMimeTypeMessage(attachment.mimeType, pathPrefix)
  }

  const contentType = normalizeChatImageMimeType(attachment.contentType)
  if (!contentType) {
    return unsupportedChatImageMimeTypeMessage(attachment.contentType, pathPrefix, 'contentType')
  }

  if (mimeType !== contentType) {
    return `${pathPrefix}.mimeType and ${pathPrefix}.contentType must match`
  }

  if (attachment.encoding !== CHAT_IMAGE_ATTACHMENT_ENCODING) {
    return `${pathPrefix}.encoding must be "${CHAT_IMAGE_ATTACHMENT_ENCODING}"`
  }

  if (attachment.dataBase64 === null && attachment.file === null) {
    return `${pathPrefix}.dataBase64 and ${pathPrefix}.file is required`
  }

  if (attachment.dataBase64 === null) {
    return `${pathPrefix}.dataBase64 is required`
  }

  if (attachment.file === null) {
    return `${pathPrefix}.file is required`
  }

  if (attachment.dataBase64 !== attachment.file) {
    return `${pathPrefix}.dataBase64 and ${pathPrefix}.file must match`
  }

  if (!Number.isInteger(attachment.sizeBytes) || attachment.sizeBytes <= 0) {
    return `${pathPrefix}.sizeBytes must be a positive integer`
  }

  if (attachment.sizeBytes > CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES) {
    return `${pathPrefix}.sizeBytes must be 5MB or smaller`
  }

  const decodedSizeBytes = estimateBase64DecodedSizeBytes(attachment.dataBase64)
  if (decodedSizeBytes === null) {
    return `${pathPrefix}.dataBase64 and ${pathPrefix}.file must be valid non-empty base64 image data`
  }

  if (decodedSizeBytes > CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES) {
    return `${pathPrefix}.dataBase64 and ${pathPrefix}.file decoded image payload must be 5MB or smaller`
  }

  if (decodedSizeBytes !== attachment.sizeBytes) {
    return `${pathPrefix}.sizeBytes must match decoded image data size`
  }

  const normalizedImageData = normalizeBase64ImageData(attachment.dataBase64)
  if (!normalizedImageData) {
    return `${pathPrefix}.dataBase64 and ${pathPrefix}.file must be valid non-empty base64 image data`
  }

  if (!hasReadableImageData(normalizedImageData.decoded, mimeType)) {
    return `${pathPrefix}.dataBase64 or ${pathPrefix}.file must contain readable ${mimeType} image data`
  }

  if (!isNonEmptyString(attachment.imageSource)) {
    return `${pathPrefix}.imageSource must be a non-empty string`
  }

  if (
    attachment.filename !== undefined &&
    attachment.name !== undefined &&
    attachment.filename !== attachment.name
  ) {
    return `${pathPrefix}.filename and ${pathPrefix}.name must match`
  }

  if (!isNonEmptyString(attachment.name)) {
    return `${pathPrefix}.name must be a non-empty string`
  }

  if (attachment.filename !== undefined && !isNonEmptyString(attachment.filename)) {
    return `${pathPrefix}.filename must be a non-empty string when provided`
  }

  return null
}

function validateChatAttachments(body) {
  if (body.attachments === undefined) {
    return null
  }

  if (!Array.isArray(body.attachments)) {
    return 'attachments must be an array when provided'
  }

  if (body.attachments.length !== 1) {
    return 'exactly one image attachment is supported for v1'
  }

  return validateChatImageAttachment(body.attachments[0], 0)
}

function validateNormalizedChatImageAttachment(attachment, index = 0) {
  const pathPrefix = `attachments[${index}]`
  if (!isPlainObject(attachment) || !Buffer.isBuffer(attachment.bytes)) {
    return `${pathPrefix} must be an accepted image attachment`
  }

  const { bytes, ...requestAttachment } = attachment
  const validationError = validateChatImageAttachment(requestAttachment, index)
  if (validationError) {
    return validationError
  }

  const normalizedImageData = normalizeBase64ImageData(requestAttachment.dataBase64)
  if (!normalizedImageData || !bytes.equals(normalizedImageData.decoded)) {
    return `${pathPrefix}.bytes must match decoded image data`
  }

  return null
}

function validateChatAttachmentsForProviderDispatch(body) {
  if (body?.attachments === undefined) {
    return null
  }

  if (!Array.isArray(body.attachments)) {
    return 'attachments must be an array when provided'
  }

  if (body.attachments.length !== 1) {
    return 'exactly one image attachment is supported for v1'
  }

  const [attachment] = body.attachments
  if (isPlainObject(attachment) && Object.hasOwn(attachment, 'bytes')) {
    return validateNormalizedChatImageAttachment(attachment, 0)
  }

  return validateChatImageAttachment(attachment, 0)
}

function normalizeChatImageAttachment(attachment) {
  if (!attachment) {
    return null
  }

  const normalizedImageData = normalizeBase64ImageData(attachment.dataBase64 ?? attachment.file)
  if (!normalizedImageData) {
    return null
  }

  const mimeType = normalizeChatImageMimeType(attachment.mimeType ?? attachment.contentType)
  if (!mimeType) {
    return null
  }

  const normalizedBytes = normalizeDecodedImageDataForMimeType(normalizedImageData.decoded, mimeType)
  if (!normalizedBytes) {
    return null
  }

  const filename = (attachment.filename ?? attachment.name).trim()
  const dataBase64 = normalizedBytes.toString('base64')

  return {
    type: 'image',
    mimeType,
    contentType: mimeType,
    filename,
    name: filename,
    dataBase64,
    file: dataBase64,
    encoding: CHAT_IMAGE_ATTACHMENT_ENCODING,
    bytes: normalizedBytes,
    imageSource: attachment.imageSource.trim(),
    sizeBytes: normalizedBytes.length,
    source: CHAT_IMAGE_ATTACHMENT_SOURCE,
  }
}

function getChatImageAttachment(requestBody) {
  if (!Array.isArray(requestBody.attachments) || requestBody.attachments.length === 0) {
    return null
  }

  return normalizeChatImageAttachment(requestBody.attachments[0])
}

function normalizeChatRequestBody(body) {
  const imageAttachment = getChatImageAttachment(body)

  return {
    content: body.content,
    ...(body.conversationId !== undefined ? { conversationId: body.conversationId } : {}),
    ...(imageAttachment ? { attachments: [imageAttachment] } : {}),
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

  const attachmentValidationError = validateChatAttachments(body)
  if (attachmentValidationError) {
    return attachmentValidationError
  }

  return null
}

function buildContextWorkerUrl(pathname = '') {
  return `${config.contextWorkerUrl.replace(/\/$/, '')}${pathname}`
}

function createTimeoutSignal(timeoutSeconds) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(timeoutSeconds * 1000)
  }

  return undefined
}

const CONTEXT_RESPONSE_FIELDS = new Set(['context', 'memory_count'])
const PROVIDER_MEMORY_MAX_ENTRIES = 10

function invalidContextDataError(stage = 'load') {
  const prefix = stage === 'inject'
    ? 'Memory context injection failed'
    : 'Memory context load failed'
  return new MemoryDependencyError(`${prefix}: context worker returned invalid context data`, { stage })
}

function hasOnlySupportedFields(record, supportedFields) {
  return Object.keys(record).every(field => supportedFields.has(field))
}

function validateLoadedMemoryText(value, stage = 'load') {
  if (typeof value !== 'string') {
    throw invalidContextDataError(stage)
  }

  const normalized = normalizeMemoryText(value)
  if (!normalized || normalized.length > configuredMemoryMaxChars()) {
    throw invalidContextDataError(stage)
  }

  return normalized
}

function extractSavedMemoriesFromContext(context, stage = 'load') {
  try {
    return parseMemoryContext(context, value => validateLoadedMemoryText(value, stage))
  } catch {
    throw invalidContextDataError(stage)
  }
}

function isLegacyMemoryContext(context) {
  return typeof context === 'string' && context.trim().startsWith(LEGACY_SAVED_MEMORY_HEADER)
}

function formatLoadedMemoryBlock(context, savedMemories) {
  const trimmedContext = typeof context === 'string' ? context.trim() : ''
  if (!trimmedContext) {
    return ''
  }

  return isLegacyMemoryContext(trimmedContext)
    ? formatSavedMemoryBlock(savedMemories)
    : trimmedContext
}

class FileMemoryStore {
  constructor(configRef) {
    this.config = configRef
    this.writeQueue = Promise.resolve()
  }

  memoryFilePath() {
    return path.join(this.config.memoryDataDir, this.config.memoryFileName)
  }

  normalizeStoredMemory(record) {
    return normalizeMemoryRecord(record, { source: 'hub' })
  }

  async readMemories() {
    let raw
    try {
      raw = await readFile(this.memoryFilePath(), 'utf8')
    } catch (err) {
      if (err?.code === 'ENOENT') {
        return []
      }
      throw err
    }

    let parsed
    try {
      parsed = JSON.parse(raw)
    } catch {
      return []
    }

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map(record => this.normalizeStoredMemory(record))
      .filter(Boolean)
  }

  async writeMemories(memories) {
    const filePath = this.memoryFilePath()
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`

    await mkdir(path.dirname(filePath), { recursive: true })
    await writeFile(tempPath, `${JSON.stringify(memories, null, 2)}\n`, 'utf8')
    await rename(tempPath, filePath)
  }

  async updateMemories(updater) {
    const run = this.writeQueue.then(async () => {
      const current = await this.readMemories()
      const { nextMemories, result } = await updater(current)
      await this.writeMemories(nextMemories)
      return result
    })

    this.writeQueue = run.catch(() => {})
    return run
  }

  async addMemories(contents, source = 'hub', { conversationId = null, projectId = null } = {}) {
    return this.updateMemories(async current => {
      const seen = new Set(current.map(memory => canonicalMemoryText(memory.content)))
      const newMemories = []
      const now = new Date()

      for (const content of Array.isArray(contents) ? contents : []) {
        const memory = normalizeMemoryRecord(content, {
          source,
          conversationId,
          projectId,
          now,
          rejectLowValue: true,
        })
        if (!memory) {
          continue
        }

        if (memory.content.length > configuredMemoryMaxChars()) {
          continue
        }

        const canonical = canonicalMemoryText(memory.content)
        if (seen.has(canonical)) {
          continue
        }

        newMemories.push(memory)
        seen.add(canonical)
      }

      let nextMemories = current.concat(newMemories)
      const maxMemories = configuredMemoryStoreMaxEntries()
      if (nextMemories.length > maxMemories) {
        nextMemories = nextMemories.slice(-maxMemories)
      }

      return {
        nextMemories,
        result: newMemories,
      }
    })
  }

  async deleteMemory(memoryId) {
    return this.updateMemories(async current => {
      const filtered = current.filter(memory => memory.id !== memoryId)
      return {
        nextMemories: filtered,
        result: filtered.length !== current.length,
      }
    })
  }

  formatForPrompt(memories, options = {}) {
    const selectedMemories = selectMemoriesForContext(memories, {
      query: options.query,
      conversationId: options.conversationId,
      projectId: options.projectId,
      limits: {
        longTerm: configuredMemoryMaxEntries(),
      },
    })
    return formatSavedMemoryBlock(selectedMemories)
  }

  async getContextPayload(options = {}) {
    const memories = await this.readMemories()
    const selectedMemories = selectMemoriesForContext(memories, {
      query: options.query,
      conversationId: options.conversationId,
      projectId: options.projectId,
      limits: {
        longTerm: configuredMemoryMaxEntries(),
      },
    })

    return {
      context: formatSavedMemoryBlock(selectedMemories),
      memory_count: selectedMemories.total,
    }
  }

  async listPayload() {
    const memories = await this.readMemories()
    return {
      memories,
      total: memories.length,
    }
  }
}

const memoryStore = new FileMemoryStore(config)

function parseContextResponsePayload(data) {
  if (
    !data ||
    typeof data !== 'object' ||
    Array.isArray(data) ||
    !Object.hasOwn(data, 'context') ||
    !Object.hasOwn(data, 'memory_count') ||
    !hasOnlySupportedFields(data, CONTEXT_RESPONSE_FIELDS) ||
    typeof data.context !== 'string' ||
    typeof data.memory_count !== 'number' ||
    !Number.isInteger(data.memory_count) ||
    data.memory_count < 0
  ) {
    throw invalidContextDataError()
  }

  const savedMemories = extractSavedMemoriesFromContext(data.context)
  if (savedMemories.length !== data.memory_count) {
    throw invalidContextDataError()
  }

  return {
    context: data.context.trim(),
    savedMemories,
    memoryCount: data.memory_count,
    memoryBlock: formatLoadedMemoryBlock(data.context, savedMemories),
  }
}

function assertLoadedMemoryListMatchesContext(chatContext, savedMemoriesFromContext) {
  if (!Array.isArray(chatContext.savedMemories)) {
    throw invalidContextDataError('inject')
  }

  if (
    typeof chatContext.memoryCount !== 'number' ||
    !Number.isInteger(chatContext.memoryCount) ||
    chatContext.memoryCount < 0 ||
    chatContext.memoryCount !== savedMemoriesFromContext.length ||
    chatContext.savedMemories.length !== savedMemoriesFromContext.length
  ) {
    throw invalidContextDataError('inject')
  }

  chatContext.savedMemories.forEach((memory, index) => {
    const normalizedMemory = validateLoadedMemoryText(memory, 'inject')
    if (normalizedMemory !== savedMemoriesFromContext[index]) {
      throw invalidContextDataError('inject')
    }
  })
}

function validateLoadedChatContextForInjection(chatContext) {
  if (!chatContext || typeof chatContext !== 'object' || Array.isArray(chatContext)) {
    throw invalidContextDataError('inject')
  }

  if (typeof chatContext.context !== 'string' || typeof chatContext.memoryBlock !== 'string') {
    throw invalidContextDataError('inject')
  }

  const savedMemoriesFromContext = extractSavedMemoriesFromContext(chatContext.context, 'inject')
  assertLoadedMemoryListMatchesContext(chatContext, savedMemoriesFromContext)

  const expectedMemoryBlock = formatLoadedMemoryBlock(chatContext.context, savedMemoriesFromContext)
  if (chatContext.memoryBlock !== expectedMemoryBlock) {
    throw invalidContextDataError('inject')
  }

  return expectedMemoryBlock
}

async function loadChatContext({ conversationId, query = '', logger, memoryStoreImpl = memoryStore } = {}) {
  let data

  const contextWorkerUrl = configuredContextWorkerUrl()
  if (contextWorkerUrl) {
    config.contextWorkerUrl = contextWorkerUrl
    if (typeof fetch !== 'function') {
      throw new MemoryDependencyError('Memory context load failed: fetch is not available')
    }

    let response
    try {
      response = await fetch(buildContextWorkerUrl('/context'), {
        method: 'GET',
        headers: { accept: 'application/json' },
        signal: createTimeoutSignal(config.memoryLoadTimeout),
      })
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : String(err)
      throw new MemoryDependencyError(`Memory context load failed: ${message}`, err)
    }

    if (!response.ok) {
      throw new MemoryDependencyError(`Memory context load failed: context worker returned HTTP ${response.status}`)
    }

    try {
      data = JSON.parse(await response.text())
    } catch (err) {
      throw new MemoryDependencyError('Memory context load failed: context worker returned invalid JSON', err)
    }
  } else {
    try {
      data = await memoryStoreImpl.getContextPayload({
        query,
        conversationId,
      })
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : String(err)
      throw new MemoryDependencyError(`Memory context load failed: ${message}`, err)
    }
  }

  const chatContext = parseContextResponsePayload(data)

  logger?.info?.({
    conversationId,
    memoryCount: chatContext.memoryCount,
  }, 'Memory context loaded')

  return chatContext
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

  const persona = await readTextFile('hub/workers/shared/persona.md', 'You are Case, a helpful assistant.')
  const responseFormatPath = provider === 'ollama'
    ? 'hub/workers/ollama/docs/response_format.md'
    : 'hub/workers/gpt/docs/response_format.md'
  const responseFormat = await readTextFile(responseFormatPath)
  const workerDocs = provider === 'codex'
    ? await readMarkdownDirectory('hub/workers/codex/docs')
    : provider === 'claude'
      ? await readMarkdownDirectory('hub/workers/claude/docs')
      : ''
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

function configuredMemoryMaxChars() {
  return Number.isInteger(config.memoryMaxChars) && config.memoryMaxChars > 0
    ? config.memoryMaxChars
    : 300
}

function configuredMemoryMaxEntries() {
  const configuredMax = Number.isInteger(config.memoryMaxEntries) && config.memoryMaxEntries > 0
    ? config.memoryMaxEntries
    : 10
  return Math.min(configuredMax, PROVIDER_MEMORY_MAX_ENTRIES)
}

function configuredMemoryStoreMaxEntries() {
  return Number.isInteger(config.memoryStoreMaxEntries) && config.memoryStoreMaxEntries > 0
    ? config.memoryStoreMaxEntries
    : 200
}

const PROVIDER_MEMORY_REJECTION_REASONS = [
  'nonString',
  'empty',
  'lowValue',
  'overMaxChars',
  'duplicate',
  'overMaxEntries',
]

function createRejectedMemorySummary() {
  return Object.fromEntries(PROVIDER_MEMORY_REJECTION_REASONS.map(reason => [reason, 0]))
}

function mergeRejectedMemorySummaries(...summaries) {
  const merged = createRejectedMemorySummary()

  for (const summary of summaries) {
    if (!summary || typeof summary !== 'object') {
      continue
    }

    for (const reason of PROVIDER_MEMORY_REJECTION_REASONS) {
      const count = summary[reason]
      if (Number.isInteger(count) && count > 0) {
        merged[reason] += count
      }
    }
  }

  return merged
}

function compactRejectedMemorySummary(rejectedMemorySummary) {
  return Object.fromEntries(
    Object.entries(rejectedMemorySummary)
      .filter(([, count]) => Number.isInteger(count) && count > 0)
  )
}

function extractProviderMemory(parsed) {
  const rejectedMemorySummary = createRejectedMemorySummary()

  if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.memory)) {
    return {
      memory: null,
      rejectedMemorySummary,
    }
  }

  const memory = []

  for (const item of parsed.memory) {
    if (typeof item !== 'string') {
      rejectedMemorySummary.nonString += 1
      continue
    }

    const normalizedMemory = normalizeMemoryText(item)
    if (!normalizedMemory) {
      rejectedMemorySummary.empty += 1
      continue
    }

    if (normalizedMemory.length > configuredMemoryMaxChars()) {
      rejectedMemorySummary.overMaxChars += 1
      continue
    }

    if (isLowValueMemory(normalizedMemory)) {
      rejectedMemorySummary.lowValue += 1
      continue
    }

    memory.push(normalizedMemory)
  }

  return {
    memory: memory.length ? memory : null,
    rejectedMemorySummary,
  }
}

function sumRejectedMemorySummary(rejectedMemorySummary) {
  return Object.values(rejectedMemorySummary).reduce((sum, count) => sum + count, 0)
}

function prepareProviderMemoriesForPersistence(providerMemories, savedMemories = []) {
  const acceptedMemories = []
  const rejectedMemorySummary = createRejectedMemorySummary()

  if (!Array.isArray(providerMemories) || !providerMemories.length) {
    return { acceptedMemories, rejectedMemorySummary }
  }

  const seen = new Set(
    savedMemories
      .filter(memory => typeof memory === 'string')
      .map(canonicalMemoryText)
      .filter(Boolean)
  )

  for (const value of providerMemories) {
    if (typeof value !== 'string') {
      rejectedMemorySummary.nonString += 1
      continue
    }

    const memory = normalizeMemoryText(value)
    if (!memory) {
      rejectedMemorySummary.empty += 1
      continue
    }

    if (memory.length > configuredMemoryMaxChars()) {
      rejectedMemorySummary.overMaxChars += 1
      continue
    }

    if (isLowValueMemory(memory)) {
      rejectedMemorySummary.lowValue += 1
      continue
    }

    const canonical = canonicalMemoryText(memory)
    if (seen.has(canonical)) {
      rejectedMemorySummary.duplicate += 1
      continue
    }

    if (acceptedMemories.length >= configuredMemoryMaxEntries()) {
      rejectedMemorySummary.overMaxEntries += 1
      continue
    }

    seen.add(canonical)
    acceptedMemories.push(memory)
  }

  return { acceptedMemories, rejectedMemorySummary }
}

async function persistProviderMemories({
  memories,
  savedMemories = [],
  providerMemoryRejectionSummary,
  provider,
  conversationId,
  logger,
  memoryStoreImpl = memoryStore,
}) {
  const {
    acceptedMemories,
    rejectedMemorySummary: persistenceRejectedMemorySummary,
  } = prepareProviderMemoriesForPersistence(memories, savedMemories)
  const rejectedMemorySummary = mergeRejectedMemorySummaries(
    providerMemoryRejectionSummary,
    persistenceRejectedMemorySummary,
  )
  const rejectedCount = sumRejectedMemorySummary(rejectedMemorySummary)

  if (rejectedCount) {
    logger?.info?.({
      provider,
      conversationId,
      rejectedMemorySummary: compactRejectedMemorySummary(rejectedMemorySummary),
    }, 'Provider memory entries rejected')
  }

  if (!acceptedMemories.length) {
    return acceptedMemories
  }

  const contextWorkerUrl = configuredContextWorkerUrl()
  if (contextWorkerUrl) {
    config.contextWorkerUrl = contextWorkerUrl
    if (typeof fetch !== 'function') {
      throw new MemoryDependencyError('Memory context save failed: fetch is not available', {
        provider,
        stage: 'save',
      })
    }

    let response
    try {
      response = await fetch(buildContextWorkerUrl('/context/memories'), {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          memories: acceptedMemories,
          source: provider,
        }),
        signal: createTimeoutSignal(config.memoryLoadTimeout),
      })
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : String(err)
      throw new MemoryDependencyError(`Memory context save failed: ${message}`, {
        cause: err,
        provider,
        stage: 'save',
      })
    }

    if (!response.ok) {
      const detail = await readContextWorkerErrorMessage(response)
      throw new MemoryDependencyError(appendContextWorkerErrorMessage(
        `Memory context save failed: context worker returned HTTP ${response.status}`,
        detail,
      ), {
        provider,
        stage: 'save',
      })
    }
  } else {
    try {
      await memoryStoreImpl.addMemories(acceptedMemories, provider, { conversationId })
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : String(err)
      throw new MemoryDependencyError(`Memory context save failed: ${message}`, {
        cause: err,
        provider,
        stage: 'save',
      })
    }
  }

  logger?.info?.({
    provider,
    conversationId,
    count: acceptedMemories.length,
  }, 'Provider memory persisted')

  return acceptedMemories
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
      rejectedMemorySummary: createRejectedMemorySummary(),
    }
  }

  const providerMemory = extractProviderMemory(parsed)
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

  return {
    text: messageText.trim(),
    commands,
    memory: providerMemory.memory,
    rejectedMemorySummary: providerMemory.rejectedMemorySummary,
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

  const parsed = parseJsonObject(content)
  const providerMemory = extractProviderMemory(parsed)
  const messageText = parsed && typeof parsed.message === 'string'
    ? parsed.message
    : content

  return {
    text: messageText.trim(),
    commands,
    memory: providerMemory.memory,
    rejectedMemorySummary: providerMemory.rejectedMemorySummary,
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

function createSuccessfulChatResponse(parsed) {
  return {
    message: createAndroidMessage({
      text: parsed.text,
      commands: parsed.commands,
    }),
  }
}

function normalizeSuccessfulChatResponse(provider, providerContent) {
  const parsed = parseProviderContent(provider, providerContent)

  return {
    responseData: createSuccessfulChatResponse(parsed),
    memory: parsed.memory,
    rejectedMemorySummary: parsed.rejectedMemorySummary,
  }
}

const RAW_JSON_RESPONSE_INSTRUCTION = 'Respond as raw JSON following the response format above.'
const IMAGE_RESPONSE_GUIDANCE = [
  'Image understanding rules:',
  '- Ground the reply only in visible image content.',
  '- Use cautious observational language in the response language; prefer phrases equivalent to "from the photo", "appears", or "not certain" over definitive diagnoses.',
  '- For receipt-like or document-like PNG images, identify the image in natural language as a receipt or document when that is visibly apparent; exact OCR is not required.',
  '- For plant images, when yellowing leaves are visible, mention the visible yellowing leaves before offering only tentative possibilities.',
].join('\n')

function buildCodexPrompt({ systemPrompt, memoryBlock = '', content, imageAttachment = null }) {
  return [
    systemPrompt,
    imageAttachment ? IMAGE_RESPONSE_GUIDANCE : '',
    memoryBlock,
    `User message:\n${content}`,
    RAW_JSON_RESPONSE_INSTRUCTION,
  ].filter(Boolean).join('\n\n')
}

function buildGptUserContent({ content, imageAttachment = null }) {
  if (!imageAttachment) {
    return content
  }

  return [
    { type: 'text', text: content },
    {
      type: 'image_url',
      image_url: {
        url: `data:${imageAttachment.mimeType};base64,${imageAttachment.dataBase64}`,
      },
    },
  ]
}

function buildGptMessages({ systemPrompt, memoryBlock = '', content, imageAttachment = null }) {
  const systemContent = [
    systemPrompt,
    imageAttachment ? IMAGE_RESPONSE_GUIDANCE : '',
    memoryBlock,
  ].filter(Boolean).join('\n\n')
  return [
    { role: 'system', content: systemContent },
    { role: 'user', content: buildGptUserContent({ content, imageAttachment }) },
  ]
}

function buildOllamaMessages({ systemPrompt, memoryBlock = '', content }) {
  const systemContent = [systemPrompt, memoryBlock].filter(Boolean).join('\n\n')
  return systemContent
    ? [{ role: 'system', content: systemContent }, { role: 'user', content }]
    : [{ role: 'user', content }]
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

async function withCodexImageAttachmentFile(imageAttachment, callback) {
  if (!imageAttachment) {
    return callback(null)
  }

  const tempDir = await mkdtemp(path.join(tmpdir(), 'case-codex-image-'))
  const imagePath = path.join(tempDir, imageAttachment.mimeType === 'image/png' ? 'attachment.png' : 'attachment.jpg')

  try {
    await writeFile(imagePath, imageAttachment.bytes)
    return await callback(imagePath)
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

async function runCodexChat({ content, context, imageAttachment = null }) {
  const systemPrompt = await buildSystemPrompt('codex')
  const prompt = buildCodexPrompt({
    systemPrompt,
    memoryBlock: context,
    content,
    imageAttachment,
  })

  return withCodexImageAttachmentFile(imageAttachment, async imagePath => {
    const args = [
      'exec',
      '--dangerously-bypass-approvals-and-sandbox',
      '--sandbox',
      'danger-full-access',
      '--skip-git-repo-check',
      '--color',
      'never',
    ]

    if (imagePath) {
      args.push('--image', imagePath)
    }

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
      prompt,
      config.codexChatTimeout,
    )

    if (result.exitCode !== 0) {
      const stderr = result.stderr.trim()
      throw new ChatProviderError(`Codex chat failed with exit code ${result.exitCode}${stderr ? `: ${stderr}` : ''}`)
    }

    return result.stdout
  })
}

async function runClaudeChat({ content, context }) {
  const systemPrompt = await buildSystemPrompt('claude')
  const promptParts = [systemPrompt]
  if (context) {
    promptParts.push(context)
  }
  promptParts.push(`User message:\n${content}`)
  promptParts.push('Respond as raw JSON following the response format above.')

  const result = await runProcess(
    config.claudePath,
    [
      '--dangerously-skip-permissions',
      '-p',
      promptParts.filter(Boolean).join('\n\n'),
    ],
    '',
    config.claudeChatTimeout,
  )

  if (result.exitCode !== 0) {
    const stderr = result.stderr.trim()
    throw new ChatProviderError(`Claude Code chat failed with exit code ${result.exitCode}${stderr ? `: ${stderr}` : ''}`)
  }

  return result.stdout
}

async function runOpenAiChat({ content, context, imageAttachment = null }) {
  if (!config.openaiApiKey) {
    throw new ChatProviderError('OPENAI_API_KEY is required for gpt chat provider')
  }

  const systemPrompt = await buildSystemPrompt('gpt')
  const messages = buildGptMessages({
    systemPrompt,
    memoryBlock: context,
    content,
    imageAttachment,
  })

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

async function runOllamaChat({ content, context }) {
  const systemPrompt = await buildSystemPrompt('ollama')
  const messages = buildOllamaMessages({
    systemPrompt,
    memoryBlock: context,
    content,
  })

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

function assertImageAttachmentSupportedByProvider(provider, imageAttachment) {
  if (!imageAttachment) {
    return
  }

  const capabilities = getSelectedChatProviderCapabilities(config, provider)
  if (!capabilities.supportsImageUnderstanding) {
    throw new ChatProviderError(capabilities.imageUnderstandingUnsupportedReason)
  }
}

function assertProviderDispatchAcceptsImageAttachments(requestBody) {
  const attachmentValidationError = validateChatAttachmentsForProviderDispatch(requestBody)
  if (attachmentValidationError) {
    throw new ChatProviderError(attachmentValidationError)
  }
}

async function runChatProvider(provider, requestBody, context = '') {
  assertProviderDispatchAcceptsImageAttachments(requestBody)
  const imageAttachment = getChatImageAttachment(requestBody)
  assertImageAttachmentSupportedByProvider(provider, imageAttachment)

  const chatInput = {
    content: requestBody.content,
    conversationId: requestBody.conversationId,
    context,
    imageAttachment,
  }

  if (provider === 'codex') {
    return runCodexChat(chatInput)
  }
  if (provider === 'claude') {
    return runClaudeChat(chatInput)
  }
  if (provider === 'gpt') {
    return runOpenAiChat(chatInput)
  }
  if (provider === 'ollama') {
    return runOllamaChat(chatInput)
  }

  throw new ChatProviderError(`Unsupported chat provider: ${provider}`)
}

async function loadContextThenRunChatProvider(
  provider,
  requestBody,
  {
    logger,
    loadContext = loadChatContext,
    dispatchProvider = runChatProvider,
  } = {},
) {
  assertProviderDispatchAcceptsImageAttachments(requestBody)
  const imageAttachment = getChatImageAttachment(requestBody)
  assertImageAttachmentSupportedByProvider(provider, imageAttachment)

  let chatContext
  try {
    chatContext = await loadContext({
      conversationId: requestBody.conversationId,
      query: requestBody.content,
      logger,
    })
  } catch (err) {
    throw asProviderMemoryLoadError(provider, err)
  }

  let memoryBlock
  try {
    memoryBlock = validateLoadedChatContextForInjection(chatContext)
  } catch (err) {
    throw new MemoryDependencyError(memoryErrorMessage(err), {
      cause: err,
      provider,
      stage: err?.stage || 'inject',
    })
  }

  const providerContent = await dispatchProvider(provider, requestBody, memoryBlock)

  return {
    chatContext,
    providerContent,
  }
}

// Health check (not forwarded)
fastify.get('/robots.txt', async (request, reply) => {
  reply.type('text/plain; charset=utf-8')
  return 'User-agent: *\nDisallow: /\n'
})

fastify.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString()
}))

fastify.get('/context', async request => memoryStore.getContextPayload({
  query: typeof request.query?.query === 'string'
    ? request.query.query
    : typeof request.query?.q === 'string'
      ? request.query.q
      : '',
  conversationId: typeof request.query?.conversationId === 'string'
    ? request.query.conversationId
    : null,
  projectId: typeof request.query?.projectId === 'string'
    ? request.query.projectId
    : null,
}))

fastify.get('/context/memories', async () => memoryStore.listPayload())

fastify.post('/context/memories', async (request, reply) => {
  const { body } = request
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.memories)) {
    reply.code(400)
    return {
      error: 'Bad Request',
      message: 'memories must be an array of strings or structured memory records',
    }
  }

  const newMemories = await memoryStore.addMemories(body.memories, body.source || config.chatProvider, {
    conversationId: typeof body.conversationId === 'string' ? body.conversationId : null,
    projectId: typeof body.projectId === 'string' ? body.projectId : null,
  })
  return {
    saved: newMemories.length,
    memories: newMemories,
  }
})

fastify.delete('/context/memories/:memoryId', async (request, reply) => {
  const deleted = await memoryStore.deleteMemory(request.params.memoryId)
  if (!deleted) {
    reply.code(404)
    return {
      detail: 'Memory not found',
    }
  }

  return {
    deleted: true,
    id: request.params.memoryId,
  }
})

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
    return buildValidationErrorResponse(validationError)
  }
  const chatRequest = normalizeChatRequestBody(body)

  try {
    request.log.info({
      provider: config.chatProvider,
      conversationId: chatRequest.conversationId,
    }, 'Chat received')

    const { chatContext, providerContent } = await loadContextThenRunChatProvider(config.chatProvider, chatRequest, {
      logger: request.log,
    })
    const parsed = parseProviderContent(config.chatProvider, providerContent)

    await persistProviderMemories({
      memories: parsed.memory,
      savedMemories: chatContext.savedMemories,
      providerMemoryRejectionSummary: parsed.rejectedMemorySummary,
      provider: config.chatProvider,
      conversationId: chatRequest.conversationId,
      logger: request.log,
    })

    return createSuccessfulChatResponse(parsed)
  } catch (err) {
    if (err instanceof MemoryDependencyError) {
      const memoryError = buildMemoryErrorResponse(err, config.chatProvider)
      logMemoryDependencyFailure(request.log, err, {
        provider: memoryError.provider,
        conversationId: chatRequest.conversationId,
      })
      reply.code(502)
      return memoryError
    }

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
  validateContextWorker = configuredContextWorkerUrl() ? validateContextWorkerReachability : null,
  validateProvider = validateSelectedChatProvider,
  listen = options => fastify.listen(options),
  logger = fastify.log,
  exit = process.exit,
} = {}) => {
  try {
    config.chatProvider = process.env.CHAT_PROVIDER || await selectProvider({
      defaultProvider: config.chatProvider,
    })
    if (validateContextWorker) {
      await validateContextWorker(logger)
    }
    await validateProvider(logger)
    await listen({ port: config.port, host: '0.0.0.0' })
    logger.info({
      chatProvider: config.chatProvider,
      memoryStore: config.contextWorkerUrl || memoryStore.memoryFilePath(),
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
  buildCodexPrompt,
  buildCommandResultResponse,
  buildGptMessages,
  buildOllamaMessages,
  buildMemoryErrorResponse,
  buildProviderErrorResponse,
  buildValidationErrorResponse,
  CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES,
  commandResults,
  config,
  fastify,
  FileMemoryStore,
  formatSavedMemoryBlock,
  getSelectedChatProviderCapabilities,
  isExecutableAvailable,
  loadContextThenRunChatProvider,
  loadChatContext,
  logMemoryDependencyFailure,
  memoryStore,
  MemoryDependencyError,
  normalizeMemoryRecord,
  normalizeChatImageAttachment,
  normalizeChatRequestBody,
  normalizeSuccessfulChatResponse,
  prepareProviderMemoriesForPersistence,
  persistProviderMemories,
  parseContextResponsePayload,
  selectMemoriesForContext,
  start,
  validateLoadedChatContextForInjection,
  validateContextWorkerReachability,
  validateContextWorkerUrl,
  validateSelectedChatProvider,
}

const isMainModule = process.argv[1] && __filename === path.resolve(process.argv[1])

if (isMainModule) {
  start()
}
