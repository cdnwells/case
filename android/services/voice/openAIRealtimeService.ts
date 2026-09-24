import type {
  CreateLiveSessionRequest,
  CreateLiveSessionResponse,
} from "../api/types";
import type { Message, SendMessageRequest, SendMessageResponse } from "../../types/chat";
import {
  OPENAI_REALTIME_BASE_URL,
  OPENAI_REALTIME_TOKEN,
} from "../api/types";

type LiveSessionApiResponse = {
  model?: string;
  session?: { id?: string; model?: string };
  transport?: { sdp?: string };
  voice?: string;
};

export class OpenAIRealtimeService {
  constructor(
    private readonly baseUrl = OPENAI_REALTIME_BASE_URL,
    private readonly token = OPENAI_REALTIME_TOKEN,
  ) {}

  private headers(): Record<string, string> {
    return {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}),
    };
  }

  async sendMessage(
    request: SendMessageRequest,
    history: Pick<Message, "role" | "content">[] = [],
  ): Promise<SendMessageResponse> {
    if (request.attachments?.length) {
      throw new Error("Attachments are not available in direct AI chat yet.");
    }
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        content: request.content,
        history: history
          .filter(item => item.content.trim())
          .slice(-40)
          .map(item => ({ role: item.role, content: item.content })),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(result?.message || "AI response failed. Please retry."), {
        retryable: result?.retryable === true,
      });
    }
    if (!result?.message || result.message.role !== "assistant" || typeof result.message.content !== "string") {
      throw new Error("The AI service returned an invalid response.");
    }
    return {
      message: {
        ...result.message,
        timestamp: new Date(result.message.timestamp || Date.now()),
      },
    };
  }

  async createSession(
    request: CreateLiveSessionRequest,
  ): Promise<CreateLiveSessionResponse> {
    const { signal, ...body } = request;
    const response = await fetch(`${this.baseUrl}/session`, {
      method: "POST",
      headers: {
        ...this.headers(),
      },
      body: JSON.stringify(body),
      signal,
    });

    const result = (await response.json().catch(() => ({}))) as
      | LiveSessionApiResponse
      | { message?: string; retryable?: boolean };
    if (!response.ok) {
      throw Object.assign(
        new Error(
          "message" in result && result.message
            ? result.message
            : "Voice connection failed. Please retry.",
        ),
        {
          retryable:
            "retryable" in result
              ? result.retryable === true
              : response.status === 429 || response.status >= 500,
        },
      );
    }

    const live = result as LiveSessionApiResponse;
    const sessionId = live.session?.id;
    const sdp = live.transport?.sdp;
    if (!sessionId || !sdp?.startsWith("v=0")) {
      throw Object.assign(new Error("The voice service returned an invalid session."), {
        retryable: true,
      });
    }

    return {
      sessionId,
      sdp,
      model: live.session?.model || live.model || "gpt-live-1",
      voice: live.voice === "cedar" ? "cedar" : "marin",
    };
  }

  async closeSession(): Promise<void> {
    // session.close on the WebRTC data channel finalizes the upstream session.
  }
}

export const openAIRealtimeService = new OpenAIRealtimeService();
