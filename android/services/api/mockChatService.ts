import { IChatService } from './types';
import { Message, SendMessageRequest, SendMessageResponse } from '@/types/chat';

export class MockChatService implements IChatService {
  private delay = 1000;

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    await new Promise(resolve => setTimeout(resolve, this.delay));

    const responseMessage: Message = {
      id: `msg_${Date.now()}`,
      content: `Echo: ${request.content}`,
      role: 'assistant',
      timestamp: new Date(),
      status: 'sent',
    };

    return { message: responseMessage };
  }
}

export const mockChatService = new MockChatService();
