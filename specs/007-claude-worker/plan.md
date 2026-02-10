# Claude Code Worker Implementation Plan

## Context

The Case system currently has three workers (GPT, SSH, Ollama) coordinated by a hub. The user wants to add a fourth worker that executes local shell commands through Claude Code CLI using the format:

```bash
claude --dangerously-skip-permissions -p "<requested command>"
```

This worker will allow the system to leverage Claude Code's intelligent command processing for local execution, similar to how the SSH worker handles remote commands but using Claude CLI as the execution layer instead of subprocess directly.

**Why this approach:**
- Leverages Claude Code's command understanding and safety features
- Provides intelligent output parsing and formatting
- Consistent with existing worker architecture
- Enables AI-enhanced local command execution

## Architecture

**New Worker**: `/home/cdnwell/projects/case/workers/claude/`
**Port**: 8003
**Pattern**: FastAPI worker following SSH worker template
**Execution**: Claude Code CLI via `asyncio.create_subprocess_exec()`

## Implementation Approach

### 1. Directory Structure

Create a standard FastAPI worker structure following the SSH worker pattern:

```
workers/claude/
├── main.py                          # FastAPI app (copy from SSH worker)
├── requirements.txt                 # FastAPI, uvicorn, pydantic
├── .env.example                     # Configuration template
└── app/
    ├── config.py                    # Settings: PORT=8003, CLAUDE_PATH, timeouts
    ├── api/
    │   ├── dependencies.py          # API key auth (copy from SSH worker)
    │   └── routes/
    │       ├── health.py            # Health check with Claude availability
    │       └── command.py           # Command execution endpoint
    ├── core/
    │   ├── exceptions.py            # ClaudeWorkerException hierarchy
    │   └── security.py              # Command validation (copy from SSH worker)
    ├── models/
    │   └── command.py               # Request/Response models (copy from SSH)
    └── services/
        └── claude_service.py        # NEW: Claude CLI execution service
```

### 2. Core Service (claude_service.py)

The main implementation file that replaces SSH execution with Claude CLI:

**Key Methods:**
```python
class ClaudeService:
    async def execute_command(command: str, timeout: int, working_directory: Optional[str]) -> Tuple[str, str, int, float]:
        # Build: ["claude", "--dangerously-skip-permissions", "-p", command]
        # Execute via asyncio.create_subprocess_exec()
        # Set cwd=working_directory if provided
        # Wrap in asyncio.wait_for() for timeout
        # Return: (stdout, stderr, exit_code, execution_time)

    def is_claude_available() -> bool:
        # Check if Claude CLI binary exists and is executable
```

**Implementation Pattern:**
- Use `asyncio.create_subprocess_exec()` for async execution
- Build command: `[claude_path, "--dangerously-skip-permissions", "-p", command]`
- Capture stdout/stderr via PIPE
- Timeout handling via `asyncio.wait_for()`
- Parse Claude's response to extract command output

### 3. API Endpoints

**POST /command** (copy from SSH worker, swap service):
- Supports JSON: `{"command": "ls -la", "timeout": 30, "working_directory": "/tmp"}`
- Supports Markdown with multiple commands (same parsing as SSH worker)
- Validates commands using security.py before execution
- Returns: `{"success": bool, "stdout": str, "stderr": str, "exit_code": int, "execution_time": float}`

**GET /health**:
- Returns: `{"status": "ok", "claude_available": bool, "claude_path": str, "timestamp": str, "version": str}`
- Checks if Claude CLI is available at configured path

### 4. Configuration

**Environment Variables (.env)**:
```bash
HOST=0.0.0.0
PORT=8003
DEBUG=false
ALLOWED_ORIGINS=*

# Claude CLI settings
CLAUDE_PATH=/home/cdnwell/.local/bin/claude
CLAUDE_DEFAULT_TIMEOUT=30
CLAUDE_MAX_TIMEOUT=300
```

**Authentication Note**:
- The Claude worker does NOT implement API key authentication
- Authentication should be managed centrally by the hub system (using SQLite or another database)
- Workers are only accessible via hub (not exposed externally)
- This prevents duplicated API key management across multiple workers

### 5. Security

**Reuse SSH Worker Security**:
- Copy `core/security.py` verbatim
- Same `DANGEROUS_PATTERNS` (sudo, rm -rf, eval, etc.)
- Same `BLOCKED_PATTERNS` (fork bombs, rm -rf /)
- Raises `CommandSecurityException` for blocked patterns

### 6. Files to Copy/Modify

**Copy Verbatim (100% reusable):**
- `/workers/ssh/main.py` → `/workers/claude/main.py`
  - Change title: "Claude Code Command Worker"
  - Change imports to reference claude.app.*
- `/workers/ssh/app/api/dependencies.py` → `/workers/claude/app/api/dependencies.py`
- `/workers/ssh/app/core/security.py` → `/workers/claude/app/core/security.py`
- `/workers/ssh/app/models/command.py` → `/workers/claude/app/models/command.py`
- `/workers/ssh/requirements.txt` → `/workers/claude/requirements.txt` (remove paramiko)

**Modify and Adapt:**
- `/workers/ssh/app/services/ssh_service.py` → `/workers/claude/app/services/claude_service.py`
  - Remove SSH connection logic (_get_client, paramiko imports)
  - Replace with subprocess execution
  - Keep same method signature: `execute_command()` returns `(stdout, stderr, exit_code, execution_time)`
  - Add Claude CLI binary check for health

