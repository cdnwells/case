import type {
  CommandResultResponse,
  DriveFileListResponse,
  GeneratedDriveFile,
  SendMessageRequest,
  SendMessageResponse,
} from "@/types/chat";
import { Directory, File, Paths } from "expo-file-system";
import {
  API_BASE_URL,
  IChatService,
  type OpenAITtsVoice,
  type SynthesizeSpeechRequest,
  type SynthesizeSpeechResponse,
} from "./types";
import { createChatMessagePayload } from "./chatPayload";
import { createChatApiError, parseChatApiErrorBody } from "./chatErrors";
import { caseHubTokenStore, type CaseHubTokenStore } from "./tokenStore";

const CASE_HUB_TOKEN_HEADER = "X-Case-Hub-Token";
const DRIVE_DOWNLOAD_DIRECTORY_NAME = "case-drive-downloads";
const SPEECH_AUDIO_CACHE_DIRECTORY_NAME = "case-openai-tts";
const DEFAULT_OPENAI_TTS_VOICE: OpenAITtsVoice = "marin";

function sanitizeDownloadFileName(name: string): string {
  const sanitized = name
    .trim()
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, " ");

  return sanitized || "drive-file";
}

export class ChatService implements IChatService {
  private baseUrl: string;
  private tokenStore: CaseHubTokenStore;
  private hasInitialRefreshCompleted = false;
  private tokenRefreshPromise: Promise<boolean> | null = null;

  constructor(
    baseUrl: string = API_BASE_URL,
    tokenStore: CaseHubTokenStore = caseHubTokenStore,
  ) {
    this.baseUrl = baseUrl;
    this.tokenStore = tokenStore;
  }

  private async fetchLocalToken(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/auth/refresh-local`, {
        method: "POST",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        return false;
      }

      const body = await response.json();
      if (typeof body?.token !== "string" || body.token.trim().length === 0) {
        return false;
      }

      await this.tokenStore.setToken(body.token);
      return true;
    } catch {
      return false;
    }
  }

  async refreshLocalToken(): Promise<boolean> {
    if (!this.tokenRefreshPromise) {
      this.tokenRefreshPromise = this.fetchLocalToken().finally(() => {
        this.tokenRefreshPromise = null;
      });
    }

    const refreshed = await this.tokenRefreshPromise;
    if (refreshed) {
      this.hasInitialRefreshCompleted = true;
      return true;
    }

    const existingToken = await this.tokenStore.getToken().catch(() => null);
    if (existingToken) {
      this.hasInitialRefreshCompleted = true;
    }
    return false;
  }

  private async ensureInitialTokenRefreshAttempted(): Promise<void> {
    if (this.hasInitialRefreshCompleted) {
      return;
    }

    await this.refreshLocalToken().catch(() => false);
  }

  private async createHeaders(
    headers: Record<string, string> = {},
  ): Promise<Record<string, string>> {
    const token = await this.tokenStore.getToken().catch(() => null);
    return token
      ? { ...headers, [CASE_HUB_TOKEN_HEADER]: token }
      : headers;
  }

  private async fetchWithAuth(
    pathname: string,
    options: RequestInit & { headers?: Record<string, string> } = {},
  ): Promise<Response> {
    await this.ensureInitialTokenRefreshAttempted();

    const request = async () =>
      fetch(`${this.baseUrl}${pathname}`, {
        ...options,
        headers: await this.createHeaders(options.headers || {}),
      });

    const response = await request();
    if (response.status !== 401) {
      return response;
    }

    const refreshed = await this.refreshLocalToken();
    return refreshed ? request() : response;
  }

  async sendMessage(request: SendMessageRequest): Promise<SendMessageResponse> {
    const response = await this.fetchWithAuth("/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: createChatMessagePayload(request),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw createChatApiError({
        body: parseChatApiErrorBody(errorText),
        status: response.status,
        statusText: response.statusText,
      });
    }

    return response.json();
  }

  async pollCommandResult(executionId: string): Promise<CommandResultResponse> {
    const response = await this.fetchWithAuth(
      `/command/result/${executionId}`,
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { status: "not_found", executionId };
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async listDriveFiles(query = ""): Promise<DriveFileListResponse> {
    const searchParams = new URLSearchParams();
    if (query.trim()) {
      searchParams.set("q", query.trim());
    }
    const queryString = searchParams.toString();
    const response = await this.fetchWithAuth(
      `/drive/files${queryString ? `?${queryString}` : ""}`,
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  async downloadGeneratedFile(file: GeneratedDriveFile): Promise<string> {
    await this.ensureInitialTokenRefreshAttempted();

    const directory = new Directory(Paths.document, DRIVE_DOWNLOAD_DIRECTORY_NAME);
    directory.create({ idempotent: true, intermediates: true });

    const destination = new File(directory, sanitizeDownloadFileName(file.name));
    const downloaded = await File.downloadFileAsync(
      `${this.baseUrl}/drive/files/${encodeURIComponent(file.driveFileId || file.id)}/download`,
      destination,
      {
        headers: await this.createHeaders(),
        idempotent: true,
      },
    );

    return downloaded.uri;
  }

  async synthesizeSpeech(
    request: SynthesizeSpeechRequest,
  ): Promise<SynthesizeSpeechResponse> {
    const voice = request.voice || DEFAULT_OPENAI_TTS_VOICE;
    const response = await this.fetchWithAuth("/speech", {
      method: "POST",
      headers: {
        Accept: "audio/mpeg",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: request.input,
        voice,
        ...(request.instructions ? { instructions: request.instructions } : {}),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw createChatApiError({
        body: parseChatApiErrorBody(errorText),
        status: response.status,
        statusText: response.statusText,
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength === 0) {
      throw new Error("Speech synthesis returned empty audio");
    }

    const directory = new Directory(Paths.cache, SPEECH_AUDIO_CACHE_DIRECTORY_NAME);
    directory.create({ idempotent: true, intermediates: true });

    const filename = `speech-${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`;
    const file = new File(directory, filename);
    file.write(new Uint8Array(arrayBuffer));

    return {
      uri: file.uri,
      voice,
      contentType: response.headers.get("content-type") || "audio/mpeg",
    };
  }
}

export const realChatService = new ChatService();
