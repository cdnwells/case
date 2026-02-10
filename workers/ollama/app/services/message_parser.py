import json
import logging
import re
from typing import List

from ..models.message import MessageContent, ShellCommand

logger = logging.getLogger(__name__)

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
