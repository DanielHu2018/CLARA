"""
CLARA — watsonx Orchestrate Service
Adapter for chatbot calls to IBM watsonx Orchestrate with graceful fallback signaling.
"""

import json
import logging
import uuid
import urllib.error
import urllib.request
from typing import Any, Dict, Optional

from config import settings

logger = logging.getLogger("CLARA.watsonx_orchestrate")


class WatsonxOrchestrateService:
    def __init__(self) -> None:
        self.base_url = (settings.WATSONX_ORCH_URL or "").strip().rstrip("/")
        self.api_key = (settings.WATSONX_ORCH_API_KEY or "").strip()
        self.agent_id = (settings.WATSONX_ORCH_AGENT_ID or "").strip()
        self.timeout = max(5, settings.WATSONX_ORCH_TIMEOUT_SECONDS)

    @property
    def enabled(self) -> bool:
        return bool(
            self.base_url
            and self.api_key
            and self.base_url != "your_orchestrate_base_url_here"
            and self.api_key != "your_orchestrate_api_key_here"
        )

    def _build_url(self) -> str:
        path = (settings.WATSONX_ORCH_CHAT_PATH or "/v1/chat/completions").strip()
        if not path.startswith("/"):
            path = f"/{path}"
        return f"{self.base_url}{path}"

    def _extract_reply(self, payload: Dict[str, Any]) -> Optional[str]:
        choices = payload.get("choices")
        if isinstance(choices, list) and choices:
            message = choices[0].get("message") if isinstance(choices[0], dict) else None
            if isinstance(message, dict):
                content = message.get("content")
                if isinstance(content, str) and content.strip():
                    return content.strip()

        output = payload.get("output")
        if isinstance(output, str) and output.strip():
            return output.strip()

        data = payload.get("data")
        if isinstance(data, dict):
            text = data.get("text") or data.get("reply")
            if isinstance(text, str) and text.strip():
                return text.strip()

        text = payload.get("reply") or payload.get("message")
        if isinstance(text, str) and text.strip():
            return text.strip()

        return None

    async def send_message(
        self,
        user_message: str,
        conversation_id: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        convo_id = (conversation_id or str(uuid.uuid4())).strip()

        if not self.enabled:
            return {
                "reply": "",
                "conversation_id": convo_id,
                "provider": "orchestrate",
                "fallback_used": True,
                "error": "watsonx Orchestrate credentials are not configured.",
            }

        url = self._build_url()

        body: Dict[str, Any] = {
            "messages": [
                {
                    "role": "user",
                    "content": user_message,
                }
            ],
            "conversation_id": convo_id,
        }

        if self.agent_id:
            body["agent_id"] = self.agent_id

        if context:
            body["context"] = context

        req = urllib.request.Request(
            url,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self.api_key}",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=self.timeout) as resp:
                raw = resp.read().decode("utf-8")
                data = json.loads(raw)
        except urllib.error.HTTPError as e:
            detail = e.read().decode("utf-8", errors="ignore") if hasattr(e, "read") else str(e)
            logger.warning("watsonx Orchestrate HTTP error: %s", detail)
            return {
                "reply": "",
                "conversation_id": convo_id,
                "provider": "orchestrate",
                "fallback_used": True,
                "error": f"Orchestrate HTTP error: {detail[:240]}",
            }
        except Exception as e:
            logger.warning("watsonx Orchestrate call failed: %s", e)
            return {
                "reply": "",
                "conversation_id": convo_id,
                "provider": "orchestrate",
                "fallback_used": True,
                "error": f"Orchestrate call failed: {e}",
            }

        reply = self._extract_reply(data)
        if not reply:
            return {
                "reply": "",
                "conversation_id": convo_id,
                "provider": "orchestrate",
                "fallback_used": True,
                "error": "No reply text found in Orchestrate response payload.",
            }

        returned_convo_id = data.get("conversation_id") or convo_id
        return {
            "reply": reply,
            "conversation_id": str(returned_convo_id),
            "provider": "orchestrate",
            "fallback_used": False,
        }


watsonx_orchestrate_service = WatsonxOrchestrateService()
