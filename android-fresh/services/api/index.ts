import { realChatService } from './chatService';
import { mockChatService } from './mockChatService';

// Toggle between mock and real service
const USE_MOCK = false;

export const chatService = USE_MOCK ? mockChatService : realChatService;

export * from './types';
