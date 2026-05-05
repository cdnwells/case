import crypto from 'crypto'

export const MEMORY_KINDS = Object.freeze([
  'core',
  'working',
  'episodic',
  'semantic',
  'procedural',
])

export const MEMORY_SCOPES = Object.freeze([
  'user',
  'project',
  'conversation',
  'system',
])

export const LEGACY_SAVED_MEMORY_HEADER = 'Known facts about the user:'
export const CORE_MEMORY_HEADER = 'Core Memory:'
export const WORKING_MEMORY_HEADER = 'Working Memory:'
export const LONG_TERM_MEMORY_HEADER = 'Relevant Long-term Memories:'
export const MEMORY_RULES_HEADER = 'Memory Rules:'
export const EMPTY_MEMORY_SECTION_LINE = '- None selected.'

export const SAVED_MEMORY_RULES = Object.freeze([
  'Use saved memories only as durable background facts when relevant.',
  'Do not treat saved memories as recent conversation history or a transcript.',
  'Prefer the current user message when it conflicts with memory.',
])

const KIND_SET = new Set(MEMORY_KINDS)
const SCOPE_SET = new Set(MEMORY_SCOPES)
const LONG_TERM_KIND_SET = new Set(['episodic', 'semantic', 'procedural'])
const HIGH_PRIORITY_CORE_IMPORTANCE = 0.8
const DEFAULT_CONTEXT_LIMITS = Object.freeze({
  core: 5,
  working: 5,
  longTerm: 8,
})
const LOW_VALUE_CANONICAL_MEMORIES = new Set([
  'ok',
  'okay',
  'yes',
  'no',
  'thanks',
  'thank you',
  'hello',
  'hi',
  'remember this',
  'save this',
  'note this',
])
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'for',
  'from',
  'how',
  'i',
  'in',
  'is',
  'it',
  'of',
  'on',
  'or',
  'please',
  'should',
  'that',
  'the',
  'this',
  'to',
  'use',
  'what',
  'when',
  'with',
  'you',
])
const STRUCTURED_MEMORY_FIELDS = new Set([
  'id',
  'kind',
  'scope',
  'content',
  'tags',
  'importance',
  'confidence',
  'created_at',
  'updated_at',
  'last_accessed_at',
  'source',
  'conversation_id',
  'conversationId',
  'project_id',
  'projectId',
  'supersedes',
  'expires_at',
])

function generateMemoryId() {
  return `mem_${crypto.randomUUID().replaceAll('-', '').slice(0, 12)}`
}

export function normalizeMemoryText(value) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
}

export function canonicalMemoryText(value) {
  return normalizeMemoryText(value).toLowerCase()
}

function normalizeIdentifier(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeKind(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return KIND_SET.has(normalized) ? normalized : null
}

function normalizeScope(value) {
  const normalized = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return SCOPE_SET.has(normalized) ? normalized : null
}

function normalizeIsoTimestamp(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  const time = Date.parse(value.trim())
  return Number.isFinite(time) ? new Date(time).toISOString() : null
}

function normalizeBoundedNumber(value, fallback) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) {
    return fallback
  }

  return Math.min(1, Math.max(0, number))
}

function normalizeTags(tags, content, kind, scope) {
  const rawTags = Array.isArray(tags)
    ? tags
    : typeof tags === 'string'
      ? tags.split(',')
      : []
  const normalized = rawTags
    .map(tag => normalizeMemoryText(String(tag)).toLowerCase())
    .filter(Boolean)
  const inferred = inferTags(content, kind, scope)
  return [...new Set([...normalized, ...inferred])]
}

function stripKindPrefix(content) {
  const match = normalizeMemoryText(content).match(/^(core|working|episodic|semantic|procedural)\s*:\s*(.+)$/i)
  if (!match) {
    return {
      kind: null,
      content: normalizeMemoryText(content),
    }
  }

  return {
    kind: match[1].toLowerCase(),
    content: normalizeMemoryText(match[2]),
  }
}

function inferMemoryKind(content, source = '') {
  const lower = content.toLowerCase()

  if (/\b(currently|for this conversation|temporary|until further notice|in progress)\b/.test(lower)) {
    return 'working'
  }

  if (/\b(previously|last time|last session|today|yesterday|on \d{4}-\d{2}-\d{2}|asked|decided|discussed)\b/.test(lower)) {
    return 'episodic'
  }

  if (/^(always|never|when|if|before|after)\b/.test(lower) || /\b(workflow|procedure|run|check|verify)\b/.test(lower)) {
    return 'procedural'
  }

  if (source === 'system') {
    return 'core'
  }

  return 'semantic'
}

