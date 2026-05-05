import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES,
  CHAT_IMAGE_ATTACHMENT_MIME_TYPES,
  CHAT_IMAGE_ATTACHMENT_NON_DECODABLE_MESSAGE,
  CHAT_IMAGE_ATTACHMENT_PICKER_MIME_TYPE,
  CHAT_IMAGE_ATTACHMENT_TOO_LARGE_MESSAGE,
  CHAT_IMAGE_ATTACHMENT_UNSUPPORTED_TYPE_MESSAGE,
  createSelectedImageAttachmentFromPickedFile,
  estimateImageAttachmentDecodedSizeBytes,
  getImageAttachmentSelectionValidationErrorMessage,
  getPreparedImageAttachmentPayloadErrorMessage,
  getRejectedImageAttachmentSelectionStateUpdate,
  getImageAttachmentSizeValidationErrorMessage,
  inferImageAttachmentMimeTypeFromBase64,
  inferSelectedImageAttachmentMimeType,
  normalizeImageAttachmentBase64Payload,
  normalizePreparedImageAttachmentPayload,
  normalizePickedFileMimeType,
  normalizePickedFileSizeBytes,
  validateDecodedImageAttachmentDimensions,
  validateSelectedImageAttachmentDecodable,
  validateSelectedImageAttachmentSize,
} from "./imageAttachmentValidation.ts";

test("image attachment picker is configured for Android image files", () => {
  assert.equal(CHAT_IMAGE_ATTACHMENT_PICKER_MIME_TYPE, "image/*");
  assert.deepEqual(CHAT_IMAGE_ATTACHMENT_MIME_TYPES, [
    "image/jpeg",
    "image/png",
  ]);
});

test("plant JPEG fixture attaches successfully through the existing Android file picker path", () => {
  const plantBytes = readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../../hub/test-fixtures/plant.jpg",
    ),
  );
  assert.ok(plantBytes.length > 0);
  assert.ok(plantBytes.length <= CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES);
  assert.equal(plantBytes[0], 0xff);
  assert.equal(plantBytes[1], 0xd8);
  assert.equal(plantBytes[2], 0xff);

  const selection = createSelectedImageAttachmentFromPickedFile({
    uri: "content://case-picker/plant.jpg",
    type: "image/jpeg",
    size: plantBytes.length,
  });

  assert.equal(selection.accepted, true);
  assert.equal(selection.rejectionReason, null);
  assert.deepEqual(selection.attachment, {
    uri: "content://case-picker/plant.jpg",
    name: "plant.jpg",
    mimeType: "image/jpeg",
    sizeBytes: plantBytes.length,
    source: "file-picker",
  });

  const chatInputSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "ChatInput.tsx"),
    "utf8",
  );
  const pickerIndex = chatInputSource.indexOf("File.pickFileAsync(");
  const selectionIndex = chatInputSource.indexOf(
    "createSelectedImageAttachmentFromPickedFile(pickedFile)",
  );

  assert.notEqual(pickerIndex, -1);
  assert.notEqual(selectionIndex, -1);
  assert.ok(pickerIndex < selectionIndex);
  assert.match(
    chatInputSource,
    /File\.pickFileAsync\(\s*undefined,\s*CHAT_IMAGE_ATTACHMENT_PICKER_MIME_TYPE,\s*\)/,
  );
});

test("store receipt PNG fixture attaches successfully through the existing Android file picker path", () => {
  const receiptBytes = readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../../hub/test-fixtures/store-receipt.png",
    ),
  );
  assert.ok(receiptBytes.length > 0);
  assert.ok(receiptBytes.length <= CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES);
  assert.equal(receiptBytes[0], 0x89);
  assert.equal(receiptBytes[1], 0x50);
  assert.equal(receiptBytes[2], 0x4e);
  assert.equal(receiptBytes[3], 0x47);

  const selection = createSelectedImageAttachmentFromPickedFile({
    uri: "content://case-picker/store-receipt.png",
    type: "image/png",
    size: receiptBytes.length,
  });

  assert.equal(selection.accepted, true);
  assert.equal(selection.rejectionReason, null);
  assert.deepEqual(selection.attachment, {
    uri: "content://case-picker/store-receipt.png",
    name: "store-receipt.png",
    mimeType: "image/png",
    sizeBytes: receiptBytes.length,
    source: "file-picker",
  });

  const chatInputSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "ChatInput.tsx"),
    "utf8",
  );
  const pickerIndex = chatInputSource.indexOf("File.pickFileAsync(");
  const selectionIndex = chatInputSource.indexOf(
    "createSelectedImageAttachmentFromPickedFile(pickedFile)",
  );

  assert.notEqual(pickerIndex, -1);
  assert.notEqual(selectionIndex, -1);
  assert.ok(pickerIndex < selectionIndex);
  assert.match(
    chatInputSource,
    /File\.pickFileAsync\(\s*undefined,\s*CHAT_IMAGE_ATTACHMENT_PICKER_MIME_TYPE,\s*\)/,
  );
});

