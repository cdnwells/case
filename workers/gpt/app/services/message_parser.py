import re
import json
from typing import List
from ..models.message import ShellCommand, MessageContent

COMMAND_PATTERN = re.compile(
    r"```json\s*(.*?)\s*```", re.DOTALL | re.MULTILINE
)

import os

def load_system_prompt():
    """Load system prompt from markdown file"""
    try:
        # Get the directory of the current file (message_parser.py)
        # Go up 2 levels to reach root (app/services -> app -> gpt)
        current_dir = os.path.dirname(os.path.abspath(__file__))
        root_dir = os.path.dirname(os.path.dirname(current_dir))
        prompt_path = os.path.join(root_dir, "docs", "system_prompt.md")
        
        with open(prompt_path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception as e:
        # Fallback if file read fails
        print(f"Failed to load system prompt file: {e}")
        return "You are Case, a helpful assistant."

SYSTEM_PROMPT = load_system_prompt()


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
        json_str = match.group(1)
        
        try:
            data = json.loads(json_str)
            if data.get("action") == "execute" and "command" in data:
                commands.append(
                    ShellCommand(
                        command=data["command"],
                        description=data.get("description"),
                        requires_confirmation=data.get("confirm", True),
                        timeout_seconds=data.get("timeout", 30),
                    )
                )
        except json.JSONDecodeError:
            pass

    # Add remaining text
    text_parts.append(content[last_end:])

    return MessageContent(
        text="".join(text_parts).strip(),
        commands=commands if commands else None,
    )
