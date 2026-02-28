"""CLARA — Chat Router"""

from fastapi import APIRouter

from models.schemas import ChatMessageRequest, ChatMessageResponse
from services.watsonx_orchestrate_service import watsonx_orchestrate_service

router = APIRouter()


@router.post("/message", response_model=ChatMessageResponse)
async def chat_message(req: ChatMessageRequest):
    """Send a chat message to watsonx Orchestrate."""
    result = await watsonx_orchestrate_service.send_message(
        user_message=req.message,
        conversation_id=req.conversation_id,
        context=req.context,
    )

    return ChatMessageResponse(
        reply=result.get("reply") or "",
        conversation_id=result.get("conversation_id") or "",
        provider=result.get("provider") or "orchestrate",
        fallback_used=bool(result.get("fallback_used", False)),
    )
