import asyncio
import time
import logging
import os
from pathlib import Path
from typing import Optional, Tuple
from ..config import settings
from ..core.exceptions import ClaudeBinaryException, ClaudeCommandException

logger = logging.getLogger(__name__)


def _get_claude_worker_dir() -> str:
    """Get the claude worker root directory (workers/claude/)"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Navigate: workers/claude/app/services -> workers/claude
    return os.path.dirname(os.path.dirname(current_dir))


def load_shared_persona() -> str:
    """Load shared Case persona from workers/shared directory"""
    try:
        claude_worker_dir = _get_claude_worker_dir()
        workers_dir = os.path.dirname(claude_worker_dir)
        persona_path = os.path.join(workers_dir, "shared", "persona.md")

        with open(persona_path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception as e:
        logger.error(f"Failed to load shared persona: {e}")
        return ""


def load_worker_docs() -> str:
    """Load all .md instruction files from workers/claude/docs/"""
    try:
        docs_dir = os.path.join(_get_claude_worker_dir(), "docs")
        if not os.path.isdir(docs_dir):
            return ""

        docs_parts = []
        for filename in sorted(os.listdir(docs_dir)):
            if filename.endswith(".md"):
                filepath = os.path.join(docs_dir, filename)
                with open(filepath, "r", encoding="utf-8") as f:
                    docs_parts.append(f.read().strip())

        return "\n\n".join(docs_parts)
    except Exception as e:
        logger.error(f"Failed to load worker docs: {e}")
        return ""


# Load persona and docs once at module load
PERSONA = load_shared_persona()
WORKER_DOCS = load_worker_docs()


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

        # Build system prompt from persona and worker docs
        full_command = command
        system_parts = []
        if PERSONA:
            system_parts.append(PERSONA)
        if WORKER_DOCS:
            system_parts.append(WORKER_DOCS)
        if system_parts:
            system_prompt = "\n\n".join(system_parts)
            full_command = f"{system_prompt}\n\nYou should respond based on this persona and follow the instructions above:\n\n{command}"

        # Build Claude CLI command
        claude_args = [
            self.claude_path,
            "--dangerously-skip-permissions",
            "-p",
            full_command,
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
