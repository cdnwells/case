export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
  executionStatus?: 'queued' | 'executing' | 'completed' | 'failed';
  errorMessage?: string;
  hasCommands?: boolean;
  executionId?: string;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export type ChatImageAttachmentMimeType = 'image/jpeg' | 'image/png';
export type ChatImageAttachmentContentType = ChatImageAttachmentMimeType;

export interface ChatImageAttachmentRequest {
  type: 'image';
  mimeType: ChatImageAttachmentMimeType;
  contentType: ChatImageAttachmentContentType;
  dataBase64: string;
  file: string;
  encoding: 'base64';
  imageSource: string;
  name: string;
  sizeBytes: number;
  source: 'file-picker';
}

export interface SendMessageRequest {
  content: string;
  conversationId?: string;
  attachments?: ChatImageAttachmentRequest[];
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
