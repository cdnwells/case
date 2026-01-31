import { SendMessageRequest, SendMessageResponse } from '@/types/chat';

export interface IChatService {
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
}

export const API_BASE_URL = 'https://localhost:8000';
