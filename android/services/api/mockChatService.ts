import { IChatService } from './types';
import {
  CommandResultResponse,
  DriveFileListResponse,
  GeneratedDriveFile,
  Message,
  SendMessageRequest,
  SendMessageResponse,
} from '@/types/chat';
import type {
  CreateLiveSessionRequest,
  CreateLiveSessionResponse,
  SynthesizeSpeechRequest,
  SynthesizeSpeechResponse,
} from './types';

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

  async listDriveFiles(): Promise<DriveFileListResponse> {
    await new Promise(resolve => setTimeout(resolve, this.delay));
    return {
      files: [],
    };
  }

  async downloadGeneratedFile(file: GeneratedDriveFile): Promise<string> {
    await new Promise(resolve => setTimeout(resolve, this.delay));
    return `mock://drive/${file.driveFileId || file.id}`;
  }

  async synthesizeSpeech(
    request: SynthesizeSpeechRequest,
  ): Promise<SynthesizeSpeechResponse> {
    await new Promise(resolve => setTimeout(resolve, this.delay));
    return {
      uri: `mock://speech/${encodeURIComponent(request.input.slice(0, 24))}`,
      voice: request.voice || 'marin',
      contentType: 'audio/mpeg',
    };
  }

  async createLiveSession(
    request: CreateLiveSessionRequest,
  ): Promise<CreateLiveSessionResponse> {
    await new Promise(resolve => setTimeout(resolve, this.delay));
    return {
      sdp: request.sdp,
      sessionId: 'mock-live',
      controlToken: 'mock-control',
      model: 'gpt-live-1',
      voice: 'marin',
    };
  }
}

export const mockChatService = new MockChatService();