test("image attachment MIME inference accepts JPEG and PNG only", () => {
  assert.equal(
    inferSelectedImageAttachmentMimeType("content://picked/photo.png", ""),
    "image/png",
  );
  assert.equal(
    inferSelectedImageAttachmentMimeType("content://picked/photo.jpg", ""),
    "image/jpeg",
  );
  assert.equal(
    inferSelectedImageAttachmentMimeType(
      "content://picked/photo.webp",
      "image/webp",
    ),
    null,
  );
});

test("prepared image payload normalizes MIME type and size from actual base64 bytes", () => {
  const receiptBytes = readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../../../hub/test-fixtures/store-receipt.png",
    ),
  );
  const receiptPayload = receiptBytes.toString("base64");
  const preparedPayload = normalizePreparedImageAttachmentPayload(receiptPayload);

  assert.equal(
    inferImageAttachmentMimeTypeFromBase64(receiptPayload),
    "image/png",
  );
  assert.equal(
    estimateImageAttachmentDecodedSizeBytes(receiptPayload),
    receiptBytes.length,
  );
  assert.deepEqual(preparedPayload, {
    accepted: true,
    dataBase64: receiptPayload,
    mimeType: "image/png",
    sizeBytes: receiptBytes.length,
    rejectionReason: null,
  });
});

test("prepared image payload rejects non-image base64 before hub submission", () => {
  const textPayload = Buffer.from("not really an image").toString("base64");
  const preparedPayload = normalizePreparedImageAttachmentPayload(textPayload);

  assert.equal(normalizeImageAttachmentBase64Payload(textPayload), textPayload);
  assert.equal(inferImageAttachmentMimeTypeFromBase64(textPayload), null);
  assert.equal(preparedPayload.accepted, false);
  assert.equal(preparedPayload.rejectionReason, "unsupported_image_data");
  assert.equal(
    getPreparedImageAttachmentPayloadErrorMessage(preparedPayload),
    CHAT_IMAGE_ATTACHMENT_NON_DECODABLE_MESSAGE,
  );
});

test("image attachment MIME inference treats picker MIME as authoritative", () => {
  assert.equal(
    normalizePickedFileMimeType(" IMAGE/JPEG; charset=binary "),
    "image/jpeg",
  );
  assert.equal(
    inferSelectedImageAttachmentMimeType(
      "content://picked/misleading-name.jpg",
      "application/pdf",
    ),
    null,
  );
  assert.equal(
    inferSelectedImageAttachmentMimeType(
      "content://picked/misleading-name.png",
      "image/heic",
    ),
    null,
  );
});

test("non-JPEG/PNG picker attachments are rejected before attachment creation", () => {
  const unsupportedFiles = [
    {
      label: "GIF",
      pickedFile: {
        uri: "content://case-picker/animated.gif",
        type: "image/gif",
        size: 1024,
      },
    },
    {
      label: "WebP",
      pickedFile: {
        uri: "content://case-picker/render.webp",
        type: "image/webp",
        size: 1024,
      },
    },
    {
      label: "PDF",
      pickedFile: {
        uri: "content://case-picker/report.pdf",
        type: "application/pdf",
        size: 1024,
      },
    },
    {
      label: "HEIC",
      pickedFile: {
        uri: "content://case-picker/photo.heic",
        type: "image/heic",
        size: 2048,
      },
    },
    {
      label: "HEIF",
      pickedFile: {
        uri: "content://case-picker/photo.heif",
        type: "image/heif",
        size: 2048,
      },
    },
    {
      label: "SVG",
      pickedFile: {
        uri: "content://case-picker/vector.svg",
        type: "image/svg+xml",
        size: 1024,
      },
    },
  ];

  for (const { label, pickedFile } of unsupportedFiles) {
    const submittedRequests = [];
    const selection = createSelectedImageAttachmentFromPickedFile(pickedFile);

    if (selection.accepted) {
      submittedRequests.push({
        content: `Describe this ${label} attachment`,
        attachments: [selection.attachment],
      });
    }

    assert.equal(selection.accepted, false, label);
    assert.equal(selection.attachment, null, label);
    assert.equal(selection.rejectionReason, "unsupported_type", label);
    assert.equal(
      CHAT_IMAGE_ATTACHMENT_UNSUPPORTED_TYPE_MESSAGE,
      "JPEG 또는 PNG 이미지만 첨부할 수 있습니다.",
    );
    assert.equal(submittedRequests.length, 0, label);
  }
});

