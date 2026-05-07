# Memory v2 Implementation Plan

## Goal

Memory v2 keeps Case's hub memory practical for the MVP: structured records, bounded retrieval, compact prompt injection, and compatibility with the existing flat JSON file and context-worker string protocol.

## Research Inputs

- Generative Agents: Interactive Simulacra of Human Behavior, https://arxiv.org/abs/2304.03442
  - Adopt a memory stream, lightweight relevance plus recency plus importance retrieval, and leave reflection synthesis as a later layer.
- MemGPT: Towards LLMs as Operating Systems, https://arxiv.org/abs/2310.08560
  - Adopt tiered memory ideas: core memory, active working memory, and longer-term recall/archival memory selected into context.
- Cognitive Architectures for Language Agents, https://arxiv.org/abs/2309.02427
  - Use working, episodic, semantic, and procedural memory categories, plus core memory for durable identity/preferences.
- Reflexion: Language Agents with Verbal Reinforcement Learning, https://arxiv.org/abs/2303.11366
  - Store lessons and outcome reflections as semantic/procedural memories now; add explicit reflection jobs later.
- A-MEM: Agentic Memory for LLM Agents, https://arxiv.org/abs/2502.12110
  - Keep linked, indexed Zettelkasten-style memory as a future enhancement unless simple tags and supersession links are enough.

## MVP Model

Each stored memory is normalized to:

- `kind`: `core`, `working`, `episodic`, `semantic`, or `procedural`
- `scope`: `user`, `project`, `conversation`, or `system`
- `id`, `content`, `tags`, `importance`, `confidence`
- `created_at`, `updated_at`, `last_accessed_at`
- `source`, `conversation_id`, `project_id`, `supersedes`, `expires_at`

Existing flat records such as `{ id, content, created_at, source }` are read as semantic user memories and keep their original core fields. Writes normalize the file to the v2 shape without requiring a separate migration command.

## Retrieval

Case no longer injects every local memory. For local hub memory, `/chat` passes the current user message into retrieval:

1. Include high-importance core memories.
2. Include active working memories, scoped to the current conversation when possible.
3. Rank semantic, episodic, and procedural memories with a bounded score:
   - lexical relevance from deterministic token overlap
   - importance
   - recency from `last_accessed_at`, `updated_at`, or `created_at`
   - confidence
4. Exclude expired and superseded memories.

Embeddings are intentionally out of scope for this MVP. The lexical scoring path is deterministic, testable, and can later be replaced or augmented by vector search.

## Prompt Format

The provider memory block is explicit and compact:

- `Core Memory`
- `Working Memory`
- `Relevant Long-term Memories`
- `Memory Rules`

Empty sections use `None selected.` so providers can distinguish "no selected memory" from a formatting omission. The older `Known facts about the user:` context-worker format is still accepted and converted before provider injection.

## Provider Memory Intake

Provider responses still support `memory: string[]`. Strings are normalized, filtered, deduplicated, and stored as semantic memories by default unless a safe local classifier infers working, episodic, procedural, core, user, project, conversation, or system metadata.

Rejected provider memory entries are counted by reason without logging raw rejected content:

- non-string
- empty
- low-value
- over max chars
- duplicate
- over max entries

## Future Work

- Add explicit reflection generation from conversation outcomes.
- Add embedding search when a local embedding provider is available.
- Add first-class linked-memory navigation inspired by A-MEM/Zettelkasten beyond the current `tags` and `supersedes` metadata.
- Add a memory compaction job for stale working memories and superseded facts.
