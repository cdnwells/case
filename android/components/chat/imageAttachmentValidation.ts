export const CHAT_JPEG_ATTACHMENT_MIME_TYPE = "image/jpeg";
export const CHAT_PNG_ATTACHMENT_MIME_TYPE = "image/png";
export const CHAT_IMAGE_ATTACHMENT_PICKER_MIME_TYPE = "image/*";
export const CHAT_IMAGE_ATTACHMENT_MIME_TYPES = [
  CHAT_JPEG_ATTACHMENT_MIME_TYPE,
  CHAT_PNG_ATTACHMENT_MIME_TYPE,
] as const;
export const CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const CHAT_IMAGE_ATTACHMENT_MAX_SIZE_LABEL = "5MB";
export const CHAT_IMAGE_ATTACHMENT_UNSUPPORTED_TYPE_MESSAGE =
  "JPEG 또는 PNG 이미지만 첨부할 수 있습니다.";
export const CHAT_IMAGE_ATTACHMENT_TOO_LARGE_MESSAGE =
  `이미지 파일이 너무 큽니다. JPEG/PNG 이미지는 ${CHAT_IMAGE_ATTACHMENT_MAX_SIZE_LABEL} 이하만 첨부할 수 있습니다.`;
export const CHAT_IMAGE_ATTACHMENT_UNREADABLE_SIZE_MESSAGE =
  "이미지 크기를 확인할 수 없습니다.";
export const CHAT_IMAGE_ATTACHMENT_MISSING_SELECTION_MESSAGE =
  "JPEG 또는 PNG 이미지를 선택할 수 없습니다.";
export const CHAT_IMAGE_ATTACHMENT_NON_DECODABLE_MESSAGE =
  "이미지를 열 수 없습니다. 손상되지 않은 JPEG 또는 PNG 파일을 선택해 주세요.";

export type ChatImageAttachmentMimeType =
  (typeof CHAT_IMAGE_ATTACHMENT_MIME_TYPES)[number];

export interface PickedImageAttachmentFile {
  uri: string;
  type?: unknown;
  size?: unknown;
}

export interface SelectedImageAttachment {
  uri: string;
  name: string;
  mimeType: ChatImageAttachmentMimeType;
  sizeBytes: number;
  source: "file-picker";
}

export type ImageAttachmentSizeRejectionReason =
  | "missing_or_unreadable_size"
  | "too_large";

export interface ImageAttachmentSizeValidationResult {
  accepted: boolean;
  rejectionReason: ImageAttachmentSizeRejectionReason | null;
}

export type ImageAttachmentDecodeRejectionReason = "decode_failed";

export interface ImageAttachmentDecodedDimensions {
  width: number;
  height: number;
}

export type DecodeImageAttachment = (
  uri: string,
) => Promise<ImageAttachmentDecodedDimensions>;

export interface ImageAttachmentDecodeValidationResult {
  accepted: boolean;
  rejectionReason: ImageAttachmentDecodeRejectionReason | null;
}

export type ImageAttachmentPayloadRejectionReason =
  | "invalid_base64"
  | "unsupported_image_data"
  | ImageAttachmentSizeRejectionReason;

export type PreparedImageAttachmentPayload =
  | {
      accepted: true;
      dataBase64: string;
      mimeType: ChatImageAttachmentMimeType;
      sizeBytes: number;
      rejectionReason: null;
    }
  | {
      accepted: false;
      dataBase64: null;
      mimeType: null;
      sizeBytes: null;
      rejectionReason: ImageAttachmentPayloadRejectionReason;
    };

export type ImageAttachmentSelectionRejectionReason =
  | "missing_selection"
  | "unsupported_type"
  | ImageAttachmentSizeRejectionReason;

export type ImageAttachmentSelectionValidationResult =
  | {
      accepted: true;
      attachment: SelectedImageAttachment;
      rejectionReason: null;
    }
  | {
      accepted: false;
      attachment: null;
      rejectionReason: ImageAttachmentSelectionRejectionReason;
    };

export function isSupportedImageAttachmentMimeType(
  mimeType: unknown,
): mimeType is ChatImageAttachmentMimeType {
  const normalizedMimeType = normalizePickedFileMimeType(mimeType);

  return (
    normalizedMimeType !== null &&
    CHAT_IMAGE_ATTACHMENT_MIME_TYPES.includes(
      normalizedMimeType as ChatImageAttachmentMimeType,
    )
  );
}

export function normalizePickedFileMimeType(mimeType: unknown): string | null {
  if (typeof mimeType !== "string") {
    return null;
  }

  const normalizedMimeType = mimeType
    .split(";")[0]
    ?.trim()
    .toLowerCase();

  return normalizedMimeType || null;
}

