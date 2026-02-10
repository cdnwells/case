# Command Result Delivery to Android

## Context

Claude Code worker executes commands successfully, but results are lost in a fire-and-forget void. The hub logs them and discards. Android never sees what happened — the "명령 대기 중..." spinner just hangs forever. This plan closes the loop: hub stores results, Android polls for them, and displays output as a new message bubble.

## Architecture

```
Android ── POST /chat ──▶ Hub ──▶ GPT Worker ──▶ OpenAI
                                      │
                                      │ POST /command {executionId, command, source}
                                      ▼
                                     Hub ─── 202 Accepted
                                      │
                                      │ (background) forward to Claude Worker
                                      ▼
                                  Claude Worker executes
                                      │
                                      ▼
                                  Hub stores result in Map[executionId]

Android ── GET /command/result/:id ──▶ Hub ──▶ returns stored result

Android creates new message bubble with stdout content
```

## Changes by File

### 1. Hub — `hub/hub.js`

Add in-memory result store and polling endpoint:

- **Result store**: `const results = new Map()` — keyed by `executionId`, stores `{status, result, createdAt}`
- **TTL cleanup**: `setInterval` every 60s, evicts entries older than 10 minutes
- **Modify `POST /command`**: read `executionId` from body, store `{status: "executing", createdAt}` in Map
- **Modify `executeCommandAsync`**: on Claude Worker response, update Map entry to `{status: "completed", result: {...}}` or `{status: "failed", ...}`
- **New `GET /command/result/:executionId`**: returns the stored entry or 404

### 2. GPT Worker Model — `workers/gpt/app/models/message.py`

- Add `execution_id: Optional[str]` field to `Message`
- Add `model_config` with `alias_generator` (snake_case → camelCase) and `populate_by_name=True` so FastAPI serializes as `executionId`, `hasCommands`, `executionStatus` etc. for Android

### 3. GPT Worker Hub Service — `workers/gpt/app/services/hub_service.py`

- Generate `executionId` (UUID) before sending to hub
- Include `executionId` in the POST payload
- Change return type from `bool` to `tuple[bool, str | None]` — returns `(success, executionId)`

### 4. GPT Worker Chat Route — `workers/gpt/app/api/routes/chat.py`

- Unpack `(commands_sent, execution_id)` from `send_commands_to_hub()`
- Pass `execution_id` to `Message` constructor

### 5. Android Types — `android/types/chat.ts`

- Add `executionId?: string` to `Message` interface
- Add `CommandResultResponse` interface: `{status, executionId, result?}`

### 6. Android API Interface — `android/services/api/types.ts`

- Add `pollCommandResult(executionId: string): Promise<CommandResultResponse>` to `IChatService`

### 7. Android Chat Service — `android/services/api/chatService.ts`

- Add `pollCommandResult()` method: `GET /command/result/:executionId`

### 8. Android Mock Service — `android/services/api/mockChatService.ts`

- Add mock `pollCommandResult()` that returns completed after delay

### 9. Android Chat Hook — `android/hooks/useChat.ts`

- Add `startPolling(executionId, originalMessageId)` callback
- After receiving a response with `hasCommands && executionId`, start polling
- On `completed`: update original message status to "completed", append new assistant message bubble with stdout
- On `failed`: update original message status to "failed"
- Track timers in `useRef<Map>`, cleanup on unmount and `clearMessages`
- Polling config: 2s initial delay, 3s interval, max 60 attempts (3 min timeout)

### 10. Android Message Bubble — `android/components/chat/MessageBubble.tsx`

- Add `executing` status display: spinner + "명령 실행 중..."

## Polling Strategy

| Parameter | Value |
|-----------|-------|
| Initial delay | 2,000 ms |
| Poll interval | 3,000 ms |
| Max attempts | 60 (= 3 min) |
| Error backoff | 6,000 ms |
| Hub TTL | 10 minutes |
| Hub cleanup interval | 60 seconds |

## Implementation Order

1. Hub: result store + cleanup + GET endpoint + modify POST/executeCommandAsync
2. GPT Worker: model (execution_id + camelCase) → hub_service (generate ID) → chat route (pass ID)
3. Android: types → api service → hook (polling) → MessageBubble (executing state)

## Verification

1. Send a chat message that triggers a command (e.g. "홈 디렉토리의 파일을 보여줘")
2. Confirm GPT response JSON includes `executionId`
3. Confirm `GET /command/result/:id` returns `executing` then `completed`
4. Confirm Android shows: "명령 대기 중..." → "명령 실행 중..." → "✓ 명령 실행 완료"
5. Confirm new message bubble appears with Claude Code stdout
6. Confirm hub Map entries are cleaned up after 10 minutes
