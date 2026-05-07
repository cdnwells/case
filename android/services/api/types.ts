import {
  CommandResultResponse,
  DriveFileListResponse,
  GeneratedDriveFile,
  SendMessageRequest,
  SendMessageResponse,
} from "@/types/chat";

export type OpenAITtsVoice = "marin" | "cedar";

export interface SynthesizeSpeechRequest {
  input: string;
  voice?: OpenAITtsVoice;
  instructions?: string;
}

export interface SynthesizeSpeechResponse {
  uri: string;
  voice: OpenAITtsVoice;
  contentType: string;
}

export interface IChatService {
  refreshLocalToken?(): Promise<boolean>;
  sendMessage(request: SendMessageRequest): Promise<SendMessageResponse>;
  pollCommandResult(executionId: string): Promise<CommandResultResponse>;
  listDriveFiles(query?: string): Promise<DriveFileListResponse>;
  downloadGeneratedFile(file: GeneratedDriveFile): Promise<string>;
  synthesizeSpeech?(
    request: SynthesizeSpeechRequest,
  ): Promise<SynthesizeSpeechResponse>;
}

const DEFAULT_API_BASE_URL = "https://cdnwell.store";

function normalizeApiBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

export const API_BASE_URL = normalizeApiBaseUrl(
  process.env.EXPO_PUBLIC_CASE_HUB_URL || DEFAULT_API_BASE_URL,
);