export function inferSelectedImageAttachmentMimeType(
  uri: string,
  detectedMimeType?: unknown,
): ChatImageAttachmentMimeType | null {
  const normalizedDetectedMimeType =
    normalizePickedFileMimeType(detectedMimeType);

  if (isSupportedImageAttachmentMimeType(normalizedDetectedMimeType)) {
    return normalizedDetectedMimeType as ChatImageAttachmentMimeType;
  }

  if (normalizedDetectedMimeType) {
    return null;
  }

  const uriPath = decodeURIComponent(uri.split("?")[0] ?? "")
    .toLowerCase()
    .trim();

  if (uriPath.endsWith(".jpg") || uriPath.endsWith(".jpeg")) {
    return CHAT_JPEG_ATTACHMENT_MIME_TYPE;
  }

  if (uriPath.endsWith(".png")) {
    return CHAT_PNG_ATTACHMENT_MIME_TYPE;
  }

  return null;
}

export function normalizePickedFileSizeBytes(sizeBytes: unknown): number | null {
  if (typeof sizeBytes !== "number" || !Number.isFinite(sizeBytes)) {
    return null;
  }

  return Math.trunc(sizeBytes);
}

export function validateSelectedImageAttachmentSize(
  sizeBytes: unknown,
): ImageAttachmentSizeValidationResult {
  const normalizedSizeBytes = normalizePickedFileSizeBytes(sizeBytes);

  if (normalizedSizeBytes === null || normalizedSizeBytes <= 0) {
    return {
      accepted: false,
      rejectionReason: "missing_or_unreadable_size",
    };
  }

  if (normalizedSizeBytes > CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES) {
    return {
      accepted: false,
      rejectionReason: "too_large",
    };
  }

  return {
    accepted: true,
    rejectionReason: null,
  };
}

export function getImageAttachmentSizeValidationErrorMessage(
  validation: ImageAttachmentSizeValidationResult,
): string {
  if (validation.rejectionReason === "too_large") {
    return CHAT_IMAGE_ATTACHMENT_TOO_LARGE_MESSAGE;
  }

  return CHAT_IMAGE_ATTACHMENT_UNREADABLE_SIZE_MESSAGE;
}

type RejectedImageAttachmentSelection = Extract<
  ImageAttachmentSelectionValidationResult,
  { accepted: false }
>;

export function getImageAttachmentSelectionValidationErrorMessage(
  selection: RejectedImageAttachmentSelection,
): string {
  if (selection.rejectionReason === "unsupported_type") {
    return CHAT_IMAGE_ATTACHMENT_UNSUPPORTED_TYPE_MESSAGE;
  }

  if (selection.rejectionReason === "missing_selection") {
    return CHAT_IMAGE_ATTACHMENT_MISSING_SELECTION_MESSAGE;
  }

  return getImageAttachmentSizeValidationErrorMessage({
    accepted: false,
    rejectionReason: selection.rejectionReason,
  });
}

export function normalizeImageAttachmentBase64Payload(
  dataBase64: unknown,
): string | null {
  if (typeof dataBase64 !== "string") {
    return null;
  }

  const trimmedPayload = dataBase64.trim();
  const dataUrlMatch = trimmedPayload.match(
    /^data:image\/(?:jpeg|png);base64,(.+)$/i,
  );
  const rawPayload = dataUrlMatch?.[1] ?? trimmedPayload;
  const normalizedPayload = rawPayload.replace(/\s/g, "");

  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalizedPayload)) {
    return null;
  }

  return normalizedPayload;
}

export function estimateImageAttachmentDecodedSizeBytes(
  dataBase64: unknown,
): number | null {
  const normalizedPayload = normalizeImageAttachmentBase64Payload(dataBase64);
  if (!normalizedPayload) {
    return null;
  }

  const paddingBytes = normalizedPayload.endsWith("==")
    ? 2
    : normalizedPayload.endsWith("=")
      ? 1
      : 0;
  const decodedSizeBytes =
    Math.floor((normalizedPayload.length * 3) / 4) - paddingBytes;

  return decodedSizeBytes > 0 ? decodedSizeBytes : null;
}

export function inferImageAttachmentMimeTypeFromBase64(
  dataBase64: unknown,
): ChatImageAttachmentMimeType | null {
  const normalizedPayload = normalizeImageAttachmentBase64Payload(dataBase64);
  if (!normalizedPayload) {
    return null;
  }

  if (normalizedPayload.startsWith("/9j/")) {
    return CHAT_JPEG_ATTACHMENT_MIME_TYPE;
  }

  if (normalizedPayload.startsWith("iVBORw0KGgo")) {
    return CHAT_PNG_ATTACHMENT_MIME_TYPE;
  }

  return null;
}

