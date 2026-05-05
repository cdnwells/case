import assert from 'node:assert/strict'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { config, fastify } from './hub.js'

const originalConfig = { ...config }

test.before(async () => {
  await fastify.ready()
})

test.after(async () => {
  Object.assign(config, originalConfig)
  await fastify.close()
})

test('hub context routes persist, list, format, and delete memories in-process', async (t) => {
  const memoryDataDir = await mkdtemp(path.join(tmpdir(), 'case-hub-memory-'))
  t.after(async () => {
    await rm(memoryDataDir, { recursive: true, force: true })
  })

  Object.assign(config, originalConfig, {
    contextWorkerUrl: '',
    memoryDataDir,
    memoryFileName: 'memories.json',
  })

  const saveResponse = await fastify.inject({
    method: 'POST',
    url: '/context/memories',
    payload: {
      memories: [
        '  User likes focused tests.  ',
        'user likes focused tests.',
        'Project Case memory now lives in the hub.',
      ],
      source: 'codex',
    },
  })

  assert.equal(saveResponse.statusCode, 200)
  const saveBody = saveResponse.json()
  assert.equal(saveBody.saved, 2)
  assert.deepEqual(saveBody.memories.map(memory => memory.content), [
    'User likes focused tests.',
    'Project Case memory now lives in the hub.',
  ])
  assert.equal(saveBody.memories.every(memory => memory.source === 'codex'), true)

  const listResponse = await fastify.inject({
    method: 'GET',
    url: '/context/memories',
  })
  assert.equal(listResponse.statusCode, 200)
  assert.equal(listResponse.json().total, 2)

  const contextResponse = await fastify.inject({
    method: 'GET',
    url: '/context',
  })
  assert.equal(contextResponse.statusCode, 200)
  assert.deepEqual(contextResponse.json(), {
    context: [
      'Known facts about the user:',
      '- User likes focused tests.',
      '- Project Case memory now lives in the hub.',
    ].join('\n'),
    memory_count: 2,
  })

  const memoryId = saveBody.memories[0].id
  const deleteResponse = await fastify.inject({
    method: 'DELETE',
    url: `/context/memories/${memoryId}`,
  })
  assert.equal(deleteResponse.statusCode, 200)
  assert.deepEqual(deleteResponse.json(), {
    deleted: true,
    id: memoryId,
  })

  const afterDeleteResponse = await fastify.inject({
    method: 'GET',
    url: '/context/memories',
  })
  assert.equal(afterDeleteResponse.statusCode, 200)
  assert.deepEqual(afterDeleteResponse.json().memories.map(memory => memory.content), [
    'Project Case memory now lives in the hub.',
  ])
})
