### THIS PLAN IS NOT IMPLEMENTED

# 010: Claude Worker Chat Capability

## Context

The Claude worker (`workers/claude/`, port 8003) currently only handles `/command` requests — executing tasks via `claude` CLI. The GPT worker (`workers/gpt/`, port 8000) handles `/chat` — receiving user messages, responding conversationally as "Case" (Interstellar robot), and extracting actionable commands to forward to the hub.

The goal is to give the Claude worker the same conversational chat capability so it can serve as an alternative to the GPT worker, using the Claude CLI (`claude -p` with `--system-prompt`) instead of the OpenAI API.

## Approach

Mirror the GPT worker's chat pattern inside the existing Claude worker, reusing the same models, message parser, and hub service pattern.

## Files to Create

### 1. `workers/claude/docs/system_prompt.md`

- Same Case persona and JSON response format as `workers/gpt/docs/system_prompt.md`
- Identical content — both workers share the same personality and response contract

### 2. `workers/claude/app/models/chat.py`

- Adapted from `workers/gpt/app/models/chat.py`
- `SendMessageRequest`, `SendMessageResponse`, `ErrorResponse`

### 3. `workers/claude/app/models/message.py`

- Adapted from `workers/gpt/app/models/message.py`
- `ShellCommand`, `MessageContent`, `Message`, `ChatMessage`

### 4. `workers/claude/app/services/message_parser.py`

- Adapted from `workers/gpt/app/services/message_parser.py`
- `load_system_prompt()`, `_try_parse_json()`, `parse_message_content()`
- Loads `docs/system_prompt.md` and parses JSON responses from Claude CLI

### 5. `workers/claude/app/services/hub_service.py`

- Adapted from `workers/gpt/app/services/hub_service.py`
- Source identifier: `"case-claude"` (instead of `"case-gpt"`)
- `send_commands_to_hub()` function

### 6. `workers/claude/app/api/routes/chat.py`

- New chat route: `POST /chat`
- Flow:
  1. Receive `SendMessageRequest`
  2. Call `claude_service.chat()` with user content + system prompt
  3. Parse response with `message_parser.parse_message_content()`
  4. If commands found, send to hub via `hub_service`
  5. Return `SendMessageResponse`

## Files to Modify

### 7. `workers/claude/app/services/claude_service.py`

- Add `async def chat(user_content, system_prompt, timeout)` method
- Runs: `claude --dangerously-skip-permissions --system-prompt "{system_prompt}" -p "{user_content}"`
- Returns raw text output from Claude CLI

### 8. `workers/claude/app/config.py`

- Add `HUB_COMMAND_URL: Optional[str] = "http://localhost:5000/command"`
- Add `CLAUDE_CHAT_TIMEOUT: int = 120` (chat may need more time than command execution)

### 9. `workers/claude/main.py`

- Import and include the new chat router
- `app.include_router(chat.router, prefix="/chat", tags=["chat"])`

### 10. `workers/claude/requirements.txt`

- Add `httpx>=0.27.0` (for hub_service async HTTP calls)

### 11. `hub/hub.js`

- Update `selectWorkerUrl()` to route `/chat-claude` → Claude worker (8003)
- Rewrite path from `/chat-claude` to `/chat` when forwarding

```javascript
function selectWorkerUrl(path) {
  if (path.startsWith("/command") || path.startsWith("/chat-claude")) {
    return config.claudeWorkerUrl;
  }
  return config.pythonWorkerUrl;
}
```

## Hub Routing

Current routing:

- `/command*` → Claude worker (8003)
- `/*` (everything else) → GPT worker (8000)

New routing:

- `/command*` → Claude worker (8003)
- `/chat-claude*` → Claude worker (8003), path rewritten to `/chat`
- `/*` (everything else) → GPT worker (8000)

## Verification

1. Start Claude worker: `cd workers/claude && python main.py`
2. Health check: `curl http://localhost:8003/health`
3. Direct chat test: `curl -X POST http://localhost:8003/chat -H "Content-Type: application/json" -d '{"content": "안녕"}'`
4. Hub route test: `curl -X POST http://localhost:5000/chat-claude -H "Content-Type: application/json" -d '{"content": "홈 디렉토리 파일 보여줘"}'`
5. Verify command extraction: action-triggering message should produce `executionId` and forward to hub