test("image attachment size validation accepts files up to 5MB", () => {
  assert.equal(
    validateSelectedImageAttachmentSize(CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES)
      .accepted,
    true,
  );
});

test("image attachment size validation rejects files over 5MB", () => {
  const validation = validateSelectedImageAttachmentSize(
    CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
  );

  assert.equal(validation.accepted, false);
  assert.equal(validation.rejectionReason, "too_large");
});

test("oversized image rejection returns a clear user-facing too-large message", () => {
  const selection = createSelectedImageAttachmentFromPickedFile({
    uri: "content://case-picker/oversized.jpg",
    type: "image/jpeg",
    size: CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
  });
  const validation = validateSelectedImageAttachmentSize(
    CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
  );

  assert.equal(selection.accepted, false);
  assert.equal(selection.rejectionReason, "too_large");
  assert.equal(
    getImageAttachmentSizeValidationErrorMessage(validation),
    CHAT_IMAGE_ATTACHMENT_TOO_LARGE_MESSAGE,
  );
  assert.equal(
    getImageAttachmentSelectionValidationErrorMessage(selection),
    CHAT_IMAGE_ATTACHMENT_TOO_LARGE_MESSAGE,
  );
  assert.match(CHAT_IMAGE_ATTACHMENT_TOO_LARGE_MESSAGE, /너무 큽니다/);
  assert.match(CHAT_IMAGE_ATTACHMENT_TOO_LARGE_MESSAGE, /5MB/);
  assert.match(CHAT_IMAGE_ATTACHMENT_TOO_LARGE_MESSAGE, /JPEG\/PNG/);
});

test("oversized image rejection preserves composer text and clears attachment state", () => {
  const previousSelection = createSelectedImageAttachmentFromPickedFile({
    uri: "content://case-picker/previous.jpg",
    type: "image/jpeg",
    size: 4096,
  });
  const oversizedSelection = createSelectedImageAttachmentFromPickedFile({
    uri: "content://case-picker/oversized.png",
    type: "image/png",
    size: CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
  });

  assert.equal(previousSelection.accepted, true);
  assert.equal(oversizedSelection.accepted, false);
  assert.equal(oversizedSelection.attachment, null);
  assert.equal(oversizedSelection.rejectionReason, "too_large");

  const composerState = {
    text: "What is visible in this image?",
    selectedImageAttachment: previousSelection.attachment,
    attachmentError: null,
  };
  let rejectionState;

  assert.doesNotThrow(() => {
    rejectionState =
      getRejectedImageAttachmentSelectionStateUpdate(oversizedSelection);
  });

  const nextComposerState = {
    ...composerState,
    ...rejectionState,
  };

  assert.equal(nextComposerState.text, composerState.text);
  assert.equal(nextComposerState.selectedImageAttachment, null);
  assert.equal(
    nextComposerState.attachmentError,
    CHAT_IMAGE_ATTACHMENT_TOO_LARGE_MESSAGE,
  );
});

