import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const chatDirectory = dirname(fileURLToPath(import.meta.url));

function readSource(relativePath) {
  return readFileSync(resolve(chatDirectory, relativePath), "utf8");
}

test("Android chat UI surfaces unsupported provider/model errors from the hub", () => {
  const chatServiceSource = readSource("../../services/api/chatService.ts");
  const useChatSource = readSource("../../hooks/useChat.ts");
  const chatScreenSource = readSource("ChatScreen.tsx");
  const messageBubbleSource = readSource("MessageBubble.tsx");

  assert.match(chatServiceSource, /response\.text\(\)\.catch\(\(\) => ""\)/);
  assert.match(chatServiceSource, /throw createChatApiError\(\{/);
  assert.match(useChatSource, /catch \(error\)/);
  assert.match(
    useChatSource,
    /const errorMessage = getSendMessageErrorMessage\(error\);/,
  );
  assert.match(useChatSource, /error: errorMessage/);
  assert.doesNotMatch(useChatSource, /error: "Failed to send message"/);
  assert.match(chatScreenSource, /const \{ messages, isLoading, error,/);
  assert.match(chatScreenSource, /accessibilityRole="alert"/);
  assert.match(chatScreenSource, /\{error\}/);
  assert.match(
    messageBubbleSource,
    /\{message\.errorMessage \|\| 'Failed to send'\}/,
  );
});
