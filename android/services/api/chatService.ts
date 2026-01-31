import { SendMessageRequest, SendMessageResponse } from '@/types/chat';
import { API_BASE_URL, IChatService } from './types';

export class ChatService implements IChatService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    console.log(`base url: ${this.baseUrl}`);

    const response = await fetch(`${this.baseUrl}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }
}

export const realChatService = new ChatService();
