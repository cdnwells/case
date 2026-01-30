import { mockChatService } from './mockChatService';
import { realChatService } from './chatService';

// Toggle between mock and real service
const USE_MOCK = true;

export const chatService = USE_MOCK ? mockChatService : realChatService;

export * from './types';
