# GPT Worker - Implementation Plan

## Overview

Create a Python FastAPI worker that receives HTTP requests from the Node.js gateway, processes messages through OpenAI GPT, and returns responses with shell command support for future SSH worker integration.

## Goals

- Receive HTTP POST requests from Node.js gateway server
- Parse JSON body with messages and send to OpenAI GPT
- Authenticate requests via OAuth and API key
- Return messages that can contain shell commands for SSH worker

## Technical Approach

- **Framework**: FastAPI with uvicorn
- **Authentication**: Dual strategy (API key for gateway, OAuth for external)
- **AI Integration**: OpenAI Python SDK
- **Message Format**: Structured markdown for shell commands

## Components

### File Structure

```
/mnt/c/Projects/case/workers/gpt/
├── main.py                    # FastAPI entry point
├── requirements.txt           # Dependencies
├── .env.example              # Environment template
├── app/
│   ├── __init__.py
│   ├── config.py             # Settings with pydantic-settings
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── chat.py       # POST /chat endpoint
│   │   │   └── health.py     # GET /health endpoint
│   │   └── dependencies.py   # Auth dependencies
│   ├── models/
│   │   ├── __init__.py
│   │   ├── message.py        # Message, ShellCommand schemas
│   │   ├── chat.py           # Request/Response schemas
│   │   └── command.py        # Command execution schemas
│   ├── services/
│   │   ├── __init__.py
│   │   ├── openai_service.py # OpenAI API client
│   │   └── message_parser.py # Shell command extraction
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── oauth.py          # OAuth validation
│   │   └── api_key.py        # API key validation
│   └── core/
│       ├── __init__.py
│       ├── exceptions.py     # Custom exceptions
│       └── security.py       # Command validation
```

### API Endpoints

**POST /chat**
- Request: `{ content: string, conversationId?: string }`
- Response: `{ message: Message }`
- Message contains: id, content, role, timestamp, status, parsed_content

**GET /health**
- Response: `{ status: "ok", timestamp, version }`

### Authentication

**API Key** (for gateway):
- Header: `X-API-Key`
- Validates against `API_KEY` env var

**OAuth** (for external):
- Bearer token validation
- Introspection with OAuth provider

### Message Format for Shell Commands

GPT responses use structured markdown:
```markdown
```shell {"action": "execute", "confirm": true, "description": "List files"}
ls -la
```
```

Parsed into:
```json
{
  "commands": [{
    "command": "ls -la",
    "description": "List files",
    "requires_confirmation": true,
    "timeout_seconds": 30
  }]
}
```

### Security

**Command Validation:**
- Block dangerous patterns (fork bombs, rm -rf /)
- Flag risky commands for confirmation (sudo, rm -rf)
- Safe commands auto-execute (ls, cat, pwd)

## Implementation Steps

1. **Core Setup**: Project structure, config, base models
2. **OpenAI Service**: GPT integration with system prompt
3. **Message Parser**: Extract shell commands from responses
4. **Chat Endpoint**: Wire up request handling
5. **Authentication**: API key + OAuth dependencies
6. **Security**: Command validation, rate limiting

## Dependencies

```
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
pydantic>=2.9.0
pydantic-settings>=2.5.0
openai>=1.50.0
httpx>=0.27.0
python-dotenv>=1.0.0
python-multipart>=0.0.9
```

## Trade-offs & Decisions

1. **Dual Authentication**: API key for internal gateway, OAuth for external - provides flexibility
2. **Structured Command Format**: Using JSON metadata in markdown code blocks for command parsing
3. **Command Security**: Blocking dangerous patterns while allowing useful commands
4. **Stateless Design**: No conversation persistence initially (can add Redis later)

## Open Questions

1. OAuth provider selection (Auth0, Okta, custom?)
2. Rate limiting strategy (per-user vs global)
3. Conversation history storage (Redis, PostgreSQL?)

## Verification

1. Start worker: `uvicorn main:app --reload`
2. Test health: `curl http://localhost:8000/health`
3. Test chat:
   ```bash
   curl -X POST http://localhost:8000/chat \
     -H "Content-Type: application/json" \
     -H "X-API-Key: test-key" \
     -d '{"content": "How do I list files?"}'
   ```
4. Verify response matches Android app's expected format
5. Test through gateway on port 5000
