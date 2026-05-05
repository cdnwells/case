import json
import logging
import os
import re
from typing import List

from ..models.message import MessageContent, ShellCommand

logger = logging.getLogger(__name__)

JSON_BLOCK_PATTERN = re.compile(r"```(?:json)?\s*(\{.*?\})\s*```", re.DOTALL)


def _workers_dir() -> str:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))


def _codex_worker_dir() -> str:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.dirname(os.path.dirname(current_dir))


def load_shared_persona() -> str:
    try:
        with open(os.path.join(_workers_dir(), "shared", "persona.md"), "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception as e:
        logger.error(f"Failed to load shared persona: {e}")
        return "You are Case."


def load_response_format() -> str:
    try:
        with open(os.path.join(_workers_dir(), "gpt", "docs", "response_format.md"), "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception as e:
        logger.warning(f"Failed to load response format: {e}")
        return ""


def load_worker_docs() -> str:
    docs_dir = os.path.join(_codex_worker_dir(), "docs")
    if not os.path.isdir(docs_dir):
        return ""

    docs_parts = []
    for filename in sorted(os.listdir(docs_dir)):
        if filename.endswith(".md"):
            with open(os.path.join(docs_dir, filename), "r", encoding="utf-8") as f:
                docs_parts.append(f.read().strip())
    return "\n\n".join(docs_parts)


def build_system_prompt() -> str:
    parts = [load_shared_persona()]
    response_format = load_response_format()
    worker_docs = load_worker_docs()
    if response_format:
        parts.append(response_format)
    if worker_docs:
        parts.append(worker_docs)
    return "\n\n".join(part for part in parts if part)


SYSTEM_PROMPT = build_system_prompt()


def _try_parse_json(content: str) -> dict | None:
    try:
        return json.loads(content.strip())
    except json.JSONDecodeError:
        pass

    match = JSON_BLOCK_PATTERN.search(content)
    if match:
        try:
            return json.loads(match.group(1))
        except json.JSONDecodeError:
            pass

    return None


def parse_message_content(content: str) -> tuple[MessageContent, list[str] | None]:
    commands: List[ShellCommand] = []
    extracted_memory = None
    parsed = _try_parse_json(content)

    if parsed and isinstance(parsed, dict):
        display_text = parsed.get("message", content)
        memory = parsed.get("memory")
        if memory and isinstance(memory, list):
            extracted_memory = [str(m) for m in memory if m] or None

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
        logger.warning("Codex response was not valid JSON, using raw text as message")
        display_text = content.strip()

    return MessageContent(text=display_text, commands=commands or None), extracted_memory
