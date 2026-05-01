import asyncio
import time
import logging
import os
from pathlib import Path
from shutil import which
from typing import Optional, Tuple
from ..config import settings
from ..core.exceptions import CodexBinaryException, CodexCommandException

logger = logging.getLogger(__name__)


def _get_codex_worker_dir() -> str:
    """Get the codex worker root directory (workers/codex/)"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    # Navigate: workers/codex/app/services -> workers/codex
    return os.path.dirname(os.path.dirname(current_dir))


def load_shared_persona() -> str:
    """Load shared Case persona from workers/shared directory"""
    try:
        codex_worker_dir = _get_codex_worker_dir()
        workers_dir = os.path.dirname(codex_worker_dir)
        persona_path = os.path.join(workers_dir, "shared", "persona.md")

        with open(persona_path, "r", encoding="utf-8") as f:
            return f.read().strip()
    except Exception as e:
        logger.error(f"Failed to load shared persona: {e}")
        return ""


def load_worker_docs() -> str:
    """Load all .md instruction files from workers/codex/docs/"""
    try:
        docs_dir = os.path.join(_get_codex_worker_dir(), "docs")
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


class CodexService:
    def __init__(self):
        self.codex_path = settings.CODEX_PATH

    async def _run_codex(
        self,
        prompt: str,
        timeout: int,
        working_directory: Optional[str] = None,
    ) -> Tuple[str, str, int, float]:
        start_time = time.time()
        timeout = min(timeout or settings.CODEX_DEFAULT_TIMEOUT, settings.CODEX_MAX_TIMEOUT)

        codex_args = [
            self.codex_path,
            "exec",
            "--dangerously-bypass-approvals-and-sandbox",
            "--sandbox",
            "danger-full-access",
            "--skip-git-repo-check",
            "--color",
            "never",
        ]

        if settings.CODEX_MODEL:
            codex_args.extend(["--model", settings.CODEX_MODEL])
        if settings.CODEX_PROFILE:
            codex_args.extend(["--profile", settings.CODEX_PROFILE])
        if working_directory:
            codex_args.extend(["--cd", working_directory])

        codex_args.append("-")

        try:
            process = await asyncio.create_subprocess_exec(
                *codex_args,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env={**os.environ, "NO_COLOR": "1"},
            )

            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(
                    process.communicate(input=prompt.encode("utf-8")),
                    timeout=timeout
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                raise CodexCommandException(f"Command timed out after {timeout}s")

            stdout = stdout_bytes.decode("utf-8", errors="replace")
            stderr = stderr_bytes.decode("utf-8", errors="replace")
            exit_code = process.returncode if process.returncode is not None else 0
            execution_time = time.time() - start_time

            logger.info(f"Command executed in {execution_time:.3f}s with exit code {exit_code}")

            return stdout, stderr, exit_code, execution_time

        except (CodexBinaryException, CodexCommandException):
            raise
        except FileNotFoundError:
            raise CodexBinaryException(f"Codex CLI not found at {self.codex_path}")
        except asyncio.TimeoutError:
            raise CodexCommandException(f"Command timed out after {timeout}s")
        except Exception as e:
            raise CodexCommandException(f"Execution failed: {str(e)}", e)

    async def execute_command(
        self,
        command: str,
        timeout: int = 30,
        working_directory: Optional[str] = None,
    ) -> Tuple[str, str, int, float]:
        """
        Execute a command via Codex CLI.

        Returns:
            Tuple of (stdout, stderr, exit_code, execution_time)
        """
        full_command = command
        system_parts = []
        if PERSONA:
            system_parts.append(PERSONA)
        if WORKER_DOCS:
            system_parts.append(WORKER_DOCS)
        if system_parts:
            system_prompt = "\n\n".join(system_parts)
            full_command = f"{system_prompt}\n\nYou should respond based on this persona and follow the instructions above:\n\n{command}"

        return await self._run_codex(full_command, timeout, working_directory)

    async def chat(
        self,
        user_content: str,
        context: Optional[str] = None,
    ) -> str:
        """Create a chat response via Codex CLI."""
        from .message_parser import SYSTEM_PROMPT

        prompt_parts = [SYSTEM_PROMPT]
        if context:
            prompt_parts.append(f"Known conversation context:\n{context}")
        prompt_parts.append(f"User message:\n{user_content}")
        prompt_parts.append("Respond as raw JSON following the response format above.")

        stdout, _stderr, exit_code, _execution_time = await self._run_codex(
            "\n\n".join(prompt_parts),
            settings.CODEX_CHAT_TIMEOUT,
        )
        if exit_code != 0:
            raise CodexCommandException(f"Codex chat failed with exit code {exit_code}")

        return stdout

    def is_codex_available(self) -> bool:
        """Check if Codex CLI is available"""
        try:
            if os.path.sep not in self.codex_path:
                return which(self.codex_path) is not None

            path = Path(self.codex_path)
            return path.exists() and path.is_file()
        except Exception:
            return False


codex_service = CodexService()
