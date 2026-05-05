import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createNetworkSafeJsonBody } from "../../constants/audioBuffer.ts";
import {
  CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES,
  CHAT_IMAGE_ATTACHMENT_NON_DECODABLE_MESSAGE,
  CHAT_IMAGE_ATTACHMENT_PICKER_MIME_TYPE,
  CHAT_IMAGE_ATTACHMENT_TOO_LARGE_MESSAGE,
  createSelectedImageAttachmentFromPickedFile,
  getRejectedImageAttachmentSelectionStateUpdate,
  normalizePreparedImageAttachmentPayload,
  validateSelectedImageAttachmentDecodable,
} from "./imageAttachmentValidation.ts";

const chatDirectory = dirname(fileURLToPath(import.meta.url));

function readAndroidSource(relativePath) {
  return readFileSync(resolve(chatDirectory, relativePath), "utf8");
}

function createChatImageAttachmentRequest(selectedImageAttachment, imageBytes) {
  const preparedPayload = normalizePreparedImageAttachmentPayload(
    imageBytes.toString("base64"),
  );

  assert.equal(preparedPayload.accepted, true);

  return {
    type: "image",
    mimeType: preparedPayload.mimeType,
    contentType: preparedPayload.mimeType,
    dataBase64: preparedPayload.dataBase64,
    file: preparedPayload.dataBase64,
    encoding: "base64",
    imageSource: selectedImageAttachment.uri,
    name: selectedImageAttachment.name,
    sizeBytes: preparedPayload.sizeBytes,
    source: selectedImageAttachment.source,
  };
}

async function submitPickedJpegThroughChatFlow({
  pickedFile,
  imageBytes,
  message,
  onSend,
}) {
  const selection = createSelectedImageAttachmentFromPickedFile(pickedFile);

  assert.equal(selection.accepted, true);
  assert.equal(selection.rejectionReason, null);

  const attachment = createChatImageAttachmentRequest(
    selection.attachment,
    imageBytes,
  );

  await onSend(message, { attachments: [attachment] });

  return {
    selection,
    attachment,
  };
}

function rejectPickedImageThroughChatInputFlow({ pickedFile, composerState }) {
  const selection = createSelectedImageAttachmentFromPickedFile(pickedFile);

  assert.equal(selection.accepted, false);
  assert.equal(selection.attachment, null);

  const rejectionState =
    getRejectedImageAttachmentSelectionStateUpdate(selection);
  const nextComposerState = {
    ...composerState,
    ...rejectionState,
  };

  return {
    selection,
    nextComposerState,
    userFacingError: nextComposerState.attachmentError,
    statusRowVisible:
      Boolean(nextComposerState.selectedImageAttachment) ||
      Boolean(nextComposerState.attachmentError),
    attachmentChipVisible: Boolean(nextComposerState.selectedImageAttachment),
    canSend:
      nextComposerState.text.trim().length > 0 &&
      !nextComposerState.disabled &&
      !nextComposerState.isPreparingAttachment &&
      !nextComposerState.attachmentError,
  };
}

async function rejectNonDecodablePickedImageThroughChatInputFlow({
  pickedFile,
  composerState,
  decodeImageAttachment,
  dispatchHubRequest,
}) {
  const selection = createSelectedImageAttachmentFromPickedFile(pickedFile);

  assert.equal(selection.accepted, true);
  assert.equal(selection.rejectionReason, null);
  assert.equal(selection.attachment.source, "file-picker");

  const decodeValidation = await validateSelectedImageAttachmentDecodable(
    selection.attachment.uri,
    decodeImageAttachment,
  );

  const nextComposerState = {
    ...composerState,
    selectedImageAttachment: null,
    attachmentError: decodeValidation.accepted
      ? null
      : CHAT_IMAGE_ATTACHMENT_NON_DECODABLE_MESSAGE,
  };

  if (decodeValidation.accepted) {
    await dispatchHubRequest({
      content: composerState.text,
      attachments: [selection.attachment],
    });
  }

  return {
    selection,
    decodeValidation,
    nextComposerState,
    userFacingError: nextComposerState.attachmentError,
    statusRowVisible:
      Boolean(nextComposerState.selectedImageAttachment) ||
      Boolean(nextComposerState.attachmentError),
    attachmentChipVisible: Boolean(nextComposerState.selectedImageAttachment),
    canSend:
      nextComposerState.text.trim().length > 0 &&
      !nextComposerState.disabled &&
      !nextComposerState.isPreparingAttachment &&
      !nextComposerState.attachmentError,
  };
}

