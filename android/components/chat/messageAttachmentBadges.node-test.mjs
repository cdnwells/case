import assert from "node:assert/strict";
import test from "node:test";
import { createMessageAttachmentBadges } from "./messageAttachmentBadges.ts";

test("message attachment badges preserve image attachment filenames only", () => {
  const badges = createMessageAttachmentBadges([
    {
      type: "image",
      mimeType: "image/jpeg",
      contentType: "image/jpeg",
      dataBase64: "ZmFrZQ==",
      file: "ZmFrZQ==",
      encoding: "base64",
      imageSource: "content://case-picker/visible-object.jpg",
      name: "visible-object.jpg",
      sizeBytes: 4,
      source: "file-picker",
    },
  ]);

  assert.deepEqual(badges, [
    {
      id: "image-0-visible-object.jpg",
      type: "image",
      name: "visible-object.jpg",
      mimeType: "image/jpeg",
    },
  ]);
  assert.equal(Object.hasOwn(badges[0], "dataBase64"), false);
  assert.equal(Object.hasOwn(badges[0], "file"), false);
  assert.equal(Object.hasOwn(badges[0], "imageSource"), false);
});

test("message attachment badges preserve Google Drive filenames", () => {
  const badges = createMessageAttachmentBadges([
    {
      type: "drive-file",
      driveFileId: "drive-file-1",
      name: "Project brief.pdf",
      mimeType: "application/pdf",
      sizeBytes: 12345,
      source: "google-drive",
    },
  ]);

  assert.deepEqual(badges, [
    {
      id: "drive-file-0-Project brief.pdf",
      type: "drive-file",
      name: "Project brief.pdf",
      mimeType: "application/pdf",
    },
  ]);
});

test("message attachment badges return no badges without attachments", () => {
  assert.deepEqual(createMessageAttachmentBadges(undefined), []);
  assert.deepEqual(createMessageAttachmentBadges([]), []);
});
