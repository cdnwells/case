# Computer Command Execution Workflow Implementation Plan

## Context

The Case system needs to support computer command execution across multiple components:
- **Android app** sends natural language instructions via chat
- **GPT Worker** extracts shell commands from AI responses
- **Hub** routes requests and manages async execution
- **Claude Worker** executes commands via Claude CLI

Currently, the GPT worker can extract commands but there's no complete flow for:
1. Routing commands from Hub to Claude Worker
2. Providing status feedback to Android users
3. Handling async command execution while maintaining synchronous chat

This implementation enables the full workflow: Android → Hub → GPT Worker (extracts commands) → Hub (routes to Claude) → Claude Worker (executes) → status feedback to Android.

## Architecture Overview

**Design Decisions:**
- **Path-based routing**: Hub routes `/chat` to GPT Worker, `/command` to Claude Worker
- **Fire-and-forget execution**: Commands execute asynchronously, chat responses remain synchronous
- **Status tracking**: Extend existing Message model with execution metadata
- **No WebSocket/SSE**: Keep architecture simple, use existing HTTP/REST patterns

**Data Flow:**
```
Android → Hub → GPT Worker → OpenAI
                    ↓
          Extract commands → Hub (fire-and-forget) → Claude Worker
                    ↓                                      ↓
          Return chat response                    Execute via Claude CLI
          (execution_status: "queued")                     ↓
                    ↓                              Log results at Hub
          Android shows "executing" indicator
```

## Implementation Steps

### Step 1: Hub Multi-Worker Routing

**File**: `/home/cdnwell/projects/case/hub/hub.js`

**Changes:**
1. Add `CLAUDE_WORKER_URL` environment variable (default: `http://localhost:8003`)
2. Implement worker selection function based on request path
3. Add dedicated `/command` endpoint for async command execution
4. Create fire-and-forget command forwarding function

**Specific modifications:**

```javascript
// Add to config (line 6-10)
const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  pythonWorkerUrl: process.env.PYTHON_WORKER_URL || 'http://localhost:8000',
  claudeWorkerUrl: process.env.CLAUDE_WORKER_URL || 'http://localhost:8003', // NEW
  forwardTimeout: parseInt(process.env.FORWARD_TIMEOUT_MS || '120000', 10),
}

// Add worker selection function (after config)
function selectWorkerUrl(path) {
  if (path.startsWith('/command')) {
    return config.claudeWorkerUrl
  }
  return config.pythonWorkerUrl
}

// Add async command execution function (after forwardToWorker)
function executeCommandAsync(url, body, headers, logger) {
  const forwardHeaders = { ...headers }
  delete forwardHeaders['host']
  delete forwardHeaders['connection']
  delete forwardHeaders['keep-alive']
  delete forwardHeaders['transfer-encoding']
  delete forwardHeaders['content-length']

  forwardHeaders['x-forwarded-by'] = 'echo-hub'
  forwardHeaders['X-API-key'] = hubApiKey

  const fetchOptions = {
    method: 'POST',
    headers: forwardHeaders,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  }

  if (typeof body !== 'string') {
    forwardHeaders['content-type'] = 'application/json'
  }

  // Fire and forget - don't await
  fetch(url, fetchOptions)
    .then(res => res.json())
    .then(result => logger.info({ result }, 'Command executed'))
    .catch(err => logger.error({ err }, 'Command execution failed'))
}

// Add /command endpoint (before catch-all route, around line 68)
fastify.post('/command', async (request, reply) => {
  const { body, headers } = request
  request.log.info({ body }, 'Command received')

  // Return immediately with 202 Accepted
  reply.code(202).send({
    status: 'working',
    message: 'Commands queued for execution'
  })

  // Execute in background
  const claudeUrl = `${config.claudeWorkerUrl}/command`
  executeCommandAsync(claudeUrl, body, headers, request.log)
})

// Update catch-all route to use selectWorkerUrl (line 75)
fastify.all('/*', async (request, reply) => {
  const { method, url, headers, body } = request
  request.log.info({ method, url }, 'Hub received')

  try {
    const workerUrl = selectWorkerUrl(url) // CHANGED: use selected worker
    const response = await forwardToWorker({
      method,
      path: url,
      headers,
      body,
      workerUrl // PASS worker URL
    }, request.log)

    reply.code(response.status)
    if (response.contentType) {
      reply.header('content-type', response.contentType)
    }
    return response.data
  } catch (err) {
    // ... existing error handling
  }
})

// Update forwardToWorker to accept workerUrl parameter (line 20)
async function forwardToWorker({ method, path, headers, body, workerUrl }, logger) {
  const url = `${workerUrl || config.pythonWorkerUrl}${path}` // CHANGED
  // ... rest of function unchanged
}
```

