import json
import logging
import os
import re
from typing import List

from ..models.message import MessageContent, ShellCommand

logger = logging.getLogger(__name__)


def load_shared_persona() -> str:
    """Load shared Case persona from workers/shared directory"""
    try:
        current_dir = os.path.dirname(os.path.abspath(__file__))
        # Navigate: workers/ollama/app/services -> workers/shared
        workers_dir = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
        persona_path = os.path.join(workers_dir, "shared", "persona.md")

        with open(persona_path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception as e:
        logger.error(f"Failed to load shared persona: {e}")
        return ""


def load_response_format() -> str:
    """Load Ollama-specific response format instructions"""
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

    parts = [p for p in [persona, response_format] if p]
    return "\n\n".join(parts) if parts else ""


# Build prompt once at module load
SYSTEM_PROMPT = build_system_prompt()

# Pattern to match shell code blocks with optional JSON metadata
# Matches: ```shell {"confirm": true, "description": "..."}\ncommand\n```
COMMAND_PATTERN = re.compile(
    r"```(?:shell|bash|sh)\s*(?:\{([^}]+)\})?\s*\n(.*?)\n```",
    re.DOTALL | re.MULTILINE,
)

# Dangerous command patterns that require confirmation
DANGEROUS_PATTERNS = [
    r"\brm\s+-rf\b",
    r"\brm\s+-r\b",
    r"\bsudo\b",
    r"\bchmod\s+777\b",
    r"\b>\s*/dev/",
    r"\bdd\s+if=",
    r"\bmkfs\b",
    r"\bformat\b",
]


def is_dangerous_command(command: str) -> bool:
    """Check if a command matches dangerous patterns."""
    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, command, re.IGNORECASE):
            return True
    return False


def parse_metadata(metadata_str: str) -> dict:
    """Parse JSON metadata from code block."""
    if not metadata_str:
        return {}
    try:
        return json.loads("{" + metadata_str + "}")
    except json.JSONDecodeError:
        logger.warning(f"Failed to parse metadata: {metadata_str}")
        return {}


def parse_message_content(content: str) -> MessageContent:
    """
    Parse message content and extract shell commands from markdown code blocks.

    Args:
        content: Raw message content from the model.

    Returns:
        MessageContent with cleaned text and extracted commands.
    """
    commands: List[ShellCommand] = []
    text = content

    # Find all shell code blocks
    matches = COMMAND_PATTERN.findall(content)

    for metadata_str, command_text in matches:
        command = command_text.strip()
        if not command:
            continue

        metadata = parse_metadata(metadata_str)

        # Check if command requires confirmation
        requires_confirmation = metadata.get("confirm", False) or is_dangerous_command(
            command
        )

        shell_command = ShellCommand(
            command=command,
            description=metadata.get("description"),
            requires_confirmation=requires_confirmation,
        )
        commands.append(shell_command)

    # Remove code blocks from text for cleaner display (optional)
    # text = COMMAND_PATTERN.sub("", content).strip()

    return MessageContent(text=text, commands=commands)
