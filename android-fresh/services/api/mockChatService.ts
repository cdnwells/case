import { IChatService } from './types';
import { Message, SendMessageRequest, SendMessageResponse, CommandResultResponse } from '@/types/chat';

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

  async pollCommandResult(executionId: string): Promise<CommandResultResponse> {
    await new Promise(resolve => setTimeout(resolve, this.delay));
    return {
      status: 'completed',
      executionId,
      result: {
        success: true,
        stdout: 'Mock command output',
        stderr: '',
        exit_code: 0,
        execution_time: 1.5,
      },
    };
  }
}

export const mockChatService = new MockChatService();
