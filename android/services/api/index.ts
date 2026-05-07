import { realChatService } from './chatService';
import { mockChatService } from './mockChatService';
import type { IChatService } from './types';

// Toggle between mock and real service
const USE_MOCK = false;

export const chatService: IChatService = USE_MOCK ? mockChatService : realChatService;

export * from './types';
