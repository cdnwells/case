import re
import json
from typing import List
from ..models.message import ShellCommand, MessageContent

EXECUTE_TAG_PATTERN = re.compile(
    r"\[EXECUTE\]", re.IGNORECASE
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


def parse_message_content(content: str, user_request: str = None) -> MessageContent:
    """
    Parse GPT response to detect if it's a computer task.
    If [EXECUTE] tag is present, use the original user request as the command.
    """
    commands: List[ShellCommand] = []

    # Check if response contains [EXECUTE] tag
    has_execute_tag = EXECUTE_TAG_PATTERN.search(content)

    if has_execute_tag and user_request:
        # Use the original user request as the conversational instruction
        commands.append(
            ShellCommand(
                command=user_request,  # User's original request
                description="Computer task",
                requires_confirmation=False,
                timeout_seconds=120,
            )
        )

    # Remove [EXECUTE] tag from response text
    clean_text = EXECUTE_TAG_PATTERN.sub("", content).strip()

    return MessageContent(
        text=clean_text,
        commands=commands if commands else None,
    )
