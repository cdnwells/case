import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createNetworkSafeJsonBody } from "../../constants/audioBuffer.ts";

test("outgoing chat payload includes accepted image/jpeg attachment metadata and data", () => {
  const request = {
    content: "What is visible in this image?",
    conversationId: "image-jpeg-payload-test",
    attachments: [
      {
        type: "image",
        mimeType: "image/jpeg",
        contentType: "image/jpeg",
        dataBase64: "/9j/2Q==",
        file: "/9j/2Q==",
        encoding: "base64",
        imageSource: "content://picked/visible-object.jpg",
        name: "visible-object.jpg",
        sizeBytes: 4,
        source: "file-picker",
      },
    ],
  };

  assert.deepEqual(JSON.parse(createNetworkSafeJsonBody(request)), request);

  const chatServiceSource = readFileSync(
    new URL("./chatService.ts", import.meta.url),
    "utf8",
  );
  const chatPayloadSource = readFileSync(
    new URL("./chatPayload.ts", import.meta.url),
    "utf8",
  );

  assert.match(chatServiceSource, /createChatMessagePayload\(request\)/);
  assert.match(chatPayloadSource, /createNetworkSafeJsonBody\(request\)/);
});

test("outgoing chat payload preserves Google Drive file attachments", () => {
  const request = {
    content: "Summarize this Drive file.",
    attachments: [
      {
        type: "drive-file",
        driveFileId: "drive-file-123",
        name: "notes.txt",
        mimeType: "text/plain",
        sizeBytes: 128,
        source: "google-drive",
      },
    ],
  };

  assert.deepEqual(JSON.parse(createNetworkSafeJsonBody(request)), request);
});
