import json
import logging
from typing import Any, AsyncGenerator, Dict, List, Optional

import httpx

from ..config import settings
from ..core.exceptions import ModelNotFoundError, OllamaException
from .message_parser import SYSTEM_PROMPT

logger = logging.getLogger(__name__)


class OllamaService:
    """Service for interacting with the Ollama API."""

    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL
        self.timeout = settings.OLLAMA_TIMEOUT
        self._client: Optional[httpx.AsyncClient] = None

    async def get_client(self) -> httpx.AsyncClient:
        """Get or create the HTTP client."""
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout),
            )
        return self._client

    async def close(self):
        """Close the HTTP client."""
        if self._client and not self._client.is_closed:
            await self._client.aclose()
            self._client = None

    async def check_health(self) -> Dict[str, Any]:
        """Check Ollama service health and model availability."""
        try:
            client = await self.get_client()
            response = await client.get("/api/tags")
            response.raise_for_status()

            data = response.json()
            models = [m.get("name", "") for m in data.get("models", [])]

            model_available = any(self.model in m for m in models)

            return {
                "ollama_connected": True,
                "model": self.model,
                "model_available": model_available,
                "available_models": models,
            }
        except httpx.RequestError as e:
            logger.error(f"Failed to connect to Ollama: {e}")
            return {
                "ollama_connected": False,
                "model": self.model,
                "model_available": False,
                "error": str(e),
            }

    async def chat(
        self,
        messages: List[Dict[str, str]],
        stream: bool = False,
    ) -> str:
        """
        Send a chat request to Ollama.

        Args:
            messages: List of message dicts with 'role' and 'content'.
            stream: Whether to use streaming (handled separately).

        Returns:
            The model's response content.
        """
        try:
            client = await self.get_client()

            # Prepend system prompt if available
            messages_with_system = messages
            if SYSTEM_PROMPT:
                messages_with_system = [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    *messages
                ]

            payload = {
                "model": self.model,
                "messages": messages_with_system,
                "stream": False,
            }

            response = await client.post("/api/chat", json=payload)
            response.raise_for_status()

            data = response.json()
            return data.get("message", {}).get("content", "")

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise ModelNotFoundError(self.model)
            logger.error(f"Ollama API error: {e}")
            raise OllamaException(f"Ollama API error: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"Failed to connect to Ollama: {e}")
            raise OllamaException(f"Failed to connect to Ollama: {e}")

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
    ) -> AsyncGenerator[str, None]:
        """
        Stream a chat response from Ollama.

        Args:
            messages: List of message dicts with 'role' and 'content'.

        Yields:
            Content chunks as they arrive.
        """
        try:
            client = await self.get_client()

            # Prepend system prompt if available
            messages_with_system = messages
            if SYSTEM_PROMPT:
                messages_with_system = [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    *messages
                ]

            payload = {
                "model": self.model,
                "messages": messages_with_system,
                "stream": True,
            }

            async with client.stream("POST", "/api/chat", json=payload) as response:
                response.raise_for_status()

                async for line in response.aiter_lines():
                    if not line:
                        continue

                    try:
                        data = json.loads(line)
                        content = data.get("message", {}).get("content", "")
                        if content:
                            yield content

                        if data.get("done", False):
                            break
                    except json.JSONDecodeError:
                        logger.warning(f"Failed to parse stream line: {line}")
                        continue

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                raise ModelNotFoundError(self.model)
            logger.error(f"Ollama API error: {e}")
            raise OllamaException(f"Ollama API error: {e.response.status_code}")
        except httpx.RequestError as e:
            logger.error(f"Failed to connect to Ollama: {e}")
            raise OllamaException(f"Failed to connect to Ollama: {e}")


# Singleton instance
ollama_service = OllamaService()
