import asyncio
import httpx
import logging
from typing import List, Optional
from datetime import datetime
from ..models.message import ShellCommand
from ..config import settings

logger = logging.getLogger(__name__)

# Source identifier for hub to recognize GPT worker requests
GPT_WORKER_SOURCE = "case-gpt"


def format_commands_as_json(commands: List[ShellCommand]) -> List[dict]:
    """Format conversational instructions as JSON for Claude Code"""
    return [
        {
            "source": GPT_WORKER_SOURCE,
            "command": cmd.command,
            "timeout": cmd.timeout_seconds,
        }
        for cmd in commands
    ]


async def send_commands_to_hub(
    commands: List[ShellCommand],
) -> bool:
    """
    Send conversational instructions to the hub for Claude Code execution.

    Each command payload includes a `source` field ("case-gpt") so the hub
    can identify which worker originated the request.

    Args:
        commands: List of ShellCommand objects (containing conversational instructions)

    Returns:
        True if successful, False otherwise
    """
    if not settings.HUB_COMMAND_URL:
        logger.debug("HUB_COMMAND_URL not configured, skipping command transfer")
        return False

    if not commands:
        logger.debug("No commands to send")
        return True

    headers = {
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            tasks = []
            for cmd in commands:
                payload = {
                    "source": GPT_WORKER_SOURCE,
                    "command": cmd.command,
                    "timeout": cmd.timeout_seconds,
                }
                task = client.post(
                    settings.HUB_COMMAND_URL,
                    json=payload,
                    headers=headers,
                )
                tasks.append(task)

            responses = await asyncio.gather(*tasks, return_exceptions=True)

            success_count = 0
            for i, response in enumerate(responses):
                if isinstance(response, Exception):
                    logger.error(f"Command {i+1} failed: {response}")
                else:
                    response.raise_for_status()
                    success_count += 1

            logger.info(f"Successfully sent {success_count}/{len(commands)} commands to hub")
            return success_count > 0

    except Exception as e:
        logger.exception(f"Unexpected error sending commands to hub: {e}")
        return False