**Environment variables** (`.env`):
```bash
CLAUDE_WORKER_URL=http://localhost:8003
```

### Step 2: GPT Worker Status Tracking

**File**: `/home/cdnwell/projects/case/workers/gpt/app/models/message.py`

**Changes**: Add execution metadata fields to Message model (after line 39)

```python
class Message(BaseModel):
    """Message matching Android app's expected format"""

    id: str = Field(default_factory=lambda: f"msg_{uuid4().hex[:12]}")
    content: str = Field(..., description="Message content (may contain command blocks)")
    role: Literal["user", "assistant"] = Field(..., description="Message role")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    status: Literal["sending", "sent", "error"] = Field(default="sent")
    parsed_content: Optional[MessageContent] = Field(
        None, description="Structured content with extracted commands"
    )
    # NEW fields
    execution_status: Optional[Literal["queued", "executing", "completed", "failed"]] = Field(
        None, description="Command execution status"
    )
    has_commands: Optional[bool] = Field(
        None, description="Whether message contains commands"
    )
```

**File**: `/home/cdnwell/projects/case/workers/gpt/app/api/routes/chat.py`

**Changes**: Update response to include execution metadata (lines 39-52)

```python
# Send commands to hub if any were extracted
commands_sent = False
if parsed_content.commands:
    commands_sent = await send_commands_to_hub(parsed_content.commands)
    logger.info(f"Commands sent to hub: {commands_sent}")

# Determine execution status
execution_status = None
has_commands = False
if parsed_content.commands:
    has_commands = True
    execution_status = "queued" if commands_sent else "failed"

# Create message matching Android app's expected format
# Use cleaned text (without command blocks) as content
message = Message(
    content=parsed_content.text,
    role="assistant",
    status="sent",
    parsed_content=parsed_content,
    execution_status=execution_status,  # NEW
    has_commands=has_commands,          # NEW
)

return SendMessageResponse(message=message)
```

**File**: `/home/cdnwell/projects/case/workers/gpt/app/config.py`

**Changes**: Update HUB_COMMAND_URL to point to new endpoint

```python
# Around line with HUB_COMMAND_URL
HUB_COMMAND_URL: Optional[str] = Field(
    default="http://localhost:5000/command",  # CHANGED: added /command
    description="Hub endpoint for sending commands"
)
```

### Step 3: Android UI Enhancements

**File**: `/home/cdnwell/projects/case/android/types/chat.ts`

**Changes**: Extend Message interface (lines 1-7)

```typescript
export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
  executionStatus?: 'queued' | 'executing' | 'completed' | 'failed'; // NEW
  hasCommands?: boolean; // NEW
}
```

