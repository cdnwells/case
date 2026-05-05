import assert from 'node:assert/strict'
import test from 'node:test'

import {
  commandResults,
  config,
  fastify,
  normalizeSuccessfulChatResponse,
  prepareProviderMemoriesForPersistence,
  persistProviderMemories,
} from './hub.js'

const originalConfig = { ...config }

test.after(async () => {
  commandResults.clear()
  await fastify.close()
})

test.beforeEach(() => {
  commandResults.clear()
  Object.assign(config, originalConfig)
})

function rejectedSummary(overrides = {}) {
  return {
    nonString: 0,
    empty: 0,
    lowValue: 0,
    overMaxChars: 0,
    duplicate: 0,
    overMaxEntries: 0,
    ...overrides,
  }
}

test('provider memory is read from JSON memory array of strings', () => {
  const normalized = normalizeSuccessfulChatResponse('codex', JSON.stringify({
    message: 'remembered',
    memory: ['The user prefers concise status updates.'],
  }))

  assert.deepEqual(normalized.memory, ['The user prefers concise status updates.'])
  assert.deepEqual(Object.keys(normalized.responseData), ['message'])
})

test('provider memory ignores alternate memory field shapes', () => {
  const cases = [
    {
      name: 'memories field',
      payload: {
        message: 'ignored',
        memories: ['Do not read this field.'],
      },
    },
    {
      name: 'string memory field',
      payload: {
        message: 'ignored',
        memory: 'Do not coerce this value.',
      },
    },
    {
      name: 'object memory field',
      payload: {
        message: 'ignored',
        memory: { content: 'Do not read this object.' },
      },
    },
  ]

  for (const { name, payload } of cases) {
    const normalized = normalizeSuccessfulChatResponse('codex', JSON.stringify(payload))
    assert.equal(normalized.memory, null, name)
  }
})

test('provider memory keeps only string entries from memory arrays', () => {
  const normalized = normalizeSuccessfulChatResponse('gpt', JSON.stringify({
    message: 'filtered',
    memory: [
      'The user prefers backend-first changes.',
      123,
      false,
      null,
      { content: 'Do not stringify this object.' },
      ['Do not read nested arrays.'],
    ],
  }))

  assert.deepEqual(normalized.memory, ['The user prefers backend-first changes.'])
})

test('provider memory trims text and rejects empty entries', () => {
  const normalized = normalizeSuccessfulChatResponse('codex', JSON.stringify({
    message: 'normalized',
    memory: [
      '  The user prefers backend-first changes.  ',
      '',
      '   ',
      '\n\t',
      'Project Case stores only durable memory.',
    ],
  }))

  assert.deepEqual(normalized.memory, [
    'The user prefers backend-first changes.',
    'Project Case stores only durable memory.',
  ])
})

test('provider memory rejection summary counts invalid array entries without raw values', () => {
  config.memoryMaxChars = 40
  const oversizedSecret = `Sensitive oversized memory must not be logged ${'x'.repeat(40)}`

  const normalized = normalizeSuccessfulChatResponse('gpt', JSON.stringify({
    message: 'normalized rejection summary',
    memory: [
      'Valid durable fact.',
      '',
      '   ',
      123,
      null,
      { content: 'Sensitive object memory must not be logged' },
      oversizedSecret,
    ],
  }))

  assert.deepEqual(normalized.memory, ['Valid durable fact.'])
  assert.deepEqual(normalized.rejectedMemorySummary, rejectedSummary({
    nonString: 3,
    empty: 2,
    overMaxChars: 1,
  }))
  assert.equal(JSON.stringify(normalized.rejectedMemorySummary).includes('Sensitive'), false)
})

test('provider-returned rejected memory log uses counts and reasons without raw values', async () => {
  config.memoryMaxChars = 50
  const oversizedSecret = `Sensitive oversized provider memory ${'x'.repeat(50)}`
  const objectSecret = 'Sensitive object memory must not be logged'
  const logs = []

  const normalized = normalizeSuccessfulChatResponse('gpt', JSON.stringify({
    message: 'answer survives provider memory rejection',
    memory: [
      '',
      '   ',
      123,
      null,
      { content: objectSecret },
      oversizedSecret,
    ],
  }))

  assert.equal(normalized.memory, null)
  assert.deepEqual(normalized.rejectedMemorySummary, rejectedSummary({
    nonString: 3,
    empty: 2,
    overMaxChars: 1,
  }))

  const acceptedMemories = await persistProviderMemories({
    memories: normalized.memory,
    providerMemoryRejectionSummary: normalized.rejectedMemorySummary,
    provider: 'gpt',
    conversationId: 'provider-returned-rejected-memory-log-test',
    logger: {
      info(fields, message) {
        logs.push({ fields, message })
      },
    },
  })

  assert.deepEqual(acceptedMemories, [])
  assert.equal(logs.length, 1)
  assert.equal(logs[0].message, 'Provider memory entries rejected')
  assert.deepEqual(logs[0].fields, {
    provider: 'gpt',
    conversationId: 'provider-returned-rejected-memory-log-test',
    rejectedMemorySummary: {
      nonString: 3,
      empty: 2,
      overMaxChars: 1,
    },
  })

  const serializedLogs = JSON.stringify(logs)
  assert.equal(serializedLogs.includes(oversizedSecret), false)
  assert.equal(serializedLogs.includes(objectSecret), false)
  assert.equal(serializedLogs.includes('Sensitive'), false)
})

