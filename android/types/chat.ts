export interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
  generatedFiles?: GeneratedDriveFile[];
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

export interface DriveFileSummary {
  id: string;
  driveFileId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  webViewLink?: string;
  createdAt?: string;
}

export type GeneratedDriveFile = DriveFileSummary;

export interface ChatDriveFileAttachmentRequest {
  type: 'drive-file';
  driveFileId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  source: 'google-drive';
}

export type ChatAttachmentRequest =
  | ChatImageAttachmentRequest
  | ChatDriveFileAttachmentRequest;

export interface SendMessageRequest {
  content: string;
  conversationId?: string;
  attachments?: ChatAttachmentRequest[];
}

export interface SendMessageResponse {
  message: Message;
}

export interface DriveFileListResponse {
  files: DriveFileSummary[];
  nextPageToken?: string;
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