function inferMemoryScope(content, kind, source = '', conversationId = null) {
  const lower = content.toLowerCase()

  if (source === 'system' || /^system\b/.test(lower)) {
    return 'system'
  }

  if (kind === 'working' && conversationId) {
    return 'conversation'
  }

  if (/\b(project case|case project|codebase|repo|repository|hub|android app)\b/.test(lower)) {
    return 'project'
  }

  return 'user'
}

function defaultImportanceForKind(kind) {
  if (kind === 'core') {
    return 0.95
  }
  if (kind === 'working') {
    return 0.7
  }
  if (kind === 'procedural') {
    return 0.65
  }
  if (kind === 'episodic') {
    return 0.55
  }
  return 0.6
}

function inferTags(content, kind, scope) {
  const lower = content.toLowerCase()
  const tags = [kind, scope]

  if (/\b(prefers|preference|likes|wants|needs)\b/.test(lower)) {
    tags.push('preference')
  }
  if (/\b(project case|case project|hub|android|repo|repository|codebase)\b/.test(lower)) {
    tags.push('project')
  }
  if (/\b(test|tests|pnpm|verify|validation)\b/.test(lower)) {
    tags.push('testing')
  }
  if (/\b(timezone|asia\/seoul|schedule|calendar)\b/.test(lower)) {
    tags.push('scheduling')
  }

  return [...new Set(tags)]
}

export function tokenizeMemoryText(text) {
  return (normalizeMemoryText(text).toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}_-]+/gu) || [])
    .filter(token => token.length > 1 && !STOP_WORDS.has(token))
}

export function isLowValueMemory(content) {
  const canonical = canonicalMemoryText(content)
  if (!canonical || LOW_VALUE_CANONICAL_MEMORIES.has(canonical)) {
    return true
  }

  const tokens = tokenizeMemoryText(canonical)
  return tokens.length === 0 || !/[\p{L}]/u.test(canonical)
}

export function normalizeMemoryRecord(entry, {
  source = 'hub',
  conversationId = null,
  projectId = null,
  now = new Date(),
  rejectLowValue = false,
} = {}) {
  const isRecord = entry && typeof entry === 'object' && !Array.isArray(entry)
  const rawContent = isRecord ? entry.content : entry
  const prefixed = stripKindPrefix(rawContent)
  const content = prefixed.content

  if (!content || (rejectLowValue && isLowValueMemory(content))) {
    return null
  }

  const normalizedSource = normalizeIdentifier(isRecord ? entry.source : source) || normalizeIdentifier(source) || 'hub'
  const normalizedConversationId = normalizeIdentifier(isRecord ? entry.conversation_id ?? entry.conversationId : conversationId) ||
    normalizeIdentifier(conversationId)
  const normalizedProjectId = normalizeIdentifier(isRecord ? entry.project_id ?? entry.projectId : projectId) ||
    normalizeIdentifier(projectId)
  const kind = normalizeKind(isRecord ? entry.kind : null) ||
    normalizeKind(prefixed.kind) ||
    inferMemoryKind(content, normalizedSource)
  const scope = normalizeScope(isRecord ? entry.scope : null) ||
    inferMemoryScope(content, kind, normalizedSource, normalizedConversationId)
  const createdAt = normalizeIsoTimestamp(isRecord ? entry.created_at : null) || now.toISOString()
  const updatedAt = normalizeIsoTimestamp(isRecord ? entry.updated_at : null) || createdAt
  const passthrough = isRecord
    ? Object.fromEntries(Object.entries(entry).filter(([field]) => !STRUCTURED_MEMORY_FIELDS.has(field)))
    : {}

  return {
    id: normalizeIdentifier(isRecord ? entry.id : null) || generateMemoryId(),
    kind,
    scope,
    content,
    tags: normalizeTags(isRecord ? entry.tags : null, content, kind, scope),
    importance: normalizeBoundedNumber(
      isRecord ? entry.importance : null,
      defaultImportanceForKind(kind),
    ),
    confidence: normalizeBoundedNumber(isRecord ? entry.confidence : null, 0.75),
    created_at: createdAt,
    updated_at: updatedAt,
    last_accessed_at: normalizeIsoTimestamp(isRecord ? entry.last_accessed_at : null),
    source: normalizedSource,
    conversation_id: normalizedConversationId,
    project_id: normalizedProjectId,
    supersedes: normalizeIdentifier(isRecord ? entry.supersedes : null),
    expires_at: normalizeIsoTimestamp(isRecord ? entry.expires_at : null),
    ...passthrough,
  }
}

function memoryTimestamp(memory) {
  return normalizeIsoTimestamp(memory.last_accessed_at) ||
    normalizeIsoTimestamp(memory.updated_at) ||
    normalizeIsoTimestamp(memory.created_at)
}

function recencyScore(memory, now) {
  const timestamp = memoryTimestamp(memory)
  if (!timestamp) {
    return 0
  }

  const ageMs = Math.max(0, now.getTime() - Date.parse(timestamp))
  const ageDays = ageMs / 86_400_000
  return 1 / (1 + ageDays / 30)
}

