export const GENERIC_SEND_MESSAGE_ERROR = "Failed to send message";
export const IMAGE_UNDERSTANDING_UNSUPPORTED_PROVIDER_MODEL_MESSAGE =
  "Image understanding requires a multimodal provider/model";

type ChatErrorBody = {
  code?: unknown;
  detail?: unknown;
  error?: unknown;
  message?: unknown;
  provider?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export class ChatApiError extends Error {
  readonly body: unknown;
  readonly code: string | null;
  readonly provider: string | null;
  readonly status: number;
  readonly statusText: string;

  constructor({
    body,
    code = null,
    message,
    provider = null,
    status,
    statusText,
  }: {
    body: unknown;
    code?: string | null;
    message: string;
    provider?: string | null;
    status: number;
    statusText: string;
  }) {
    super(message);
    this.name = "ChatApiError";
    this.body = body;
    this.code = code;
    this.provider = provider;
    this.status = status;
    this.statusText = statusText;
  }
}

export function parseChatApiErrorBody(responseText: string): unknown {
  const trimmed = responseText.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return trimmed;
  }
}

export function extractChatApiErrorMessage(body: unknown): string | null {
  if (typeof body === "string") {
    return nonEmptyString(body);
  }

  if (!isRecord(body)) {
    return null;
  }

  const chatBody = body as ChatErrorBody;
  return (
    nonEmptyString(chatBody.message) ||
    nonEmptyString(chatBody.detail) ||
    nonEmptyString(chatBody.error)
  );
}

export function createChatApiError({
  body,
  status,
  statusText,
}: {
  body: unknown;
  status: number;
  statusText: string;
}): ChatApiError {
  const message =
    extractChatApiErrorMessage(body) ||
    `HTTP error! status: ${status}`;
  const provider = isRecord(body) ? nonEmptyString(body.provider) : null;
  const code = isRecord(body) ? nonEmptyString(body.code) : null;

  return new ChatApiError({
    body,
    code,
    message,
    provider,
    status,
    statusText,
  });
}

export function getSendMessageErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) {
      return message;
    }
  }

  if (typeof error === "string") {
    const message = error.trim();
    if (message) {
      return message;
    }
  }

  return GENERIC_SEND_MESSAGE_ERROR;
}
