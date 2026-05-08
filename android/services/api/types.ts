import {
  CommandResultResponse,
  DriveFileListResponse,
  GeneratedDriveFile,
  SendMessageRequest,
  SendMessageResponse,
} from "@/types/chat";
import Constants from "expo-constants";

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

export type OpenAIRealtimeActivationSource =
  | "approved_voice"
  | "wake_word"
  | "manual";

export interface CreateRealtimeCallRequest {
  sdp: string;
  conversationId?: string;
  activationSource?: OpenAIRealtimeActivationSource;
  safetyIdentifier?: string;
}

export interface CreateRealtimeCallResponse {
  sdp: string;
  model: string;
  voice: OpenAITtsVoice;
  reasoningEffort: string;
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
  createRealtimeCall?(
    request: CreateRealtimeCallRequest,
  ): Promise<CreateRealtimeCallResponse>;
}

const DEFAULT_API_BASE_URL = "https://cdnwell.store";

function normalizeApiBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function normalizeCaseHubToken(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function normalizeAppEnv(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function getExpoExtraValue(key: string): unknown {
  const extra = Constants.expoConfig?.extra;
  return extra && typeof extra === "object"
    ? (extra as Record<string, unknown>)[key]
    : undefined;
}

export const API_BASE_URL = normalizeApiBaseUrl(
  process.env.EXPO_PUBLIC_CASE_HUB_URL || DEFAULT_API_BASE_URL,
);

export const CASE_HUB_BOOTSTRAP_TOKEN = normalizeCaseHubToken(
  process.env.EXPO_PUBLIC_CASE_HUB_TOKEN ||
    getExpoExtraValue("caseHubBootstrapToken"),
);

const APP_ENV = normalizeAppEnv(
  process.env.EXPO_PUBLIC_APP_ENV ||
    getExpoExtraValue("appEnv"),
);

export const CASE_HUB_AUTH_ENABLED = ![
  "development",
  "dev",
  "local",
  "disabled",
  "off",
  "none",
].includes(APP_ENV);
