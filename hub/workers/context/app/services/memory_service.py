import json
import os
import logging
from typing import List
from filelock import FileLock
from ..config import settings
from ..models.context import Memory

logger = logging.getLogger(__name__)


class MemoryService:
    def __init__(self):
        self.file_path = os.path.join(settings.DATA_DIR, settings.MEMORIES_FILE)
        self.lock_path = f"{self.file_path}.lock"

    def _read_memories(self) -> List[Memory]:
        """Read all memories from file"""
        if not os.path.exists(self.file_path):
            return []
        try:
            with open(self.file_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return [Memory(**m) for m in data]
        except (json.JSONDecodeError, KeyError) as e:
            logger.error(f"Failed to read memories: {e}")
            return []

    def _write_memories(self, memories: List[Memory]):
        """Write memories to file with file lock for safety"""
        with FileLock(self.lock_path):
            with open(self.file_path, "w", encoding="utf-8") as f:
                json.dump(
                    [m.model_dump(mode="json") for m in memories],
                    f,
                    ensure_ascii=False,
                    indent=2,
                    default=str,
                )

    def get_all(self) -> List[Memory]:
        return self._read_memories()

    def add_memories(self, contents: List[str], source: str = "gpt") -> List[Memory]:
        """Add new memories, deduplicating against existing ones"""
        existing = self._read_memories()
        existing_contents = {m.content.lower().strip() for m in existing}

        new_memories = []
        for content in contents:
            normalized = content.lower().strip()
            if normalized and normalized not in existing_contents:
                mem = Memory(content=content.strip(), source=source)
                new_memories.append(mem)
                existing_contents.add(normalized)

        if new_memories:
            combined = existing + new_memories
            # Enforce cap: keep most recent
            if len(combined) > settings.MAX_MEMORIES:
                combined = combined[-settings.MAX_MEMORIES :]
            self._write_memories(combined)
            logger.info(f"Added {len(new_memories)} new memories (total: {len(combined)})")

        return new_memories

    def delete_memory(self, memory_id: str) -> bool:
        existing = self._read_memories()
        filtered = [m for m in existing if m.id != memory_id]
        if len(filtered) == len(existing):
            return False
        self._write_memories(filtered)
        logger.info(f"Deleted memory {memory_id}")
        return True

    def format_for_prompt(self) -> str:
        """Format memories as context string for LLM system prompt injection"""
        memories = self._read_memories()
        if not memories:
            return ""
        lines = [m.content for m in memories]
        return "Known facts about the user:\n" + "\n".join(f"- {line}" for line in lines)


memory_service = MemoryService()