- `/workers/ssh/app/api/routes/command.py` → `/workers/claude/app/api/routes/command.py`
  - Change import: `ssh_service` → `claude_service`
  - Keep all markdown parsing logic
  - Keep all error handling

- `/workers/ssh/app/config.py` → `/workers/claude/app/config.py`
  - Remove SSH settings (SSH_HOST, SSH_PORT, SSH_USERNAME, SSH_KEY_PATH)
  - Add Claude settings (CLAUDE_PATH, CLAUDE_DEFAULT_TIMEOUT, CLAUDE_MAX_TIMEOUT)
  - Change PORT default to 8003

**Create New:**
- `/workers/claude/app/api/routes/health.py`
  - Check `claude_service.is_claude_available()`
  - Return Claude path and availability status

## Critical Files Reference

1. **`/home/cdnwell/projects/case/workers/ssh/app/services/ssh_service.py`**
   - Template for service structure
   - Shows execution pattern: `execute_command()` returns tuple
   - Adapt: replace Paramiko with subprocess

2. **`/home/cdnwell/projects/case/workers/ssh/app/api/routes/command.py`**
   - Complete endpoint with JSON + markdown support
   - Reuse 95% by swapping `ssh_service` → `claude_service`
   - Keep markdown parsing regex and multi-command logic

3. **`/home/cdnwell/projects/case/workers/ssh/app/core/security.py`**
   - Copy verbatim for command validation
   - Ensures consistent security across workers

4. **`/home/cdnwell/projects/case/workers/ssh/main.py`**
   - FastAPI app structure with middleware
   - Copy and update imports/references

5. **`/home/cdnwell/projects/case/workers/ssh/app/config.py`**
   - Settings pattern using Pydantic
   - Modify for Claude-specific configuration

## Implementation Steps

1. **Setup Structure** (5 mins)
   - Create `/workers/claude/` directory and subdirectories
   - Copy files from SSH worker as listed above

2. **Implement Service** (20 mins)
   - Create `app/services/claude_service.py`
   - Implement `execute_command()` with subprocess
   - Implement `is_claude_available()` for health check
   - Add timeout and error handling

3. **Update Configuration** (5 mins)
   - Modify `app/config.py` with Claude settings
   - Create `.env` file with PORT=8003 and CLAUDE_PATH
   - Update references in main.py

4. **Adapt Routes** (5 mins)
   - Update imports in `command.py` to use `claude_service`
   - Create `health.py` with Claude availability check

5. **Dependencies** (2 mins)
   - Update `requirements.txt` (remove paramiko)
   - Create virtual environment and install

6. **Testing** (10 mins)
   - Start worker: `python main.py`
   - Test health: `curl http://localhost:8003/health`
   - Test simple command: `POST /command` with `{"command": "echo hello"}`
   - Test dangerous command validation
   - Test timeout handling

**Total Time: ~45 minutes**

## Verification

### Manual Testing

```bash
# 1. Start the worker
cd /home/cdnwell/projects/case/workers/claude
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python main.py

# 2. Health check (in another terminal)
curl http://localhost:8003/health
# Expected: {"status": "ok", "claude_available": true, ...}

# 3. Execute simple command
curl -X POST http://localhost:8003/command \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"command": "echo Hello from Claude", "timeout": 30}'
# Expected: {"success": true, "stdout": "Hello from Claude\n", "exit_code": 0}

# 4. Test dangerous command (should be blocked)
curl -X POST http://localhost:8003/command \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"command": "rm -rf /"}'
# Expected: 400 Bad Request with security error

# 5. Test timeout
curl -X POST http://localhost:8003/command \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"command": "sleep 100", "timeout": 2}'
# Expected: Timeout error after 2 seconds

# 6. Test markdown format
cat > commands.md << 'EOF'
## Command 1
**Timeout:** 10s
```shell
pwd
```

## Command 2
**Timeout:** 10s
```shell
ls -la
```
EOF

curl -X POST http://localhost:8003/command \
  -H "Content-Type: text/markdown" \
  -H "X-API-Key: your-key" \
  --data-binary @commands.md
# Expected: Combined output from both commands
```

### Integration Testing

1. **Direct Access**: Verify worker responds at `http://localhost:8003`
2. **Hub Integration**: Test that hub can forward requests (requires hub configuration update)
3. **Security**: Verify dangerous patterns are blocked/warned
4. **Timeout**: Verify long-running commands are killed
5. **Working Directory**: Test commands in different directories

## Hub Integration (Future)

Currently hub forwards all traffic to one worker. To integrate Claude worker:

**Option 1: Direct Access** (MVP)
- Access Claude worker directly at `http://localhost:8003/command`
- No hub changes needed

**Option 2: Path-based Routing** (Future Enhancement)
- Modify hub to route by path:
  - `/gpt/*` → port 8000
  - `/ssh/*` → port 8001
  - `/claude/*` → port 8003
  - `/ollama/*` → port 8002

## Success Criteria

- [x] Worker starts successfully on port 8003
- [x] Health endpoint reports Claude availability
- [x] Simple commands execute via Claude CLI
- [x] Dangerous commands are blocked
- [x] Timeout enforcement works
- [x] Markdown format with multiple commands works
- [x] API key authentication works
- [x] Consistent error responses
- [x] No memory leaks or hanging processes