test('provider memory enforces configured max size after normalization', () => {
  config.memoryMaxChars = 18

  const normalized = normalizeSuccessfulChatResponse('gpt', JSON.stringify({
    message: 'normalized limits',
    memory: [
      '   Alpha       beta     gamma   ',
      '1234567890123456789',
      'Fits exactly 18 ch',
    ],
  }))

  assert.deepEqual(normalized.memory, [
    'Alpha beta gamma',
    'Fits exactly 18 ch',
  ])
})

test('provider memory returns null when all memory entries are invalid', () => {
  const normalized = normalizeSuccessfulChatResponse('gpt', JSON.stringify({
    message: 'nothing durable',
    memory: [
      '',
      '   ',
      123,
      null,
      { content: 'Do not stringify this object.' },
    ],
  }))

  assert.equal(normalized.memory, null)
})

test('provider memory rejects low-value entries without blocking concise useful facts', () => {
  const normalized = normalizeSuccessfulChatResponse('codex', JSON.stringify({
    message: 'filtered low-value memory',
    memory: [
      'thanks',
      'ok',
      'Use pnpm for hub package commands.',
    ],
  }))

  assert.deepEqual(normalized.memory, ['Use pnpm for hub package commands.'])
  assert.deepEqual(normalized.rejectedMemorySummary, rejectedSummary({
    lowValue: 2,
  }))
})

test('ollama provider memory follows the same JSON memory field rule', () => {
  const normalized = normalizeSuccessfulChatResponse('ollama', JSON.stringify({
    message: 'ollama remembered',
    memory: ['The user prefers local models for drafts.'],
    memories: ['Do not read alternate fields.'],
  }))

  assert.deepEqual(normalized.memory, ['The user prefers local models for drafts.'])
})

test('provider memories are deduplicated by canonical form before persistence', () => {
  const prepared = prepareProviderMemoriesForPersistence([
    '  User prefers concise replies.  ',
    'user   prefers CONCISE replies.',
    'Project Case stores durable memory.',
    'PROJECT case stores   durable memory.',
    'The user prefers backend-first changes.',
    'project case is a backend-first app.',
  ], [
    'Project Case is a backend-first app.',
  ])

  assert.deepEqual(prepared.acceptedMemories, [
    'User prefers concise replies.',
    'Project Case stores durable memory.',
    'The user prefers backend-first changes.',
  ])
  assert.deepEqual(prepared.rejectedMemorySummary, rejectedSummary({
    duplicate: 3,
  }))
})

test('provider memories are capped at 10 accepted entries before persistence', () => {
  config.memoryMaxEntries = 25
  const providerMemories = Array.from(
    { length: 12 },
    (_, index) => `Durable project fact ${String(index + 1).padStart(2, '0')}.`,
  )

  const prepared = prepareProviderMemoriesForPersistence(providerMemories)

  assert.deepEqual(prepared.acceptedMemories, providerMemories.slice(0, 10))
  assert.deepEqual(prepared.rejectedMemorySummary, rejectedSummary({
    overMaxEntries: 2,
  }))
})

test('rejected provider memory logging emits only counts grouped by reason', async () => {
  config.memoryMaxChars = 80
  const duplicateSecret = 'Sensitive duplicate memory must not be logged.'
  const oversizedSecret = `Sensitive oversized memory must not be logged ${'x'.repeat(80)}`
  const logs = []

  const acceptedMemories = await persistProviderMemories({
    memories: [
      `  ${duplicateSecret}  `,
      '',
      '   ',
      { content: 'Sensitive object memory must not be logged' },
      oversizedSecret,
    ],
    savedMemories: [duplicateSecret],
    provider: 'codex',
    conversationId: 'rejected-memory-log-test',
    logger: {
      info(fields, message) {
        logs.push({ fields, message })
      },
    },
  })

  assert.deepEqual(acceptedMemories, [])
  assert.equal(logs.length, 1)
  assert.equal(logs[0].message, 'Provider memory entries rejected')
  assert.deepEqual(logs[0].fields, {
    provider: 'codex',
    conversationId: 'rejected-memory-log-test',
    rejectedMemorySummary: {
      duplicate: 1,
      empty: 2,
      nonString: 1,
      overMaxChars: 1,
    },
  })

  const serializedLogs = JSON.stringify(logs)
  assert.equal(serializedLogs.includes(duplicateSecret), false)
  assert.equal(serializedLogs.includes('Sensitive oversized'), false)
  assert.equal(serializedLogs.includes('Sensitive object'), false)
})
