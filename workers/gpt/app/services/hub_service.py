import asyncio
import httpx
import logging
import uuid
from typing import List, Optional, Tuple
from datetime import datetime
from ..models.message import ShellCommand
from ..config import settings

logger = logging.getLogger(__name__)

# Source identifier for hub to recognize GPT worker requests
GPT_WORKER_SOURCE = "case-gpt"


async def send_commands_to_hub(
    commands: List[ShellCommand],
) -> Tuple[bool, Optional[str]]:
    """
    Send conversational instructions to the hub for Claude Code execution.

    Generates an executionId so the hub can track and store results,
    and Android can poll for the outcome.

    Args:
        commands: List of ShellCommand objects (containing conversational instructions)

    Returns:
        Tuple of (success, executionId). executionId is None if no commands were sent.
    """
    if not settings.HUB_COMMAND_URL:
        logger.debug("HUB_COMMAND_URL not configured, skipping command transfer")
        return False, None

    if not commands:
        logger.debug("No commands to send")
        return True, None

    headers = {
        "Content-Type": "application/json",
    }

    execution_id = str(uuid.uuid4())

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            tasks = []
            for cmd in commands:
                payload = {
                    "source": GPT_WORKER_SOURCE,
                    "executionId": execution_id,
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

            logger.info(
                f"Successfully sent {success_count}/{len(commands)} commands to hub "
                f"(executionId={execution_id})"
            )
            return success_count > 0, execution_id

    except Exception as e:
        logger.exception(f"Unexpected error sending commands to hub: {e}")
        return False, None