test("oversized picker selection shows an error while keeping the chat UI stable", () => {
  const previousSelection = createSelectedImageAttachmentFromPickedFile({
    uri: "content://case-picker/visible-object.jpg",
    type: "image/jpeg",
    size: 8192,
  });
  const oversizedSelection = createSelectedImageAttachmentFromPickedFile({
    uri: "content://case-picker/oversized-receipt.png",
    type: "image/png",
    size: CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
  });
  const submittedRequests = [];

  assert.equal(previousSelection.accepted, true);
  assert.equal(oversizedSelection.accepted, false);

  const composerState = {
    text: "Describe what changed in this image.",
    selectedImageAttachment: previousSelection.attachment,
    attachmentError: null,
    isPreparingAttachment: false,
    disabled: false,
  };
  const rejectionState =
    getRejectedImageAttachmentSelectionStateUpdate(oversizedSelection);
  const nextComposerState = {
    ...composerState,
    ...rejectionState,
  };
  const chatUiState = {
    statusRowVisible:
      Boolean(nextComposerState.selectedImageAttachment) ||
      Boolean(nextComposerState.attachmentError),
    attachmentChipVisible: Boolean(nextComposerState.selectedImageAttachment),
    errorText: nextComposerState.attachmentError,
    inputText: nextComposerState.text,
    canSend:
      nextComposerState.text.trim().length > 0 &&
      !nextComposerState.disabled &&
      !nextComposerState.isPreparingAttachment &&
      !nextComposerState.attachmentError,
  };

  if (oversizedSelection.accepted) {
    submittedRequests.push({
      content: nextComposerState.text,
      attachments: [oversizedSelection.attachment],
    });
  }

  assert.deepEqual(chatUiState, {
    statusRowVisible: true,
    attachmentChipVisible: false,
    errorText: CHAT_IMAGE_ATTACHMENT_TOO_LARGE_MESSAGE,
    inputText: composerState.text,
    canSend: false,
  });
  assert.equal(submittedRequests.length, 0);

  const chatInputSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "ChatInput.tsx"),
    "utf8",
  );
  assert.match(
    chatInputSource,
    /\{\(selectedImageAttachment \|\| attachmentError\) && \(/,
  );
  assert.match(chatInputSource, /\{attachmentError\}/);
  assert.match(chatInputSource, /accessibilityRole="alert"/);
});

test("selected image/png attachments over 5MB are rejected before attachment", () => {
  const mimeType = inferSelectedImageAttachmentMimeType(
    "content://picked/oversized.png",
    "image/png",
  );
  const validation = validateSelectedImageAttachmentSize(
    CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
  );

  assert.equal(mimeType, "image/png");
  assert.equal(validation.accepted, false);
  assert.equal(validation.rejectionReason, "too_large");
});

test("oversized JPEG and PNG picker selections are rejected before chat submit", () => {
  const oversizedSelections = [
    {
      label: "JPEG",
      pickedFile: {
        uri: "content://case-picker/oversized.jpg",
        type: "image/jpeg",
        size: CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
      },
    },
    {
      label: "PNG",
      pickedFile: {
        uri: "content://case-picker/oversized.png",
        type: "image/png",
        size: CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
      },
    },
  ];

  for (const { label, pickedFile } of oversizedSelections) {
    const submittedRequests = [];
    const selection = createSelectedImageAttachmentFromPickedFile(pickedFile);

    if (selection.accepted) {
      submittedRequests.push({
        content: `Describe this oversized ${label} image`,
        attachments: [selection.attachment],
      });
    }

    assert.equal(selection.accepted, false, label);
    assert.equal(selection.attachment, null, label);
    assert.equal(selection.rejectionReason, "too_large", label);
    assert.equal(submittedRequests.length, 0, label);
  }
});

test("image attachment size validation rejects unknown or unreadable sizes", () => {
  assert.equal(
    validateSelectedImageAttachmentSize(null).rejectionReason,
    "missing_or_unreadable_size",
  );
  assert.equal(
    validateSelectedImageAttachmentSize(0).rejectionReason,
    "missing_or_unreadable_size",
  );
  assert.equal(
    validateSelectedImageAttachmentSize(Number.NaN).rejectionReason,
    "missing_or_unreadable_size",
  );
  assert.equal(normalizePickedFileSizeBytes(Number.NaN), null);
  assert.equal(normalizePickedFileSizeBytes("512"), null);
});

test("image attachment decode validation rejects corrupt or non-decodable images", async () => {
  assert.deepEqual(validateDecodedImageAttachmentDimensions({
    width: 640,
    height: 480,
  }), {
    accepted: true,
    rejectionReason: null,
  });
  assert.deepEqual(validateDecodedImageAttachmentDimensions({
    width: 0,
    height: 480,
  }), {
    accepted: false,
    rejectionReason: "decode_failed",
  });

  const corruptJpeg = await validateSelectedImageAttachmentDecodable(
    "content://case-picker/corrupt.jpg",
    async () => {
      throw new Error("Image decode failed");
    },
  );
  assert.equal(corruptJpeg.accepted, false);
  assert.equal(corruptJpeg.rejectionReason, "decode_failed");
  assert.equal(
    CHAT_IMAGE_ATTACHMENT_NON_DECODABLE_MESSAGE,
    "이미지를 열 수 없습니다. 손상되지 않은 JPEG 또는 PNG 파일을 선택해 주세요.",
  );
});

