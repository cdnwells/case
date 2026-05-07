# Context Manager for LLM Chat App

## Context

Currently, every chat message is sent to GPT independently with no conversation history or memory. The `conversation_history=None` TODO in the GPT worker confirms this gap. The user wants a **memory system** that extracts and persists only important information (user facts, preferences) — not raw chat history — using file-based storage and the existing hub-and-spoke architecture.

## Approach: GPT-Integrated Memory Extraction

GPT's response format gains an optional `memory` field. GPT decides what's worth remembering in the same API call (no extra LLM cost). The Hub orchestrates loading context before each chat and saving new memories after.

### Data Flow

```
Android POST /chat { content }
  → Hub loads context: GET /context → Context Worker (port 8001)
  → Hub injects context into request: { content, context }
  → Hub forwards to GPT Worker (port 8000)
  → GPT responds: { message, action?, memory? }
  → Hub extracts memory[] → POST /context/memories to Context Worker
  → Hub strips memory field → returns clean response to Android
```

---

## Phase 1: New Context Worker (`workers/context/`)

A new Python/FastAPI spoke on port 8001 that manages file-based memory storage.

### Directory Structure

```
workers/context/
├── main.py
├── requirements.txt
├── .env / .env.example
├── .gitignore
├── data/                    # Runtime data (gitignored)
│   └── memories.json
└── app/
    ├── __init__.py
    ├── config.py
    ├── api/
    │   ├── __init__.py
    │   └── routes/
    │       ├── __init__.py
    │       ├── health.py
    │       └── context.py
    ├── models/
    │   ├── __init__.py
    │   └── context.py
    ├── services/
    │   ├── __init__.py
    │   └── memory_service.py
    └── core/
        ├── __init__.py
        └── exceptions.py
```

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/context` | Returns formatted context string for LLM prompt injection |
| `GET` | `/context/memories` | Returns all stored memories |
| `POST` | `/context/memories` | Save new memory entries (with deduplication) |
| `DELETE` | `/context/memories/:id` | Remove a specific memory |
| `GET` | `/health` | Health check |

### Key Implementation Details

- **`memory_service.py`**: File-based persistence with `filelock` for concurrent access safety
  - Reads/writes `data/memories.json`
  - Deduplicates by case-insensitive content matching
  - Caps at configurable `MAX_MEMORIES` (default 200), keeping most recent
  - `format_for_prompt()` returns formatted string: `"Known facts about the user:\n- fact1\n- fact2"`

- **Models** (`models/context.py`):
  - `Memory`: `{ id, content, created_at, source }`
  - `MemoriesRequest`: `{ memories: string[], source }`
  - `ContextResponse`: `{ context: string, memory_count: int }`

- **Follow existing worker patterns** from `workers/gpt/` for: main.py structure, CORS setup, config via pydantic-settings, health endpoint

### Dependencies (`requirements.txt`)

```
fastify>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.9.0
pydantic-settings>=2.5.0
python-dotenv>=1.0.0
filelock>=3.13.0
```

---

## Phase 2: GPT Worker Changes

### Files to Modify

**`workers/gpt/app/models/chat.py`** — Add `context` field to `SendMessageRequest`:
```python
context: Optional[str] = Field(None, description="Injected context from memory system")
```

**`workers/gpt/app/services/openai_service.py`** — Accept `context` parameter in `create_chat_response`, append to system prompt:
```python
async def create_chat_response(self, user_content, conversation_history=None, context=None):
    system_content = SYSTEM_PROMPT
    if context:
        system_content = f"{SYSTEM_PROMPT}\n\n{context}"
    messages = [ChatMessage(role="system", content=system_content)]
    ...
```

**`workers/gpt/app/services/message_parser.py`** — Modify `parse_message_content` to return `tuple[MessageContent, list[str] | None]`, extracting `memory` field from parsed JSON.

**`workers/gpt/app/api/routes/chat.py`** — Wire context through to OpenAI service, attach extracted memory to response dict for hub extraction.

**`workers/gpt/docs/response_format.md`** — Document the new `memory` field:
- Optional list of notable facts/preferences learned from the exchange
- Include only when user reveals lasting personal information
- Do NOT include for transient requests, commands, or general questions
- Examples: name, preferences, occupation, pet names, etc.

---

## Phase 3: Hub Changes

### Files to Modify

**`hub/hub.js`**:

1. **Config** — Add `contextWorkerUrl: process.env.CONTEXT_WORKER_URL || 'http://localhost:8001'`

2. **Dedicated `POST /chat` route** (before the catch-all `/*`):
   - Step 1: `GET /context` from Context Worker (non-fatal on failure)
   - Step 2: Inject context into request body, forward to GPT Worker
   - Step 3: Extract `memory[]` from response, `POST /context/memories` to Context Worker (fire-and-forget style, non-fatal)
   - Step 4: Strip `memory` field, return clean response to Android

3. **`selectWorkerUrl`** — Add `/context` → Context Worker routing for catch-all passthrough

**`hub/.env`** — Add `CONTEXT_WORKER_URL="http://localhost:8001"`

---

## Phase 4: Documentation

**`CLAUDE.md`** — Add hub-and-spoke architecture section:

```markdown
# Architecture: Hub-and-Spoke

Hub (Node.js/Fastify, port 5000) routes to specialized workers:

| Worker  | Port | Purpose                              |
|---------|------|--------------------------------------|
| GPT     | 8000 | Chat via OpenAI GPT                  |
| Context | 8001 | Memory/context file storage           |
| Claude  | 8003 | Command execution via Claude Code CLI|

Adding a new worker:
1. Create workers/<name>/ following existing patterns
2. Add <NAME>_WORKER_URL to hub/.env
3. Add routing in hub/hub.js (selectWorkerUrl or dedicated route)
4. Worker must have GET /health endpoint
```

---

## Implementation Order

1. **Context Worker** — Create all files, install deps, verify standalone with curl
2. **GPT Worker changes** — Update models, parser, service, route, docs
3. **Hub changes** — Add config, dedicated /chat route, routing update
4. **CLAUDE.md** — Add architecture documentation
5. **Commit** — Single commit with all changes

---

## Verification

1. **Context Worker standalone**:
   ```
   curl http://localhost:8001/health
   curl http://localhost:8001/context  # empty context
   curl -X POST http://localhost:8001/context/memories -H "Content-Type: application/json" -d '{"memories":["test fact"]}'
   curl http://localhost:8001/context  # should show fact
   ```

2. **GPT Worker with context**:
   ```
   curl -X POST http://localhost:8000/chat -H "Content-Type: application/json" \
     -d '{"content":"내 이름은 정호야","context":"Known facts about the user:\n- none yet"}'
   # Response should include memory field
   ```

3. **End-to-end through Hub**:
   ```
   curl -X POST http://localhost:5000/chat -H "Content-Type: application/json" \
     -d '{"content":"내 이름은 정호야"}'
   # Check workers/context/data/memories.json is created
   # Send another message — GPT should reference user's name
   ```

4. **Android app**: No changes needed. Fully backward compatible.