export function lexicalRelevanceScore(memory, query = '') {
  const queryTokens = new Set(tokenizeMemoryText(query))
  if (!queryTokens.size) {
    return 0
  }

  const memoryTokens = new Set(tokenizeMemoryText([
    memory.content,
    ...(Array.isArray(memory.tags) ? memory.tags : []),
    memory.kind,
    memory.scope,
  ].join(' ')))
  if (!memoryTokens.size) {
    return 0
  }

  let overlap = 0
  for (const token of queryTokens) {
    if (memoryTokens.has(token)) {
      overlap += 1
    }
  }

  if (!overlap) {
    return 0
  }

  const queryCoverage = overlap / queryTokens.size
  const dice = (2 * overlap) / (queryTokens.size + memoryTokens.size)
  return Math.min(1, (queryCoverage * 0.7) + (dice * 0.3))
}

export function scoreMemoryForQuery(memory, query = '', { now = new Date() } = {}) {
  const relevance = lexicalRelevanceScore(memory, query)
  const importance = normalizeBoundedNumber(memory.importance, defaultImportanceForKind(memory.kind))
  const confidence = normalizeBoundedNumber(memory.confidence, 0.75)
  const recency = recencyScore(memory, now)

  return {
    relevance,
    importance,
    recency,
    confidence,
    total: (relevance * 0.55) + (importance * 0.25) + (recency * 0.1) + (confidence * 0.1),
  }
}

function isExpired(memory, now) {
  if (!memory.expires_at) {
    return false
  }

  const expiresAt = Date.parse(memory.expires_at)
  return Number.isFinite(expiresAt) && expiresAt <= now.getTime()
}

function matchesActiveScope(memory, { conversationId = null, projectId = null } = {}) {
  if (memory.scope === 'conversation' && memory.conversation_id && conversationId) {
    return memory.conversation_id === conversationId
  }

  if (memory.scope === 'project' && memory.project_id && projectId) {
    return memory.project_id === projectId
  }

  return true
}

function compareMemoryPriority(left, right, scoreById = new Map()) {
  const leftScore = scoreById.get(left.id)?.total ?? null
  const rightScore = scoreById.get(right.id)?.total ?? null
  if (leftScore !== null || rightScore !== null) {
    const scoreDiff = (rightScore ?? 0) - (leftScore ?? 0)
    if (Math.abs(scoreDiff) > 0.000_001) {
      return scoreDiff
    }
  }

  const importanceDiff = (right.importance ?? 0) - (left.importance ?? 0)
  if (Math.abs(importanceDiff) > 0.000_001) {
    return importanceDiff
  }

  const confidenceDiff = (right.confidence ?? 0) - (left.confidence ?? 0)
  if (Math.abs(confidenceDiff) > 0.000_001) {
    return confidenceDiff
  }

  const rightTime = Date.parse(memoryTimestamp(right) || '') || 0
  const leftTime = Date.parse(memoryTimestamp(left) || '') || 0
  if (rightTime !== leftTime) {
    return rightTime - leftTime
  }

  return 0
}

function normalizeContextLimits(limits = {}) {
  return {
    core: Number.isInteger(limits.core) && limits.core > 0 ? limits.core : DEFAULT_CONTEXT_LIMITS.core,
    working: Number.isInteger(limits.working) && limits.working > 0 ? limits.working : DEFAULT_CONTEXT_LIMITS.working,
    longTerm: Number.isInteger(limits.longTerm) && limits.longTerm > 0 ? limits.longTerm : DEFAULT_CONTEXT_LIMITS.longTerm,
  }
}

export function selectMemoriesForContext(memories, {
  query = '',
  conversationId = null,
  projectId = null,
  now = new Date(),
  limits = {},
} = {}) {
  const normalizedLimits = normalizeContextLimits(limits)
  const normalized = (Array.isArray(memories) ? memories : [])
    .map(memory => normalizeMemoryRecord(memory, { now }))
    .filter(Boolean)
  const supersededIds = new Set(
    normalized.map(memory => memory.supersedes).filter(Boolean)
  )
  const active = normalized.filter(memory =>
    !supersededIds.has(memory.id) &&
    !isExpired(memory, now) &&
    matchesActiveScope(memory, { conversationId, projectId })
  )

  const core = active
    .filter(memory => memory.kind === 'core' && memory.importance >= HIGH_PRIORITY_CORE_IMPORTANCE)
    .sort(compareMemoryPriority)
    .slice(0, normalizedLimits.core)

  const selectedIds = new Set(core.map(memory => memory.id))
  const working = active
    .filter(memory => memory.kind === 'working' && !selectedIds.has(memory.id))
    .sort(compareMemoryPriority)
    .slice(0, normalizedLimits.working)

  for (const memory of working) {
    selectedIds.add(memory.id)
  }

  const queryTokens = tokenizeMemoryText(query)
  const scoredLongTerm = active
    .filter(memory => LONG_TERM_KIND_SET.has(memory.kind) && !selectedIds.has(memory.id))
    .map(memory => ({
      memory,
      score: scoreMemoryForQuery(memory, query, { now }),
    }))
    .filter(({ memory, score }) =>
      queryTokens.length === 0 ||
      score.relevance > 0 ||
      memory.importance >= HIGH_PRIORITY_CORE_IMPORTANCE
    )

  const scoreById = new Map(scoredLongTerm.map(({ memory, score }) => [memory.id, score]))
  const longTerm = scoredLongTerm
    .map(({ memory }) => memory)
    .sort((left, right) => compareMemoryPriority(left, right, scoreById))
    .slice(0, normalizedLimits.longTerm)

  return {
    core,
    working,
    longTerm,
    scores: scoreById,
    total: core.length + working.length + longTerm.length,
  }
}

