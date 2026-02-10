# Ollama Worker Implementation Plan

## Overview
Create a new Python worker app at `/home/cdnwell/projects/case/workers/ollama/` that integrates with the Ollama API using the `gpt-oss-20b` model. This worker will follow the same patterns as the existing `gpt` and `ssh` workers.

**Key Features:**
- Streaming response support
- Response parsing (extract shell commands from markdown)
- API key authentication

## Directory Structure
```
workers/ollama/
├── app/
│   ├── __init__.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── dependencies.py      # API key authentication
│   │   └── routes/
│   │       ├── __init__.py
│   │       ├── chat.py          # POST /chat endpoint (with streaming)
│   │       └── health.py        # GET /health endpoint
│   ├── core/
│   │   ├── __init__.py
│   │   └── exceptions.py        # Custom exceptions
│   ├── models/
│   │   ├── __init__.py
│   │   ├── chat.py              # Request/response Pydantic models
│   │   └── message.py           # Message and ShellCommand models
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ollama_service.py    # Ollama API client (streaming)
│   │   └── message_parser.py    # Extract commands from responses
│   └── config.py                # Pydantic settings
├── main.py                      # FastAPI app entry point
├── requirements.txt
└── .env.example
```

## Key Files to Create

### 1. `main.py` - FastAPI Application
- Lifespan manager for startup/shutdown
- CORS middleware
- Request ID middleware
- Global exception handler
- Router includes for health and chat

### 2. `app/config.py` - Configuration
```python
class Settings(BaseSettings):
    HOST: str = "0.0.0.0"
    PORT: int = 8002  # Different port from gpt(8000) and ssh(8001)
    DEBUG: bool = False

    # Ollama
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gpt-oss-20b"
    OLLAMA_TIMEOUT: int = 120  # seconds (local models can be slower)

    # Authentication
    API_KEY: str

    # Security
    ALLOWED_ORIGINS: str = "*"
```

### 3. `app/services/ollama_service.py` - Ollama Client
- Uses `httpx` for async HTTP requests to Ollama API
- Endpoints:
  - `POST /api/chat` for chat completions
  - `GET /api/tags` for listing models
- Singleton pattern matching other workers
- Handles streaming responses

### 4. `app/api/routes/chat.py` - Chat Endpoint
- `POST /chat` - Send message and get response
- Validates authentication via dependencies
- Uses ollama_service for API calls
- Supports streaming via SSE
- Returns standardized response format

### 5. `app/api/routes/health.py` - Health Check
- `GET /health` - Returns worker status
- Checks Ollama connectivity
- Reports model availability

### 6. `app/models/chat.py` - Pydantic Models
```python
class ChatRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=10000)
    conversationId: Optional[str] = None
    stream: bool = False

class ChatResponse(BaseModel):
    message: str
    model: str
    conversationId: Optional[str] = None
    commands: Optional[List[ShellCommand]] = None  # Parsed commands
```

### 7. `app/models/message.py` - Message Parsing Models
```python
class ShellCommand(BaseModel):
    command: str
    description: Optional[str] = None
    requires_confirmation: bool = False

class MessageContent(BaseModel):
    text: str
    commands: List[ShellCommand] = []
```

### 8. `app/services/message_parser.py` - Response Parser
- Regex-based extraction of shell commands from markdown code blocks
- Parses ```shell blocks with optional metadata
- Similar to GPT worker's message_parser.py

### 9. `app/core/exceptions.py` - Custom Exceptions
- `OllamaException` (502) - API errors
- `AuthenticationException` (401)
- `ModelNotFoundError` (404)

### 10. `requirements.txt`
```
fastapi>=0.115.0
uvicorn>=0.30.0
pydantic>=2.9.0
pydantic-settings>=2.5.0
httpx>=0.27.0
python-dotenv>=1.0.0
sse-starlette>=1.6.0  # For streaming responses
```

## Ollama API Integration

The Ollama API runs locally at `http://localhost:11434`. Key endpoints:

### Chat API (Non-streaming)
```
POST /api/chat
{
  "model": "gpt-oss-20b",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": false
}
```

### Chat API (Streaming)
```
POST /api/chat
{
  "model": "gpt-oss-20b",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": true
}
# Returns NDJSON (newline-delimited JSON) stream
```

### List Models
```
GET /api/tags
```

## Implementation Steps

1. Create directory structure
2. Create `requirements.txt`
3. Create `.env.example`
4. Create `app/config.py`
5. Create `app/core/exceptions.py`
6. Create `app/models/message.py`
7. Create `app/models/chat.py`
8. Create `app/services/message_parser.py`
9. Create `app/services/ollama_service.py`
10. Create `app/api/dependencies.py`
11. Create `app/api/routes/health.py`
12. Create `app/api/routes/chat.py`
13. Create all `__init__.py` files
14. Create `main.py`

## Verification

1. Start Ollama: `ollama serve` (if not running)
2. Verify model available: `ollama list` (should show gpt-oss-20b)
3. Install dependencies: `pip install -r requirements.txt`
4. Run worker: `python main.py`
5. Test health: `curl http://localhost:8002/health`
6. Test chat: `curl -X POST http://localhost:8002/chat -H "X-API-Key: <key>" -H "Content-Type: application/json" -d '{"content": "Hello"}'`
