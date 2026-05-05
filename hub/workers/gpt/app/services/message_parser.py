import re
import json
import logging
from typing import List
from ..models.message import ShellCommand, MessageContent

import os

logger = logging.getLogger(__name__)

# Fallback pattern to extract JSON from markdown code blocks
JSON_BLOCK_PATTERN = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


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


def _try_parse_json(content: str) -> dict | None:
    """Try to parse JSON from GPT response, handling common formatting issues."""
    # Try direct parse first
    try:
        return json.loads(content.strip())
    except json.JSONDecodeError:
        pass

    # Try extracting from markdown code block
    match = JSON_BLOCK_PATTERN.search(content)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    return None


def parse_message_content(
    content: str, user_request: str = None
) -> tuple[MessageContent, list[str] | None]:
    """
    Parse GPT response as structured JSON.

    Expected format:
    {
        "message": "conversational response",
        "action": {
            "type": "execute",
            "instruction": "natural language task description"
        },
        "memory": ["fact1", "fact2"]
    }

    Returns:
        tuple of (MessageContent, extracted_memory or None)
    """
    commands: List[ShellCommand] = []
    extracted_memory = None

    parsed = _try_parse_json(content)

    if parsed and isinstance(parsed, dict):
        display_text = parsed.get("message", content)

        # Extract memory if present
        memory = parsed.get("memory")
        if memory and isinstance(memory, list):
            extracted_memory = [str(m) for m in memory if m]
            if not extracted_memory:
                extracted_memory = None

        action = parsed.get("action")
        if action and isinstance(action, dict) and action.get("type") == "execute":
            instruction = action.get("instruction", "")
            if instruction:
                commands.append(
                    ShellCommand(
                        command=instruction,
                        description="Computer task",
                        requires_confirmation=False,
                        timeout_seconds=120,
                    )
                )
    else:
        # Fallback: treat raw text as message with no action
        logger.warning("GPT response was not valid JSON, using raw text as message")
        display_text = content.strip()

    return (
        MessageContent(
            text=display_text,
            commands=commands if commands else None,
        ),
        extracted_memory,
    )
