import httpx
import logging
from typing import List, Optional
from datetime import datetime
from ..models.message import ShellCommand
from ..config import settings

logger = logging.getLogger(__name__)


def format_commands_as_markdown(commands: List[ShellCommand]) -> str:
    """Format shell commands as markdown content"""
    lines = [
        f"# Shell Commands",
        f"Generated: {datetime.utcnow().isoformat()}",
        "",
    ]

    for i, cmd in enumerate(commands, 1):
        lines.append(f"## Command {i}")
        if cmd.description:
            lines.append(f"**Description:** {cmd.description}")
        lines.append(f"**Requires Confirmation:** {cmd.requires_confirmation}")
        lines.append(f"**Timeout:** {cmd.timeout_seconds}s")
        lines.append("")
        lines.append("```shell")
        lines.append(cmd.command)
        lines.append("```")
        lines.append("")

    return "\n".join(lines)


async def send_commands_to_hub(
    commands: List[ShellCommand],
    api_key: Optional[str] = None,
) -> bool:
    """
    Send extracted shell commands to the hub.

    Args:
        commands: List of ShellCommand objects to send
        api_key: API key for authentication (uses settings.API_KEY if not provided)

    Returns:
        True if successful, False otherwise
    """
    if not settings.HUB_COMMAND_URL:
        logger.debug("HUB_COMMAND_URL not configured, skipping command transfer")
        return False

    if not commands:
        logger.debug("No commands to send")
        return True

    markdown_content = format_commands_as_markdown(commands)
    auth_key = api_key or settings.API_KEY

    headers = {
        "Content-Type": "text/markdown",
    }
    if auth_key:
        headers["Authorization"] = f"Bearer {auth_key}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.HUB_COMMAND_URL,
                content=markdown_content,
                headers=headers,
            )
            response.raise_for_status()
            logger.info(f"Successfully sent {len(commands)} commands to hub")
            return True
    except httpx.HTTPStatusError as e:
        logger.error(f"Hub returned error: {e.response.status_code} - {e.response.text}")
        return False
    except httpx.RequestError as e:
        logger.error(f"Failed to connect to hub: {e}")
        return False
    except Exception as e:
        logger.exception(f"Unexpected error sending commands to hub: {e}")
        return False