test("corrupt JPEG and PNG picker selections are rejected before chat submit", async () => {
  const corruptSelections = [
    {
      label: "JPEG",
      pickedFile: {
        uri: "content://case-picker/corrupt.jpg",
        type: "image/jpeg",
        size: 1024,
      },
    },
    {
      label: "PNG",
      pickedFile: {
        uri: "content://case-picker/corrupt.png",
        type: "image/png",
        size: 2048,
      },
    },
  ];

  for (const { label, pickedFile } of corruptSelections) {
    const submittedRequests = [];
    const selection = createSelectedImageAttachmentFromPickedFile(pickedFile);

    assert.equal(selection.accepted, true, label);

    const decodeValidation = await validateSelectedImageAttachmentDecodable(
      selection.attachment.uri,
      async () => {
        throw new Error(`${label} decode failed`);
      },
    );

    if (decodeValidation.accepted) {
      submittedRequests.push({
        content: `Describe this corrupt ${label} image`,
        attachments: [selection.attachment],
      });
    }

    assert.equal(decodeValidation.accepted, false, label);
    assert.equal(decodeValidation.rejectionReason, "decode_failed", label);
    assert.equal(submittedRequests.length, 0, label);
  }
});

test("ChatInput enforces image MIME and size validation before retaining or sending an attachment", () => {
  const chatInputSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "ChatInput.tsx"),
    "utf8",
  );
  const validationSource = readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "imageAttachmentValidation.ts",
    ),
    "utf8",
  );

  assert.match(chatInputSource, /CHAT_IMAGE_ATTACHMENT_PICKER_MIME_TYPE/);
  assert.match(chatInputSource, /createSelectedImageAttachmentFromPickedFile/);
  assert.match(validationSource, /inferSelectedImageAttachmentMimeType/);
  assert.match(
    validationSource,
    /validateSelectedImageAttachmentSize\(sizeBytes\)/,
  );
  assert.match(validationSource, /validateSelectedImageAttachmentDecodable/);
  assert.match(chatInputSource, /Image\.getSize\(/);
  assert.match(chatInputSource, /decodeSelectedImageAttachment/);
  assert.match(
    chatInputSource,
    /setAttachmentError\(CHAT_IMAGE_ATTACHMENT_NON_DECODABLE_MESSAGE\)/,
  );
  assert.match(chatInputSource, /setSelectedImageAttachment\(null\)/);
  assert.match(chatInputSource, /isPreparingAttachment \|\| attachmentError/);
  assert.match(chatInputSource, /!attachmentError/);
  assert.match(chatInputSource, /selectedImageAttachmentCanSend/);

  const pickerValidationIndex = chatInputSource.indexOf(
    "const selection = createSelectedImageAttachmentFromPickedFile(pickedFile);",
  );
  const pickerRejectionIndex = chatInputSource.indexOf(
    "if (!selection.accepted",
    pickerValidationIndex,
  );
  const retainAttachmentIndex = chatInputSource.indexOf(
    "setSelectedImageAttachment(selection.attachment)",
  );
  const decodeValidationIndex = chatInputSource.indexOf(
    "const decodeValidation = await validateSelectedImageAttachmentDecodable",
    pickerValidationIndex,
  );

  assert.notEqual(pickerValidationIndex, -1);
  assert.notEqual(pickerRejectionIndex, -1);
  assert.notEqual(decodeValidationIndex, -1);
  assert.notEqual(retainAttachmentIndex, -1);
  assert.ok(pickerValidationIndex < pickerRejectionIndex);
  assert.ok(pickerRejectionIndex < decodeValidationIndex);
  assert.ok(decodeValidationIndex < retainAttachmentIndex);
});

