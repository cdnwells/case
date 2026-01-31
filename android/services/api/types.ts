import { SendMessageRequest, SendMessageResponse } from '@/types/chat';
import { Platform } from 'react-native';

export interface IChatService {
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
}

export const API_BASE_URL = Platform.OS === 'android' ? 'http://192.168.0.18:5000' : 'http://localhost:5000';
