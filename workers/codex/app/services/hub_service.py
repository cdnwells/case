import asyncio
import logging
import uuid
from typing import List, Optional, Tuple

import httpx

from ..config import settings
from ..models.message import ShellCommand

logger = logging.getLogger(__name__)

CODEX_WORKER_SOURCE = "case-codex"


async def send_commands_to_hub(commands: List[ShellCommand]) -> Tuple[bool, Optional[str]]:
    if not settings.HUB_COMMAND_URL:
        logger.debug("HUB_COMMAND_URL not configured, skipping command transfer")
        return False, None

    if not commands:
        return True, None

    execution_id = str(uuid.uuid4())
    headers = {"Content-Type": "application/json"}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            tasks = []
            for cmd in commands:
                payload = {
                    "source": CODEX_WORKER_SOURCE,
                    "executionId": execution_id,
                    "command": cmd.command,
                    "timeout": cmd.timeout_seconds,
                    "working_directory": cmd.working_directory,
                }
                tasks.append(client.post(settings.HUB_COMMAND_URL, json=payload, headers=headers))

            responses = await asyncio.gather(*tasks, return_exceptions=True)
            success_count = 0
            for i, response in enumerate(responses):
                if isinstance(response, Exception):
                    logger.error(f"Command {i + 1} failed: {response}")
                else:
                    response.raise_for_status()
                    success_count += 1

            return success_count > 0, execution_id
    except Exception as e:
        logger.exception(f"Unexpected error sending commands to hub: {e}")
        return False, None
