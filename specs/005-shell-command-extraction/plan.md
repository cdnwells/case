# Plan: Shell Command Extraction to Hub

## Summary
Modify the system to extract shell commands from AI responses, save them as `.md` files, and transfer them to the hub via HTTP. The conversational response should be human-like without computer commands.

## Changes Required

### 1. Update System Prompt (`docs/system_prompt.md`)
Add instructions telling the AI to:
- Separate shell commands from conversational text
- Format commands in a specific structure that can be parsed
- Keep the main response natural and human-like

### 2. Enhance Message Parser (`app/services/message_parser.py`)
- Extract shell commands from the response
- Generate `.md` file content from extracted commands
- Remove command blocks from the text response

### 3. Add Hub Transfer Service (new file)
- Create `app/services/hub_service.py`
- HTTP client to POST `.md` files to hub
- Handle authentication (reuse existing API key)

### 4. Update Chat Route (`app/api/routes/chat.py`)
- After parsing, transfer command file to hub
- Return clean response without shell commands

## Files to Modify
- `docs/system_prompt.md` - Update AI instructions
- `app/services/message_parser.py` - Enhanced parsing
- `app/api/routes/chat.py` - Add hub transfer call
- `app/services/hub_service.py` (new) - Hub HTTP client

## Configuration
- `HUB_COMMAND_URL` - Environment variable for hub endpoint

## Implementation Steps

1. **Add config setting** (`app/config.py`)
   - Add `HUB_COMMAND_URL: Optional[str] = None`

2. **Update system prompt** (`docs/system_prompt.md`)
   - Instruct AI to keep responses conversational
   - Commands should still use the shell block format (for parsing)
   - AI should not announce commands in natural text

3. **Create hub service** (`app/services/hub_service.py`)
   - `async def send_commands_to_hub(commands: List[ShellCommand]) -> bool`
   - Format commands as markdown content
   - POST to `HUB_COMMAND_URL`

4. **Update chat route** (`app/api/routes/chat.py`)
   - After parsing, send commands to hub
   - Strip command blocks from response content before returning
   - Return clean, human-like message

## Verification
- Test with a prompt that generates shell commands
- Verify hub receives the .md file
- Verify response text is clean without command blocks