**File**: `/home/cdnwell/projects/case/android/components/chat/MessageBubble.tsx` (create if doesn't exist)

**Changes**: Add visual indicators for command execution status

```typescript
// Example implementation showing execution status
{message.hasCommands && (
  <View style={styles.commandIndicator}>
    {message.executionStatus === 'queued' && (
      <>
        <ActivityIndicator size="small" />
        <Text>명령 대기 중...</Text>
      </>
    )}
    {message.executionStatus === 'completed' && (
      <>
        <Icon name="check-circle" />
        <Text>명령 실행 완료</Text>
      </>
    )}
    {message.executionStatus === 'failed' && (
      <>
        <Icon name="error" />
        <Text>명령 실행 실패</Text>
      </>
    )}
  </View>
)}
```

### Step 4: Claude Worker Configuration

**File**: `/home/cdnwell/projects/case/workers/claude/.env`

**Verify configuration**:
```bash
HOST=0.0.0.0
PORT=8003
CLAUDE_PATH=/home/cdnwell/.local/bin/claude
DEFAULT_TIMEOUT=30
MAX_TIMEOUT=300
ALLOWED_ORIGINS=http://localhost:5000
```

**No code changes needed** - Claude Worker is already fully implemented with:
- POST /command endpoint (JSON and markdown support)
- Command execution via Claude CLI
- Security validation
- Timeout handling
- Detailed error responses

### Step 5: Error Handling & Logging

**Hub Level** (`hub.js`):
- Already logs command execution results in `executeCommandAsync`
- Add optional: Store failed commands in memory for debugging

**GPT Worker** (`chat.py`):
- Already captures success/failure from `send_commands_to_hub()`
- Sets `execution_status` accordingly

**Claude Worker**:
- Already validates commands via `security.validate_command()`
- Returns detailed error messages in CommandResponse

**Android**:
- Display execution status visually in message bubbles
- Optional: Add toast notifications for failures

## Critical Files Summary

| File Path | Changes |
|-----------|---------|
| `/home/cdnwell/projects/case/hub/hub.js` | Add multi-worker routing, /command endpoint, async execution |
| `/home/cdnwell/projects/case/workers/gpt/app/api/routes/chat.py` | Add execution status tracking |
| `/home/cdnwell/projects/case/workers/gpt/app/models/message.py` | Add execution_status and has_commands fields |
| `/home/cdnwell/projects/case/workers/gpt/app/config.py` | Update HUB_COMMAND_URL to /command endpoint |
| `/home/cdnwell/projects/case/android/types/chat.ts` | Extend Message interface |
| `/home/cdnwell/projects/case/android/components/chat/MessageBubble.tsx` | Add execution status UI |
| `/home/cdnwell/projects/case/workers/claude/` | No changes - already complete |

## Verification & Testing

### Manual Testing Steps:

1. **Start all services:**
   ```bash
   # Terminal 1: Hub
   cd /home/cdnwell/projects/case/hub
   node hub.js

   # Terminal 2: GPT Worker
   cd /home/cdnwell/projects/case/workers/gpt
   python main.py

   # Terminal 3: Claude Worker
   cd /home/cdnwell/projects/case/workers/claude
   python main.py
   ```

2. **Test chat flow:**
   - Send message from Android: "홈 디렉토리의 파일을 보여줘" (Show files in home directory)
   - Verify GPT Worker extracts command: `ls -la ~`
   - Check Hub logs for command forwarding to Claude Worker
   - Verify Android shows execution status indicator

3. **Test command execution:**
   - Check Hub logs: Should show "Command executed" with results
   - Check Claude Worker logs: Should show command execution details
   - Verify no errors in GPT Worker logs

4. **Test error cases:**
   - Stop Claude Worker
   - Send command-containing message
   - Verify Android shows "failed" execution status
   - Check Hub logs for connection error

### Integration Testing:

```bash
# Test Hub command endpoint directly
curl -X POST http://localhost:5000/command \
  -H "Content-Type: application/json" \
  -d '{"command": "ls -la", "timeout": 30}'
# Should return 202 Accepted immediately

# Test Claude Worker directly
curl -X POST http://localhost:8003/command \
  -H "Content-Type: application/json" \
  -d '{"command": "pwd", "timeout": 30}'
# Should return CommandResponse with execution results
```

### Verification Checklist:

- [ ] Hub routes /chat to GPT Worker (port 8000)
- [ ] Hub routes /command to Claude Worker (port 8003)
- [ ] Hub returns 202 Accepted immediately for /command requests
- [ ] GPT Worker extracts commands from AI responses
- [ ] GPT Worker sends commands to Hub /command endpoint
- [ ] GPT Worker includes execution_status in chat response
- [ ] Claude Worker receives and executes commands
- [ ] Hub logs command execution results
- [ ] Android displays execution status indicators
- [ ] Error cases handled gracefully (worker down, timeout, invalid commands)

## Future Enhancements (Out of Scope)

1. **Command Result Delivery**: Store results in database/Redis, add polling endpoint for Android to retrieve
2. **Real-time Updates**: WebSocket/SSE for pushing execution status to Android
3. **Command History**: Persistent storage and UI for viewing past executions
4. **User Confirmation**: Honor `requires_confirmation` flag with Android dialog
5. **Multi-command Batching**: Execute multiple commands in sequence
6. **Command Output Streaming**: Stream command output in real-time to Android

## Migration & Deployment

**Deployment Order:**
1. Deploy Hub changes (backward compatible)
2. Deploy GPT Worker changes
3. Deploy Android changes (gracefully handles missing fields)
4. Verify Claude Worker is running on port 8003

**Rollback Plan:**
- All changes are additive (no breaking changes)
- Can rollback any component independently
- Existing chat functionality unaffected by /command endpoint

**Configuration Updates:**
- Add `CLAUDE_WORKER_URL=http://localhost:8003` to Hub `.env`
- Update `HUB_COMMAND_URL=http://localhost:5000/command` in GPT Worker `.env`
- Verify Claude Worker port 8003 in `.env`
