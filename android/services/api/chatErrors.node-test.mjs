import assert from "node:assert/strict";
import test from "node:test";
import {
  ChatApiError,
  createChatApiError,
  getSendMessageErrorMessage,
  IMAGE_UNDERSTANDING_UNSUPPORTED_PROVIDER_MODEL_MESSAGE,
  parseChatApiErrorBody,
} from "./chatErrors.ts";

test("hub unsupported provider/model errors keep their actionable message", () => {
  const hubBody = {
    error: "Provider Error",
    message: `${IMAGE_UNDERSTANDING_UNSUPPORTED_PROVIDER_MODEL_MESSAGE}; selected provider "codex" does not support image input in Case v1`,
    provider: "codex",
  };
  const parsedBody = parseChatApiErrorBody(JSON.stringify(hubBody));
  const error = createChatApiError({
    body: parsedBody,
    status: 502,
    statusText: "Bad Gateway",
  });

  assert.equal(error instanceof ChatApiError, true);
  assert.equal(error.status, 502);
  assert.equal(error.provider, "codex");
  assert.equal(error.message, hubBody.message);
  assert.equal(getSendMessageErrorMessage(error), hubBody.message);
});
