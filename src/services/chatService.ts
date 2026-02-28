export interface ChatMessageRequest {
  message: string;
  conversation_id?: string | null;
  context?: Record<string, unknown>;
}

export interface ChatMessageResponse {
  reply: string;
  conversation_id: string;
  provider: string;
  fallback_used: boolean;
}

const API_BASE = 'http://localhost:8000';

async function safeJson<T>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function sendChatMessage(payload: ChatMessageRequest): Promise<ChatMessageResponse | null> {
  try {
    const res = await fetch(`${API_BASE}/api/chat/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(20000),
    });

    if (!res.ok) return null;
    return await safeJson<ChatMessageResponse>(res);
  } catch {
    return null;
  }
}
