import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES,
  CHAT_IMAGE_ATTACHMENT_TOO_LARGE_MESSAGE,
  createSelectedImageAttachmentFromPickedFile,
  getImageAttachmentSizeValidationErrorMessage,
  getRejectedImageAttachmentSelectionStateUpdate,
  validateSelectedImageAttachmentSize,
} from "./imageAttachmentValidation.ts";

const chatDirectory = dirname(fileURLToPath(import.meta.url));

function readChatInputSource() {
  return readFileSync(resolve(chatDirectory, "ChatInput.tsx"), "utf8");
}

function waitForUnhandledRejectionsToFlush() {
  return new Promise((resolveFlush) => {
    setImmediate(resolveFlush);
  });
}

async function assertNoUnhandledRejectionDuring(run) {
  const unhandledRejections = [];
  const onUnhandledRejection = (reason) => {
    unhandledRejections.push(reason);
  };

  process.on("unhandledRejection", onUnhandledRejection);

  try {
    await assert.doesNotReject(run);
    await waitForUnhandledRejectionsToFlush();
  } finally {
    process.off("unhandledRejection", onUnhandledRejection);
  }

  assert.deepEqual(unhandledRejections, []);
}

async function simulateOversizedPickerSelection(pickedFile) {
  const decodeCalls = [];
  const sentMessages = [];
  const state = {
    text: "Describe the visible content in this oversized image.",
    selectedImageAttachment: {
      uri: "content://case-picker/previous.jpg",
      name: "previous.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 4096,
      source: "file-picker",
    },
    attachmentError: null,
    disabled: false,
    isPickingAttachment: false,
    isPreparingAttachment: false,
  };

  async function handlePickImageAttachment() {
    state.attachmentError = null;
    state.isPickingAttachment = true;

    try {
      const selection = createSelectedImageAttachmentFromPickedFile(
        await Promise.resolve(pickedFile),
      );

      if (!selection.accepted) {
        const rejectionState =
          getRejectedImageAttachmentSelectionStateUpdate(selection);
        state.selectedImageAttachment =
          rejectionState.selectedImageAttachment;
        state.attachmentError = rejectionState.attachmentError;
        return;
      }

      decodeCalls.push(selection.attachment.uri);
      throw new Error("oversized picker selection must not be decoded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.toLowerCase().includes("cancelled")) return;

      state.selectedImageAttachment = null;
      state.attachmentError = "JPEG 또는 PNG 이미지를 선택할 수 없습니다.";
    } finally {
      state.isPickingAttachment = false;
    }
  }

  await handlePickImageAttachment();

  const canSend =
    state.text.trim().length > 0 &&
    !state.disabled &&
    !state.isPreparingAttachment &&
    !state.attachmentError;

  if (canSend) {
    sentMessages.push({
      content: state.text,
      attachments: state.selectedImageAttachment
        ? [state.selectedImageAttachment]
        : undefined,
    });
  }

  return {
    decodeCalls,
    sentMessages,
    state,
  };
}

async function simulateSendWithStaleOversizedAttachment(selectedImageAttachment) {
  let base64ReadCalls = 0;
  const sentMessages = [];
  const state = {
    text: "Describe the visible content in this oversized image.",
    selectedImageAttachment,
    attachmentError: null,
    disabled: false,
    isPreparingAttachment: false,
  };

  async function handleSend() {
    const messageText = state.text.trim();
    if (
      !messageText ||
      state.disabled ||
      state.isPreparingAttachment ||
      state.attachmentError
    ) {
      return;
    }

    let attachments;

    if (state.selectedImageAttachment) {
      const validation = validateSelectedImageAttachmentSize(
        state.selectedImageAttachment.sizeBytes,
      );

      if (!validation.accepted) {
        state.selectedImageAttachment = null;
        state.attachmentError =
          getImageAttachmentSizeValidationErrorMessage(validation);
        return;
      }

      state.isPreparingAttachment = true;
      try {
        base64ReadCalls += 1;
        throw new Error("oversized send path must not read file payload");
      } catch {
        state.selectedImageAttachment = null;
        state.attachmentError = "첨부 이미지를 읽을 수 없습니다.";
        return;
      } finally {
        state.isPreparingAttachment = false;
      }
    }

    sentMessages.push({
      content: messageText,
      attachments,
    });
    state.text = "";
    state.selectedImageAttachment = null;
    state.attachmentError = null;
  }

  await handleSend();

  return {
    base64ReadCalls,
    sentMessages,
    state,
  };
}

test("crash regression: oversized picker selections complete without app crash or unhandled rejection", async (t) => {
  const chatInputSource = readChatInputSource();
  assert.match(
    chatInputSource,
    /const rejectionState =\s*getRejectedImageAttachmentSelectionStateUpdate\(selection\);/,
  );
  assert.match(
    chatInputSource,
    /finally \{\s*setIsPickingAttachment\(false\);\s*\}/,
  );

  const oversizedPickerFiles = [
    {
      label: "JPEG",
      pickedFile: {
        uri: "content://case-picker/crash-regression-oversized.jpg",
        type: "image/jpeg",
        size: CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
      },
    },
    {
      label: "PNG",
      pickedFile: {
        uri: "content://case-picker/crash-regression-oversized.png",
        type: "image/png",
        size: CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
      },
    },
  ];

  for (const { label, pickedFile } of oversizedPickerFiles) {
    await t.test(label, async () => {
      let flow;

      await assertNoUnhandledRejectionDuring(async () => {
        flow = await simulateOversizedPickerSelection(pickedFile);
      });

      assert.equal(flow.state.isPickingAttachment, false);
      assert.equal(flow.state.isPreparingAttachment, false);
      assert.equal(flow.state.selectedImageAttachment, null);
      assert.equal(
        flow.state.attachmentError,
        CHAT_IMAGE_ATTACHMENT_TOO_LARGE_MESSAGE,
      );
      assert.equal(flow.state.text.length > 0, true);
      assert.deepEqual(flow.decodeCalls, []);
      assert.deepEqual(flow.sentMessages, []);
    });
  }
});

test("crash regression: stale oversized attachment send path exits before file reads or unhandled rejection", async () => {
  const chatInputSource = readChatInputSource();
  const validationIndex = chatInputSource.indexOf(
    "const validation = validateSelectedImageAttachmentSize(",
  );
  const base64ReadIndex = chatInputSource.indexOf(
    "new File(selectedImageAttachment.uri).base64()",
    validationIndex,
  );

  assert.notEqual(validationIndex, -1);
  assert.notEqual(base64ReadIndex, -1);
  assert.ok(validationIndex < base64ReadIndex);

  let flow;
  await assertNoUnhandledRejectionDuring(async () => {
    flow = await simulateSendWithStaleOversizedAttachment({
      uri: "content://case-picker/stale-oversized.jpg",
      name: "stale-oversized.jpg",
      mimeType: "image/jpeg",
      sizeBytes: CHAT_IMAGE_ATTACHMENT_MAX_SIZE_BYTES + 1,
      source: "file-picker",
    });
  });

  assert.equal(flow.state.isPreparingAttachment, false);
  assert.equal(flow.state.selectedImageAttachment, null);
  assert.equal(
    flow.state.attachmentError,
    CHAT_IMAGE_ATTACHMENT_TOO_LARGE_MESSAGE,
  );
  assert.equal(flow.state.text.length > 0, true);
  assert.equal(flow.base64ReadCalls, 0);
  assert.deepEqual(flow.sentMessages, []);
});
