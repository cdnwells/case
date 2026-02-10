import asyncio
import httpx
import logging
from typing import List, Optional
from datetime import datetime
from ..models.message import ShellCommand
from ..config import settings

logger = logging.getLogger(__name__)


def format_commands_as_json(commands: List[ShellCommand]) -> List[dict]:
    """Format conversational instructions as JSON for Claude Code"""
    return [
        {
            "command": cmd.command,  # Conversational instruction
            "timeout": cmd.timeout_seconds,
        }
        for cmd in commands
    ]


async def send_commands_to_hub(
    commands: List[ShellCommand],
) -> bool:
    """
    Send conversational instructions to the hub for Claude Code execution.

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

    # Send each instruction separately for parallel execution
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Send all commands in parallel
            tasks = []
            for cmd in commands:
                task = client.post(
                    settings.HUB_COMMAND_URL,
                    json={"command": cmd.command, "timeout": cmd.timeout_seconds},
                    headers=headers,
                )
                tasks.append(task)

            # Wait for all to complete
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
