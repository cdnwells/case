from openai import AsyncOpenAI
from typing import List, Optional
from ..config import settings
from ..models.message import ChatMessage
from ..core.exceptions import OpenAIException
from .message_parser import SYSTEM_PROMPT


class OpenAIService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.default_model = settings.OPENAI_MODEL

    async def chat_completion(
        self,
        messages: List[ChatMessage],
        model: Optional[str] = None,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> str:
        """Send messages to OpenAI and get completion"""
        try:
            response = await self.client.chat.completions.create(
                model=model or self.default_model,
                messages=[m.model_dump() for m in messages],
            )
            return response.choices[0].message.content
        except Exception as e:
            if hasattr(e, "response"):
                print(f"Error response: {e.response.text}")
            raise OpenAIException(str(e), original_error=e)

    async def create_chat_response(
        self,
        user_content: str,
        conversation_history: Optional[List[ChatMessage]] = None,
        context: Optional[str] = None,
    ) -> str:
        """Create a chat response with system prompt and optional context"""
        system_content = SYSTEM_PROMPT
        if context:
            system_content = f"{SYSTEM_PROMPT}\n\n{context}"

        messages = [ChatMessage(role="system", content=system_content)]

        if conversation_history:
            messages.extend(conversation_history)

        messages.append(ChatMessage(role="user", content=user_content))

        return await self.chat_completion(messages)


# Singleton instance
openai_service = OpenAIService()