test("end-to-end JPEG file-picker flow submits an image attachment to AI chat", async () => {
  const fixtureBytes = readFileSync(
    resolve(chatDirectory, "../../../hub/test-fixtures/visible-object.jpg"),
  );
  assert.ok(fixtureBytes.length > 0);
  assert.ok(fixtureBytes.length <= CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES);
  assert.equal(fixtureBytes[0], 0xff);
  assert.equal(fixtureBytes[1], 0xd8);
  assert.equal(fixtureBytes[2], 0xff);

  const pickedFile = {
    uri: "content://case-picker/visible-object.jpg",
    type: "image/jpeg",
    size: fixtureBytes.length,
  };
  const sentMessages = [];
  const message = "Describe the visible object in this image.";

  const flow = await submitPickedJpegThroughChatFlow({
    pickedFile,
    imageBytes: fixtureBytes,
    message,
    onSend: async (sentMessage, options) => {
      sentMessages.push({ sentMessage, options });
    },
  });

  assert.deepEqual(flow.selection.attachment, {
    uri: pickedFile.uri,
    name: "visible-object.jpg",
    mimeType: "image/jpeg",
    sizeBytes: fixtureBytes.length,
    source: "file-picker",
  });

  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0].sentMessage, message);
  assert.equal(sentMessages[0].options.attachments.length, 1);
  assert.deepEqual(sentMessages[0].options.attachments[0], flow.attachment);

  const submittedRequest = {
    content: sentMessages[0].sentMessage,
    conversationId: "android-file-picker-jpeg-e2e-test",
    attachments: sentMessages[0].options.attachments,
  };
  const serializedRequest = createNetworkSafeJsonBody(submittedRequest);

  assert.deepEqual(JSON.parse(serializedRequest), submittedRequest);
  assert.equal(flow.attachment.type, "image");
  assert.equal(flow.attachment.mimeType, "image/jpeg");
  assert.equal(flow.attachment.contentType, "image/jpeg");
  assert.equal(flow.attachment.encoding, "base64");
  assert.equal(flow.attachment.imageSource, pickedFile.uri);
  assert.equal(flow.attachment.sizeBytes, fixtureBytes.length);
  assert.deepEqual(Buffer.from(flow.attachment.dataBase64, "base64"), fixtureBytes);
  assert.deepEqual(Buffer.from(flow.attachment.file, "base64"), fixtureBytes);
});

test("file-picker flow sends actual PNG bytes as PNG when Android metadata says JPEG", async () => {
  const fixtureBytes = readFileSync(
    resolve(chatDirectory, "../../../hub/test-fixtures/store-receipt.png"),
  );
  assert.equal(fixtureBytes[0], 0x89);
  assert.equal(fixtureBytes[1], 0x50);
  assert.equal(fixtureBytes[2], 0x4e);
  assert.equal(fixtureBytes[3], 0x47);

  const pickedFile = {
    uri: "content://case-picker/misreported-photo.jpg",
    type: "image/jpeg",
    size: fixtureBytes.length,
  };
  const sentMessages = [];
  const message = "What is in this image?";

  const flow = await submitPickedJpegThroughChatFlow({
    pickedFile,
    imageBytes: fixtureBytes,
    message,
    onSend: async (sentMessage, options) => {
      sentMessages.push({ sentMessage, options });
    },
  });

  assert.equal(flow.selection.attachment.mimeType, "image/jpeg");
  assert.equal(flow.attachment.mimeType, "image/png");
  assert.equal(flow.attachment.contentType, "image/png");
  assert.equal(flow.attachment.sizeBytes, fixtureBytes.length);
  assert.deepEqual(Buffer.from(flow.attachment.dataBase64, "base64"), fixtureBytes);
  assert.equal(sentMessages[0].options.attachments[0].mimeType, "image/png");
});

