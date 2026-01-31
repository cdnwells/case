import { SendMessageRequest, SendMessageResponse } from '@/types/chat';
import { Platform } from 'react-native';

export interface IChatService {
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
}

export const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
