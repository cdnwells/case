# SSH Shell Command Worker Implementation Plan

## Overview

Create a Python FastAPI worker that:
- Receives HTTP requests with shell commands
- Connects to a remote server via SSH using key-based authentication
- Executes the shell command on the remote server
- Returns the command output in the HTTP response

## Architecture

Following the existing GPT worker pattern in `/workers/gpt/`.

```
/workers/ssh/
├── main.py                    # FastAPI application entry point
├── requirements.txt           # Python dependencies
├── .env.example              # Environment variable template
├── app/
│   ├── __init__.py
│   ├── config.py             # SSH and server configuration
│   ├── api/
│   │   ├── __init__.py
│   │   ├── dependencies.py   # Authentication middleware
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── command.py    # POST /command endpoint
│   │       └── health.py     # GET /health endpoint
│   ├── models/
│   │   ├── __init__.py
│   │   └── command.py        # Request/response models
│   ├── services/
│   │   ├── __init__.py
│   │   └── ssh_service.py    # SSH connection and command execution
│   └── core/
│       ├── __init__.py
│       ├── exceptions.py     # Custom exceptions
│       └── security.py       # Command security validation
```

## Configuration (Environment Variables)

```env
# Server settings
HOST=0.0.0.0
PORT=8001

# SSH connection settings
SSH_HOST=example.com
SSH_PORT=22
SSH_USERNAME=user
SSH_KEY_PATH=/path/to/private/key
SSH_KEY_PASSPHRASE=  # Optional, for encrypted keys

# Authentication
API_KEY=your-api-key

# Security
ALLOWED_ORIGINS=http://localhost:3000
```

## HTTP API Endpoints

### POST /command
Execute a shell command on the remote server.

**Request:**
```json
{
  "command": "ls -la /home",
  "timeout": 30,
  "working_directory": "/home/user"
}
```

**Response:**
```json
{
  "success": true,
  "stdout": "total 8\ndrwxr-xr-x 2 user user 4096 ...",
  "stderr": "",
  "exit_code": 0,
  "execution_time": 0.234
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "ssh_connected": true
}
```

## Key Components

### 1. SSH Service (`app/services/ssh_service.py`)
- Uses `paramiko` library for SSH connections
- Connection pooling for efficiency
- Key-based authentication from config
- Command execution with timeout support
- Handles stdout, stderr, and exit codes

### 2. Security Module (`app/core/security.py`)
Blocked commands (following GPT worker pattern):
- `rm -rf /` and `rm -rf /*`
- Fork bombs
- `sudo rm -rf`
- `mkfs` commands
- `dd` with dangerous targets

Dangerous patterns requiring caution:
- `sudo` commands
- `chmod 777`
- Device writes (`> /dev/`)

### 3. Request Models (`app/models/command.py`)
```python
class CommandRequest(BaseModel):
    command: str  # Shell command to execute
    timeout: int = 30  # Execution timeout (1-300 seconds)
    working_directory: Optional[str] = None

class CommandResponse(BaseModel):
    success: bool
    stdout: str
    stderr: str
    exit_code: int
    execution_time: float
```

### 4. Authentication (`app/api/dependencies.py`)
- API Key authentication via `X-API-Key` header
- Reuses pattern from GPT worker

## Dependencies

```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.9.0
pydantic-settings>=2.5.0
paramiko>=3.4.0
python-dotenv>=1.0.0
```

## Files to Create

| File | Purpose |
|------|---------|
| `workers/ssh/main.py` | FastAPI app initialization |
| `workers/ssh/requirements.txt` | Python dependencies |
| `workers/ssh/.env.example` | Environment template |
| `workers/ssh/app/__init__.py` | Package init |
| `workers/ssh/app/config.py` | Settings from env |
| `workers/ssh/app/api/__init__.py` | API package init |
| `workers/ssh/app/api/dependencies.py` | Auth middleware |
| `workers/ssh/app/api/routes/__init__.py` | Routes package init |
| `workers/ssh/app/api/routes/command.py` | Command endpoint |
| `workers/ssh/app/api/routes/health.py` | Health endpoint |
| `workers/ssh/app/models/__init__.py` | Models package init |
| `workers/ssh/app/models/command.py` | Request/response models |
| `workers/ssh/app/services/__init__.py` | Services package init |
| `workers/ssh/app/services/ssh_service.py` | SSH connection service |
| `workers/ssh/app/core/__init__.py` | Core package init |
| `workers/ssh/app/core/exceptions.py` | Custom exceptions |
| `workers/ssh/app/core/security.py` | Command validation |

## Verification

1. **Start the worker:**
   ```bash
   cd workers/ssh
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8001
   ```

2. **Test health endpoint:**
   ```bash
   curl http://localhost:8001/health
   ```

3. **Test command execution:**
   ```bash
   curl -X POST http://localhost:8001/command \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your-api-key" \
     -d '{"command": "echo hello"}'
   ```

4. **Test security filtering:**
   ```bash
   # Should be rejected
   curl -X POST http://localhost:8001/command \
     -H "Content-Type: application/json" \
     -H "X-API-Key: your-api-key" \
     -d '{"command": "rm -rf /"}'
   ```