test("oversized JPEG and PNG file-picker flow shows a clear error without sending chat", () => {
  const oversizedPickerFiles = [
    {
      label: "JPEG",
      pickedFile: {
        uri: "content://case-picker/oversized-object.jpg",
        type: "image/jpeg",
        size: CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
      },
    },
    {
      label: "PNG",
      pickedFile: {
        uri: "content://case-picker/oversized-receipt.png",
        type: "image/png",
        size: CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
      },
    },
  ];

  for (const { label, pickedFile } of oversizedPickerFiles) {
    const sentMessages = [];
    const composerState = {
      text: `Describe this oversized ${label} image.`,
      selectedImageAttachment: {
        uri: "content://case-picker/previous.jpg",
        name: "previous.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 4096,
        source: "file-picker",
      },
      attachmentError: null,
      disabled: false,
      isPreparingAttachment: false,
    };

    const flow = rejectPickedImageThroughChatInputFlow({
      pickedFile,
      composerState,
    });

    if (flow.selection.accepted) {
      sentMessages.push({
        content: composerState.text,
        attachments: [flow.selection.attachment],
      });
    }

    assert.equal(flow.selection.rejectionReason, "too_large", label);
    assert.equal(flow.nextComposerState.text, composerState.text, label);
    assert.equal(flow.nextComposerState.selectedImageAttachment, null, label);
    assert.equal(
      flow.userFacingError,
      CHAT_IMAGE_ATTACHMENT_TOO_LARGE_MESSAGE,
      label,
    );
    assert.match(flow.userFacingError, /5MB/, label);
    assert.match(flow.userFacingError, /JPEG\/PNG/, label);
    assert.equal(flow.statusRowVisible, true, label);
    assert.equal(flow.attachmentChipVisible, false, label);
    assert.equal(flow.canSend, false, label);
    assert.equal(sentMessages.length, 0, label);
  }

  const chatInputSource = readAndroidSource("ChatInput.tsx");
  assert.match(
    chatInputSource,
    /const rejectionState =\s*getRejectedImageAttachmentSelectionStateUpdate\(selection\);/,
  );
  assert.match(
    chatInputSource,
    /setAttachmentError\(rejectionState\.attachmentError\);/,
  );
  assert.match(chatInputSource, /accessibilityRole="alert"/);
  assert.match(chatInputSource, /\{attachmentError\}/);
});

