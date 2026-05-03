export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
  executionStatus?: 'queued' | 'executing' | 'completed' | 'failed';
  hasCommands?: boolean;
  executionId?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface SendMessageRequest {
  content: string;
  conversationId?: string;
}

export interface SendMessageResponse {
  message: Message;
}

export interface CommandResultResponse {
  status: 'queued' | 'executing' | 'completed' | 'failed' | 'not_found';
  executionId: string;
  result?: {
    success: boolean;
    stdout: string;
    stderr: string;
    exit_code: number;
    execution_time: number;
  };
}
