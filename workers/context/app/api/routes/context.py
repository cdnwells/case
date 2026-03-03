from fastapi import APIRouter, HTTPException
from ...models.context import MemoriesRequest, ContextResponse, MemoryListResponse
from ...services.memory_service import memory_service

router = APIRouter()


@router.get("", response_model=ContextResponse)
async def get_context():
    """Returns formatted context for LLM prompt injection"""
    context_str = memory_service.format_for_prompt()
    memories = memory_service.get_all()
    return ContextResponse(context=context_str, memory_count=len(memories))


@router.get("/memories", response_model=MemoryListResponse)
async def list_memories():
    """Returns all stored memories"""
    memories = memory_service.get_all()
    return MemoryListResponse(memories=memories, total=len(memories))


@router.post("/memories")
async def save_memories(request: MemoriesRequest):
    """Save new memory entries"""
    new_memories = memory_service.add_memories(request.memories, request.source)
    return {"saved": len(new_memories), "memories": new_memories}


@router.delete("/memories/{memory_id}")
async def delete_memory(memory_id: str):
    deleted = memory_service.delete_memory(memory_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"deleted": True, "id": memory_id}