test("invalid or corrupt JPEG and PNG file-picker flow shows an error without dispatching hub chat", async () => {
  const nonDecodablePickerFiles = [
    {
      label: "invalid JPEG dimensions",
      pickedFile: {
        uri: "content://case-picker/invalid-dimensions.jpg",
        type: "image/jpeg",
        size: 1024,
      },
      decodeImageAttachment: async () => ({ width: 0, height: 480 }),
    },
    {
      label: "corrupt JPEG bytes",
      pickedFile: {
        uri: "content://case-picker/corrupt.jpg",
        type: "image/jpeg",
        size: 2048,
      },
      decodeImageAttachment: async () => {
        throw new Error("JPEG decode failed");
      },
    },
    {
      label: "invalid PNG dimensions",
      pickedFile: {
        uri: "content://case-picker/invalid-dimensions.png",
        type: "image/png",
        size: 3072,
      },
      decodeImageAttachment: async () => ({ width: 640, height: 0 }),
    },
    {
      label: "corrupt PNG bytes",
      pickedFile: {
        uri: "content://case-picker/corrupt.png",
        type: "image/png",
        size: 4096,
      },
      decodeImageAttachment: async () => {
        throw new Error("PNG decode failed");
      },
    },
  ];

  for (const {
    label,
    pickedFile,
    decodeImageAttachment,
  } of nonDecodablePickerFiles) {
    const hubRequests = [];
    const composerState = {
      text: `Describe this ${label} attachment.`,
      selectedImageAttachment: null,
      attachmentError: null,
      disabled: false,
      isPreparingAttachment: false,
    };

    const flowPromise = rejectNonDecodablePickedImageThroughChatInputFlow({
      pickedFile,
      composerState,
      decodeImageAttachment,
      dispatchHubRequest: async (request) => {
        hubRequests.push(request);
      },
    });

    await assert.doesNotReject(flowPromise, label);
    const flow = await flowPromise;

    assert.equal(flow.decodeValidation.accepted, false, label);
    assert.equal(
      flow.decodeValidation.rejectionReason,
      "decode_failed",
      label,
    );
    assert.equal(flow.nextComposerState.text, composerState.text, label);
    assert.equal(flow.nextComposerState.selectedImageAttachment, null, label);
    assert.equal(
      flow.userFacingError,
      CHAT_IMAGE_ATTACHMENT_NON_DECODABLE_MESSAGE,
      label,
    );
    assert.equal(flow.statusRowVisible, true, label);
    assert.equal(flow.attachmentChipVisible, false, label);
    assert.equal(flow.canSend, false, label);
    assert.equal(hubRequests.length, 0, label);
  }

  const chatInputSource = readAndroidSource("ChatInput.tsx");
  assert.match(
    chatInputSource,
    /const decodeValidation = await validateSelectedImageAttachmentDecodable/,
  );
  assert.match(
    chatInputSource,
    /setAttachmentError\(CHAT_IMAGE_ATTACHMENT_NON_DECODABLE_MESSAGE\);/,
  );
  const decodeRejectionStart = chatInputSource.indexOf(
    "if (!decodeValidation.accepted)",
  );
  const decodeRejectionEnd = chatInputSource.indexOf(
    "setSelectedImageAttachment(selection.attachment)",
    decodeRejectionStart,
  );
  assert.notEqual(decodeRejectionStart, -1);
  assert.notEqual(decodeRejectionEnd, -1);
  const decodeRejectionSource = chatInputSource.slice(
    decodeRejectionStart,
    decodeRejectionEnd,
  );
  assert.doesNotMatch(decodeRejectionSource, /onSend\(/);
  assert.doesNotMatch(decodeRejectionSource, /new File\(/);
  assert.match(
    chatInputSource,
    /if \(!messageText \|\| disabled \|\| isPreparingAttachment \|\| attachmentError\) \{\s*return;\s*\}/,
  );
});

test("JPEG picker chat flow remains wired through the existing Android file picker and /chat service", () => {
  const chatInputSource = readAndroidSource("ChatInput.tsx");
  const chatScreenSource = readAndroidSource("ChatScreen.tsx");
  const useChatSource = readAndroidSource("../../hooks/useChat.ts");
  const chatServiceSource = readAndroidSource(
    "../../services/api/chatService.ts",
  );

  assert.equal(CHAT_IMAGE_ATTACHMENT_PICKER_MIME_TYPE, "image/*");
  assert.match(
    chatInputSource,
    /File\.pickFileAsync\(\s*undefined,\s*CHAT_IMAGE_ATTACHMENT_PICKER_MIME_TYPE,\s*\)/,
  );
  assert.match(
    chatInputSource,
    /createSelectedImageAttachmentFromPickedFile\(pickedFile\)/,
  );
  assert.match(
    chatInputSource,
    /new File\(selectedImageAttachment\.uri\)\.base64\(\)/,
  );
  assert.match(
    chatInputSource,
    /onSend\(\s*messageText,\s*attachments \? \{ attachments \} : undefined,\s*\)/,
  );
  assert.match(chatScreenSource, /<ChatInput[\s\S]*onSend=\{sendMessage\}/);
  assert.match(
    useChatSource,
    /chatService\.sendMessage\(\{\s*content: userMessage\.content,[\s\S]*attachments: options\.attachments/,
  );
  assert.match(
    chatServiceSource,
    /fetch\(`\$\{this\.baseUrl\}\/chat`,/,
  );
  assert.match(
    chatServiceSource,
    /body: createChatMessagePayload\(request\)/,
  );
});
