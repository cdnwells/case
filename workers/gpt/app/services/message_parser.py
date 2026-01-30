import re
import json
from typing import List
from ..models.message import ShellCommand, MessageContent

COMMAND_PATTERN = re.compile(
    r"```shell\s*(?:\{([^}]+)\})?\s*\n(.*?)\n```", re.DOTALL | re.MULTILINE
)

SYSTEM_PROMPT = """You are Echo, an AI assistant that helps users with technical tasks.

When providing shell commands, use the following format:

```shell {"action": "execute", "confirm": true, "description": "Brief description"}
command here
```

Guidelines for commands:
- Set "confirm": false only for safe, read-only commands (ls, cat, pwd, whoami)
- Set "confirm": true for any command that modifies state (rm, mv, chmod, install)
- Always include a description for complex commands
- Break multi-step tasks into separate command blocks
- Warn users about potentially dangerous operations

You can provide multiple commands in sequence when appropriate.
"""


def parse_message_content(content: str) -> MessageContent:
    """Parse GPT response to extract shell commands"""
    commands: List[ShellCommand] = []
    text_parts: List[str] = []
    last_end = 0

    for match in COMMAND_PATTERN.finditer(content):
        # Add text before this command block
        text_parts.append(content[last_end : match.start()])
        last_end = match.end()

        # Parse command metadata
        metadata_str = match.group(1)
        command_str = match.group(2).strip()

        metadata = {}
        if metadata_str:
            try:
                metadata = json.loads("{" + metadata_str + "}")
            except json.JSONDecodeError:
                pass

        commands.append(
            ShellCommand(
                command=command_str,
                description=metadata.get("description"),
                requires_confirmation=metadata.get("confirm", True),
                timeout_seconds=metadata.get("timeout", 30),
            )
        )

    # Add remaining text
    text_parts.append(content[last_end:])

    return MessageContent(
        text="".join(text_parts).strip(),
        commands=commands if commands else None,
    )
