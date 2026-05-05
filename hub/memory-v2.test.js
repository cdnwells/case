import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { config, fastify, FileMemoryStore } from './hub.js'
import {
  formatMemoryContext,
  normalizeMemoryRecord,
  selectMemoriesForContext,
} from './memory-v2.js'

const originalConfig = { ...config }

test.after(async () => {
  Object.assign(config, originalConfig)
  await fastify.close()
})

test.beforeEach(() => {
  Object.assign(config, originalConfig, {
    contextWorkerUrl: '',
    memoryMaxEntries: 10,
  })
})

test('memory v2 classifies structured provider memories conservatively', () => {
  const semantic = normalizeMemoryRecord('The user prefers concise status updates.', {
    source: 'codex',
    rejectLowValue: true,
  })
  assert.equal(semantic.kind, 'semantic')
  assert.equal(semantic.scope, 'user')
  assert.equal(semantic.source, 'codex')
  assert.equal(semantic.tags.includes('preference'), true)

  const procedural = normalizeMemoryRecord('When changing Project Case hub code, run pnpm test.', {
    source: 'gpt',
    rejectLowValue: true,
  })
  assert.equal(procedural.kind, 'procedural')
  assert.equal(procedural.scope, 'project')
  assert.equal(procedural.tags.includes('testing'), true)

  const working = normalizeMemoryRecord('working: User is currently comparing memory retrieval options.', {
    source: 'hub',
    conversationId: 'classification-conversation',
    rejectLowValue: true,
  })
  assert.equal(working.kind, 'working')
  assert.equal(working.scope, 'conversation')
  assert.equal(working.conversation_id, 'classification-conversation')
  assert.equal(working.content, 'User is currently comparing memory retrieval options.')

  assert.equal(normalizeMemoryRecord('thanks', { rejectLowValue: true }), null)
})

test('FileMemoryStore loads legacy flat JSON records as structured memory without losing core fields', async (t) => {
  const memoryDataDir = await mkdtemp(path.join(tmpdir(), 'case-memory-v2-legacy-'))
  t.after(async () => {
    await rm(memoryDataDir, { recursive: true, force: true })
  })

  await writeFile(path.join(memoryDataDir, 'memories.json'), `${JSON.stringify([
    {
      id: 'legacy-memory-1',
      content: '  User prefers concise replies.  ',
      created_at: '2024-01-01T00:00:00.000Z',
      source: 'codex',
    },
  ], null, 2)}\n`, 'utf8')

  const store = new FileMemoryStore({
    memoryDataDir,
    memoryFileName: 'memories.json',
  })
  const memories = await store.readMemories()

  assert.equal(memories.length, 1)
  assert.equal(memories[0].id, 'legacy-memory-1')
  assert.equal(memories[0].content, 'User prefers concise replies.')
  assert.equal(memories[0].created_at, '2024-01-01T00:00:00.000Z')
  assert.equal(memories[0].source, 'codex')
  assert.equal(memories[0].kind, 'semantic')
  assert.equal(memories[0].scope, 'user')
  assert.equal(memories[0].confidence, 0.75)

  const payload = await store.getContextPayload({ query: 'concise replies' })
  assert.equal(payload.memory_count, 1)
  assert.match(payload.context, /Relevant Long-term Memories:/)
  assert.match(payload.context, /User prefers concise replies\./)
})

test('memory v2 retrieval always includes core and working memory while ranking relevant long-term memory', () => {
  const now = new Date('2026-05-05T00:00:00.000Z')
  const memories = [
    {
      id: 'core-english',
      kind: 'core',
      scope: 'user',
      content: 'User wants Case to answer in English.',
      importance: 0.95,
      confidence: 0.9,
      created_at: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'working-conversation',
      kind: 'working',
      scope: 'conversation',
      content: 'User is currently testing Memory v2 retrieval.',
      conversation_id: 'memory-v2-ranking',
      importance: 0.7,
      confidence: 0.8,
      created_at: '2026-05-05T00:00:00.000Z',
    },
    {
      id: 'procedural-tests',
      kind: 'procedural',
      scope: 'project',
      content: 'When changing hub memory code, run pnpm test.',
      importance: 0.7,
      confidence: 0.85,
      created_at: '2026-05-04T00:00:00.000Z',
    },
    {
      id: 'semantic-fastify',
      kind: 'semantic',
      scope: 'project',
      content: 'Project Case hub uses Fastify.',
      importance: 0.6,
      confidence: 0.8,
      created_at: '2026-05-03T00:00:00.000Z',
    },
    {
      id: 'irrelevant',
      kind: 'semantic',
      scope: 'user',
      content: 'User likes quiet notification tones.',
      importance: 0.6,
      confidence: 0.8,
      created_at: '2026-05-05T00:00:00.000Z',
    },
  ]

  const selected = selectMemoriesForContext(memories, {
    query: 'How should I test hub memory retrieval?',
    conversationId: 'memory-v2-ranking',
    now,
    limits: {
      core: 3,
      working: 3,
      longTerm: 2,
    },
  })

  assert.deepEqual(selected.core.map(memory => memory.id), ['core-english'])
  assert.deepEqual(selected.working.map(memory => memory.id), ['working-conversation'])
  assert.deepEqual(selected.longTerm.map(memory => memory.id), [
    'procedural-tests',
    'semantic-fastify',
  ])
  assert.equal(selected.longTerm.some(memory => memory.id === 'irrelevant'), false)
})

test('memory v2 prompt formatting uses compact explicit sections', () => {
  const selected = selectMemoriesForContext([
    normalizeMemoryRecord({
      id: 'core',
      kind: 'core',
      scope: 'user',
      content: 'User wants English responses.',
      importance: 0.95,
      confidence: 0.9,
      created_at: '2026-05-01T00:00:00.000Z',
    }),
    normalizeMemoryRecord({
      id: 'working',
      kind: 'working',
      scope: 'conversation',
      conversation_id: 'prompt-format',
      content: 'User is currently validating prompt formatting.',
      created_at: '2026-05-05T00:00:00.000Z',
    }),
    normalizeMemoryRecord({
      id: 'semantic',
      kind: 'semantic',
      scope: 'project',
      content: 'Project Case memory prompts must stay compact.',
      created_at: '2026-05-05T00:00:00.000Z',
    }),
  ], {
    query: 'memory prompt formatting',
    conversationId: 'prompt-format',
    now: new Date('2026-05-05T00:00:00.000Z'),
  })
  const block = formatMemoryContext(selected)

  assert.match(block, /^Core Memory:\n- \[user\] User wants English responses\./)
  assert.match(block, /Working Memory:\n- \[conversation\] User is currently validating prompt formatting\./)
  assert.match(block, /Relevant Long-term Memories:\n- \[semantic\/project\] Project Case memory prompts must stay compact\./)
  assert.match(block, /Memory Rules:\n- Use saved memories only as durable background facts when relevant\./)
  assert.equal(block.includes('Known facts about the user:'), false)
})
