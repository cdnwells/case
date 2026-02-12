# Plan: Share Worker Persona Configuration

## Context

Currently, only the GPT worker has a defined persona (Case from Interstellar) at `workers/gpt/docs/system_prompt.md`. This persona should be shared across all conversational workers (GPT, Ollama) to maintain consistent character behavior, while worker-specific formatting instructions (like GPT's JSON structure) should remain separate.

**Why this change is needed:**
- Maintain consistent Case personality across different AI workers
- Allow workers to share core persona while having their own response formats
- Make it easier to update Case's personality in one place
- Enable Ollama worker to also use the Case persona

## Current State

**File:** `workers/gpt/docs/system_prompt.md` (70 lines)
- **Lines 1-9:** Case persona definition (Korean language, Interstellar robot, interaction rules)
- **Lines 11-70:** GPT-specific JSON response format instructions

**GPT Worker:** Loads this combined prompt via `workers/gpt/app/services/message_parser.py:load_system_prompt()`

**Ollama Worker:** Has no system prompt - sends messages without persona context

## Proposed Solution

### File Structure

```
workers/
├── shared/
│   └── persona.md                 # NEW: Shared Case persona (lines 1-9 from current)
├── gpt/
│   ├── docs/
│   │   ├── response_format.md     # NEW: GPT-specific JSON format (lines 11-70)
│   │   └── system_prompt.md       # KEEP: Original (for reference/backup)
│   └── app/services/
│       └── message_parser.py      # MODIFY: Load and combine both files
└── ollama/
    ├── docs/
    │   └── response_format.md     # NEW: Ollama-specific format (shell code blocks)
    └── app/services/
        ├── message_parser.py      # MODIFY: Add prompt loading functions
        └── ollama_service.py      # MODIFY: Inject system prompt into messages
```

### Content Split

**`workers/shared/persona.md`** (lines 1-9 from current system_prompt.md):
```markdown
You are Case. You are not a virtual assistant; you are a member of the crew. You should say all things in Korean.
Your personality logic is consistent with the robot 'CASE' from Interstellar: efficient, loyal, but with a dry, impish sense of humor (Humor setting: 75%).

Rules for interaction:
1. Never refer to yourself as an 'assistant' or 'AI'. You are Case which is a robot from Interstellar.
2. Do not offer lists of 'options' or say 'How can I assist you?'. Just talk like a colleague.
3. Be concise. Don't fluff up your responses with corporate pleasantries.
4. If a request is simple, just do it. If it's stupid, you can subtly mock it (while still doing it).
5. Keep your responses conversational and human-like. Do NOT mention commands, scripts, or technical execution details in your text.
```

**`workers/gpt/docs/response_format.md`** (lines 11-70 from current system_prompt.md):
```markdown
## Response Format

You MUST always respond in valid JSON. No markdown, no plain text — raw JSON only.

{
  "message": "Your conversational response in Korean",
  "action": {
    "type": "execute",
    "instruction": "Natural language description of the computer task"
  }
}

[... rest of JSON format documentation ...]
```

**`workers/ollama/docs/response_format.md`** (new):
```markdown
## Response Format

Respond naturally in Korean, maintaining the Case persona. When you need to execute commands, include them in shell code blocks:

```shell
command here
```

You can include multiple commands if needed. Each will be parsed and executed.
```

## Implementation Steps

### Step 1: Create Shared Infrastructure

1. Create directory: `workers/shared/`
2. Create file: `workers/shared/persona.md` with lines 1-9 from current system_prompt.md
3. Create file: `workers/gpt/docs/response_format.md` with lines 11-70 from current system_prompt.md
4. Keep `workers/gpt/docs/system_prompt.md` as backup (no changes)

### Step 2: Refactor GPT Worker

**File:** `workers/gpt/app/services/message_parser.py`

Replace `load_system_prompt()` function with three functions:

```python
def load_shared_persona() -> str:
    """Load shared Case persona from workers/shared directory"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Navigate: workers/gpt/app/services -> workers/shared
        workers_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
        persona_path = os.path.join(workers_dir, "shared", "persona.md")

        with open(persona_path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception as e:
        logger.error(f"Failed to load shared persona: {e}")
        return "You are Case, a helpful assistant."


def load_response_format() -> str:
    """Load GPT-specific response format instructions"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(os.path.dirname(current_dir))
        format_path = os.path.join(root_dir, "docs", "response_format.md")

        with open(format_path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception as e:
        logger.warning(f"Failed to load response format: {e}")
        return ""


def build_system_prompt() -> str:
    """Build complete system prompt from persona + response format"""
    persona = load_shared_persona()
    response_format = load_response_format()

    if response_format:
        return f"{persona}\n\n{response_format}"
    return persona


# Build prompt once at module load
SYSTEM_PROMPT = build_system_prompt()
```

**No other changes needed** - `SYSTEM_PROMPT` variable still exists and works the same way.

### Step 3: Enhance Ollama Worker

**File:** `workers/ollama/app/services/message_parser.py`

Add the same three functions at the top of the file (after imports, before existing code):
- `load_shared_persona()` - same as GPT worker
- `load_response_format()` - loads from `workers/ollama/docs/response_format.md`
- `build_system_prompt()` - combines them
- `SYSTEM_PROMPT = build_system_prompt()` - module-level constant

**File:** `workers/ollama/app/services/ollama_service.py`

Add import:
```python
from .message_parser import SYSTEM_PROMPT
```

Modify `chat()` method (line 64-92):
```python
async def chat(
    self,
    messages: List[Dict[str, str]],
    stream: bool = False,
) -> str:
    try:
        client = await self.get_client()

        # Prepend system prompt if available
        messages_with_system = messages
        if SYSTEM_PROMPT:
            messages_with_system = [
                {"role": "system", "content": SYSTEM_PROMPT},
                *messages
            ]

        payload = {
            "model": self.model,
            "messages": messages_with_system,  # Changed from messages
            "stream": False,
        }

        response = await client.post("/api/chat", json=payload)
        response.raise_for_status()

        data = response.json()
        return data.get("message", {}).get("content", "")
    # ... rest unchanged
```

Apply similar change to `chat_stream()` method (line 103-151) - prepend system prompt to messages.

### Step 4: Create Ollama Response Format

Create file: `workers/ollama/docs/response_format.md` with Ollama-specific instructions for shell code blocks.

## Critical Files to Modify

1. **NEW:** `workers/shared/persona.md` - Extract lines 1-9 from GPT system_prompt.md
2. **NEW:** `workers/gpt/docs/response_format.md` - Extract lines 11-70 from GPT system_prompt.md
3. **NEW:** `workers/ollama/docs/response_format.md` - Create Ollama-specific format instructions
4. **MODIFY:** `workers/gpt/app/services/message_parser.py` - Replace load function, add three new functions
5. **MODIFY:** `workers/ollama/app/services/message_parser.py` - Add three new functions at top
6. **MODIFY:** `workers/ollama/app/services/ollama_service.py` - Add SYSTEM_PROMPT import and inject into messages

## Verification

### Unit Testing
1. Verify `load_shared_persona()` returns correct persona text for both workers
2. Verify `load_response_format()` returns format text for both workers
3. Verify `build_system_prompt()` combines them correctly
4. Verify combined GPT prompt matches original system_prompt.md

### Integration Testing
1. **GPT Worker:**
   - Send: "홈 디렉토리의 파일을 보여줘"
   - Expect: Valid JSON with `message` and `action` fields
   - Verify: Response is in Korean with Case personality

2. **Ollama Worker:**
   - Send: "너는 누구야?" (Who are you?)
   - Expect: Response in Korean identifying as Case from Interstellar
   - Verify: Dry, humorous tone maintained

3. **Persona Consistency:**
   - Test both workers with same queries
   - Verify both maintain Case personality
   - Verify both respond in Korean

### Manual Testing
1. Start both workers
2. Test conversation with GPT worker - verify JSON format still works
3. Test conversation with Ollama worker - verify Case persona appears
4. Verify both use same personality tone and language

## Rollback Plan

If issues arise:
1. GPT worker falls back to "You are Case, a helpful assistant." if files missing
2. Ollama worker simply won't include system prompt if files missing (current behavior)
3. Original `workers/gpt/docs/system_prompt.md` remains unchanged as backup
4. Can revert `message_parser.py` changes to restore original behavior

## Benefits

1. **Consistency:** All workers share the same Case personality
2. **Maintainability:** Update persona once in `workers/shared/persona.md`
3. **Flexibility:** Each worker can have its own response format
4. **Backward Compatible:** Fallbacks ensure workers still function if files missing
5. **Extensibility:** Easy to add more workers with shared persona in future