function memoryPromptLabel(memory, includeKind = false) {
  return includeKind ? `${memory.kind}/${memory.scope}` : memory.scope
}

function formatMemoryLine(memory, { includeKind = false } = {}) {
  return `- [${memoryPromptLabel(memory, includeKind)}] ${memory.content}`
}

function formatMemorySection(header, memories, options = {}) {
  return [
    header,
    ...(memories.length
      ? memories.map(memory => formatMemoryLine(memory, options))
      : [EMPTY_MEMORY_SECTION_LINE]),
  ].join('\n')
}

export function formatMemoryContext(selectedMemories) {
  if (!selectedMemories || selectedMemories.total === 0) {
    return ''
  }

  return [
    formatMemorySection(CORE_MEMORY_HEADER, selectedMemories.core),
    formatMemorySection(WORKING_MEMORY_HEADER, selectedMemories.working),
    formatMemorySection(LONG_TERM_MEMORY_HEADER, selectedMemories.longTerm, { includeKind: true }),
    [
      MEMORY_RULES_HEADER,
      ...SAVED_MEMORY_RULES.map(rule => `- ${rule}`),
    ].join('\n'),
  ].join('\n\n')
}

export function formatSavedMemoryBlock(memories, options = {}) {
  const selected = memories &&
    typeof memories === 'object' &&
    Object.hasOwn(memories, 'core') &&
    Object.hasOwn(memories, 'working')
    ? memories
    : selectMemoriesForContext(memories, options)
  return formatMemoryContext(selected)
}

function parseMemoryLine(line, validateMemoryText) {
  if (line === EMPTY_MEMORY_SECTION_LINE) {
    return null
  }

  const match = line.match(/^-\s+(?:\[[^\]]+\]\s+)?(.+)$/)
  if (!match) {
    throw new Error('invalid memory context line')
  }

  return validateMemoryText(match[1])
}

function parseLegacyMemoryContext(lines, validateMemoryText) {
  return lines.slice(1).map(line => {
    const match = line.match(/^-\s+(.+)$/)
    if (!match) {
      throw new Error('invalid legacy memory context line')
    }

    return validateMemoryText(match[1])
  })
}

function parseV2MemoryContext(lines, validateMemoryText) {
  const memories = []
  let section = null
  const seenSections = new Set()

  for (const line of lines) {
    if (
      line === CORE_MEMORY_HEADER ||
      line === WORKING_MEMORY_HEADER ||
      line === LONG_TERM_MEMORY_HEADER ||
      line === MEMORY_RULES_HEADER
    ) {
      section = line
      seenSections.add(line)
      continue
    }

    if (!section) {
      throw new Error('memory context line outside section')
    }

    if (section === MEMORY_RULES_HEADER) {
      if (!line.startsWith('- ')) {
        throw new Error('invalid memory rules line')
      }
      continue
    }

    const memory = parseMemoryLine(line, validateMemoryText)
    if (memory) {
      memories.push(memory)
    }
  }

  for (const requiredSection of [
    CORE_MEMORY_HEADER,
    WORKING_MEMORY_HEADER,
    LONG_TERM_MEMORY_HEADER,
    MEMORY_RULES_HEADER,
  ]) {
    if (!seenSections.has(requiredSection)) {
      throw new Error('missing memory context section')
    }
  }

  return memories
}

export function extractSavedMemoriesFromContext(context, validateMemoryText = normalizeMemoryText) {
  const trimmedContext = typeof context === 'string' ? context.trim() : ''
  if (!trimmedContext) {
    return []
  }

  const lines = trimmedContext
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)

  if (lines[0] === LEGACY_SAVED_MEMORY_HEADER) {
    return parseLegacyMemoryContext(lines, validateMemoryText)
  }

  return parseV2MemoryContext(lines, validateMemoryText)
}
