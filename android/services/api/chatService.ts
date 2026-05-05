import type {
  SendMessageRequest,
  SendMessageResponse,
  CommandResultResponse,
} from "@/types/chat";
import { API_BASE_URL, IChatService } from "./types";
import { createChatMessagePayload } from "./chatPayload";
import { createChatApiError, parseChatApiErrorBody } from "./chatErrors";

export class ChatService implements IChatService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: createChatMessagePayload(request),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw createChatApiError({
        body: parseChatApiErrorBody(errorText),
        status: response.status,
        statusText: response.statusText,
      });
    }

    return response.json();
  }

  async pollCommandResult(executionId: string): Promise<CommandResultResponse> {
    const response = await fetch(
      `${this.baseUrl}/command/result/${executionId}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { status: "not_found", executionId };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const realChatService = new ChatService();