test("ChatInput rejected image errors are user-facing and leave attachment state recoverable", () => {
  const chatInputSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "ChatInput.tsx"),
    "utf8",
  );

  assert.match(chatInputSource, /accessibilityRole="alert"/);
  assert.match(chatInputSource, /accessibilityLiveRegion="polite"/);
  assert.match(chatInputSource, /accessibilityLabel="첨부 오류 지우기"/);
  assert.match(
    chatInputSource,
    /if \(!messageText \|\| disabled \|\| isPreparingAttachment \|\| attachmentError\) \{\s*return;\s*\}/,
  );
  assert.match(
    chatInputSource,
    /const canSend =[\s\S]*!attachmentError[\s\S]*selectedImageAttachmentCanSend;/,
  );
  assert.match(
    chatInputSource,
    /catch \{\s*setSelectedImageAttachment\(null\);\s*setAttachmentError\("첨부 이미지를 읽을 수 없습니다\."\);\s*return;\s*\} finally \{\s*setIsPreparingAttachment\(false\);/,
  );
  assert.match(
    chatInputSource,
    /if \(Platform\.OS !== "android"\) \{\s*setSelectedImageAttachment\(null\);\s*setAttachmentError\("JPEG\/PNG 첨부는 Android 파일 선택기에서 지원됩니다\."\);/,
  );
  assert.match(
    chatInputSource,
    /const rejectionState =\s*getRejectedImageAttachmentSelectionStateUpdate\(selection\);/,
  );
  assert.match(
    chatInputSource,
    /setSelectedImageAttachment\(rejectionState\.selectedImageAttachment\);\s*setAttachmentError\(rejectionState\.attachmentError\);/,
  );
  const pickerRejectionStart = chatInputSource.indexOf(
    "if (!selection.accepted)",
  );
  const pickerRejectionEnd = chatInputSource.indexOf(
    "const decodeValidation",
    pickerRejectionStart,
  );
  const pickerRejectionSource = chatInputSource.slice(
    pickerRejectionStart,
    pickerRejectionEnd,
  );
  assert.doesNotMatch(pickerRejectionSource, /setText\(/);
  assert.match(
    chatInputSource,
    /setSelectedImageAttachment\(null\);\s*setAttachmentError\(CHAT_IMAGE_ATTACHMENT_NON_DECODABLE_MESSAGE\);/,
  );
  assert.match(
    chatInputSource,
    /if \(message\.toLowerCase\(\)\.includes\("cancelled"\)\) return;\s*setSelectedImageAttachment\(null\);\s*setAttachmentError\("JPEG 또는 PNG 이미지를 선택할 수 없습니다\."\);/,
  );
  assert.match(
    chatInputSource,
    /finally \{\s*setIsPickingAttachment\(false\);\s*\}/,
  );
});

test("ChatInput sends a validated image as a request attachment with content type and file payload", () => {
  const chatInputSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "ChatInput.tsx"),
    "utf8",
  );
  const useChatSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../../hooks/useChat.ts"),
    "utf8",
  );
  const chatTypesSource = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), "../../types/chat.ts"),
    "utf8",
  );

  assert.match(
    chatInputSource,
    /new File\(selectedImageAttachment\.uri\)\.base64\(\)/,
  );
  assert.match(
    chatInputSource,
    /contentType: preparedImagePayload\.mimeType/,
  );
  assert.match(chatInputSource, /mimeType: preparedImagePayload\.mimeType/);
  assert.match(chatInputSource, /dataBase64: preparedImagePayload\.dataBase64/);
  assert.match(chatInputSource, /file: preparedImagePayload\.dataBase64/);
  assert.match(chatInputSource, /encoding: "base64"/);
  assert.match(chatInputSource, /imageSource: selectedImageAttachment\.uri/);
  assert.match(chatInputSource, /sizeBytes: preparedImagePayload\.sizeBytes/);
  assert.match(
    chatInputSource,
    /onSend\(\s*messageText,\s*attachments \? \{ attachments \} : undefined,\s*\)/,
  );
  assert.match(useChatSource, /attachments: options\.attachments/);
  assert.match(chatTypesSource, /attachments\?: ChatImageAttachmentRequest\[\]/);
  assert.match(chatTypesSource, /mimeType: ChatImageAttachmentMimeType/);
  assert.match(chatTypesSource, /contentType: ChatImageAttachmentContentType/);
  assert.match(chatTypesSource, /dataBase64: string/);
  assert.match(chatTypesSource, /file: string/);
  assert.match(chatTypesSource, /imageSource: string/);
  assert.match(chatTypesSource, /source: 'file-picker'/);
});
