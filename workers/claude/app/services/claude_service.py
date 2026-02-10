import asyncio
import time
import logging
from pathlib import Path
from typing import Optional, Tuple
from ..config import settings
from ..core.exceptions import ClaudeBinaryException, ClaudeCommandException

logger = logging.getLogger(__name__)


class ClaudeService:
    def __init__(self):
        self.claude_path = settings.CLAUDE_PATH

    async def execute_command(
        self,
        command: str,
        timeout: int = 30,
        working_directory: Optional[str] = None,
    ) -> Tuple[str, str, int, float]:
        """
        Execute a command via Claude Code CLI.

        Returns:
            Tuple of (stdout, stderr, exit_code, execution_time)
        """
        start_time = time.time()

        # Build Claude CLI command
        claude_args = [
            self.claude_path,
            "--dangerously-skip-permissions",
            "-p",
            command,
        ]

        try:
            # Create subprocess
            process = await asyncio.create_subprocess_exec(
                *claude_args,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=working_directory,
            )

            # Wait with timeout
            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                raise ClaudeCommandException(f"Command timed out after {timeout}s")

            # Decode output
            stdout = stdout_bytes.decode("utf-8", errors="replace")
            stderr = stderr_bytes.decode("utf-8", errors="replace")
            exit_code = process.returncode or 0

            execution_time = time.time() - start_time

            logger.info(f"Command executed in {execution_time:.3f}s with exit code {exit_code}")

            return stdout, stderr, exit_code, execution_time

        except FileNotFoundError:
            raise ClaudeBinaryException(f"Claude CLI not found at {self.claude_path}")
        except asyncio.TimeoutError:
            raise ClaudeCommandException(f"Command timed out after {timeout}s")
        except Exception as e:
            raise ClaudeCommandException(f"Execution failed: {str(e)}", e)

    def is_claude_available(self) -> bool:
        """Check if Claude CLI is available"""
        try:
            path = Path(self.claude_path)
            return path.exists() and path.is_file()
        except Exception:
            return False


claude_service = ClaudeService()