export function normalizePreparedImageAttachmentPayload(
  dataBase64: unknown,
): PreparedImageAttachmentPayload {
  const normalizedPayload = normalizeImageAttachmentBase64Payload(dataBase64);
  if (!normalizedPayload) {
    return {
      accepted: false,
      dataBase64: null,
      mimeType: null,
      sizeBytes: null,
      rejectionReason: "invalid_base64",
    };
  }

  const mimeType = inferImageAttachmentMimeTypeFromBase64(normalizedPayload);
  if (!mimeType) {
    return {
      accepted: false,
      dataBase64: null,
      mimeType: null,
      sizeBytes: null,
      rejectionReason: "unsupported_image_data",
    };
  }

  const decodedSizeBytes =
    estimateImageAttachmentDecodedSizeBytes(normalizedPayload);
  const sizeValidation = validateSelectedImageAttachmentSize(decodedSizeBytes);
  if (!sizeValidation.accepted || decodedSizeBytes === null) {
    return {
      accepted: false,
      dataBase64: null,
      mimeType: null,
      sizeBytes: null,
      rejectionReason:
        sizeValidation.rejectionReason ?? "missing_or_unreadable_size",
    };
  }

  return {
    accepted: true,
    dataBase64: normalizedPayload,
    mimeType,
    sizeBytes: decodedSizeBytes,
    rejectionReason: null,
  };
}

export function getPreparedImageAttachmentPayloadErrorMessage(
  payload: Extract<PreparedImageAttachmentPayload, { accepted: false }>,
): string {
  if (
    payload.rejectionReason === "missing_or_unreadable_size" ||
    payload.rejectionReason === "too_large"
  ) {
    return getImageAttachmentSizeValidationErrorMessage({
      accepted: false,
      rejectionReason: payload.rejectionReason,
    });
  }

  return CHAT_IMAGE_ATTACHMENT_NON_DECODABLE_MESSAGE;
}

export interface RejectedImageAttachmentSelectionStateUpdate {
  selectedImageAttachment: null;
  attachmentError: string;
}

export function getRejectedImageAttachmentSelectionStateUpdate(
  selection: RejectedImageAttachmentSelection,
): RejectedImageAttachmentSelectionStateUpdate {
  return {
    selectedImageAttachment: null,
    attachmentError: getImageAttachmentSelectionValidationErrorMessage(
      selection,
    ),
  };
}

export function validateDecodedImageAttachmentDimensions(
  dimensions: unknown,
): ImageAttachmentDecodeValidationResult {
  if (!dimensions || typeof dimensions !== "object") {
    return {
      accepted: false,
      rejectionReason: "decode_failed",
    };
  }

  const decodedDimensions = dimensions as Partial<ImageAttachmentDecodedDimensions>;
  const width = decodedDimensions.width;
  const height = decodedDimensions.height;

  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return {
      accepted: false,
      rejectionReason: "decode_failed",
    };
  }

  return {
    accepted: true,
    rejectionReason: null,
  };
}

export async function validateSelectedImageAttachmentDecodable(
  uri: string,
  decodeImageAttachment: DecodeImageAttachment,
): Promise<ImageAttachmentDecodeValidationResult> {
  if (!uri.trim()) {
    return {
      accepted: false,
      rejectionReason: "decode_failed",
    };
  }

  try {
    return validateDecodedImageAttachmentDimensions(
      await decodeImageAttachment(uri),
    );
  } catch {
    return {
      accepted: false,
      rejectionReason: "decode_failed",
    };
  }
}

export function getAttachmentNameFromUri(uri: string): string {
  const path = decodeURIComponent(uri.split("?")[0] ?? "");
  return path.split("/").filter(Boolean).pop() || "image";
}

export function createSelectedImageAttachmentFromPickedFile(
  pickedFile: PickedImageAttachmentFile | null | undefined,
): ImageAttachmentSelectionValidationResult {
  if (
    !pickedFile ||
    typeof pickedFile.uri !== "string" ||
    !pickedFile.uri.trim()
  ) {
    return {
      accepted: false,
      attachment: null,
      rejectionReason: "missing_selection",
    };
  }

  const uri = pickedFile.uri.trim();
  const mimeType = inferSelectedImageAttachmentMimeType(uri, pickedFile.type);
  if (!mimeType) {
    return {
      accepted: false,
      attachment: null,
      rejectionReason: "unsupported_type",
    };
  }

  const sizeBytes = normalizePickedFileSizeBytes(pickedFile.size);
  const validation = validateSelectedImageAttachmentSize(sizeBytes);

  if (!validation.accepted || sizeBytes === null) {
    return {
      accepted: false,
      attachment: null,
      rejectionReason:
        validation.rejectionReason ?? "missing_or_unreadable_size",
    };
  }

  return {
    accepted: true,
    attachment: {
      uri,
      name: getAttachmentNameFromUri(uri),
      mimeType,
      sizeBytes,
      source: "file-picker",
    },
    rejectionReason: null,
  };
}

export const validateSelectedJpegAttachmentSize =
  validateSelectedImageAttachmentSize;
