import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function expectIncludes(source, expected, message) {
  if (!source.includes(expected)) {
    throw new Error(`${message}: expected source to include ${expected}`);
  }
}

const savedAudioRecordListSource = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "SavedAudioRecordList.tsx",
  ),
  "utf8",
);
const chatScreenSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "ChatScreen.tsx"),
  "utf8",
);

expectIncludes(
  savedAudioRecordListSource,
  "displayRecords.map",
  "saved-audio surface renders each retained recording",
);
expectIncludes(
  savedAudioRecordListSource,
  "key={displayRecord.record.clipId}",
  "saved-audio surface keys each retained recording by clip id",
);
expectIncludes(
  savedAudioRecordListSource,
  "{displayRecord.title}",
  "saved-audio surface renders each retained recording's later-use purpose title",
);
expectIncludes(
  savedAudioRecordListSource,
  "displayRecord.metadataLines.map",
  "saved-audio surface renders identifying metadata for each recording",
);
expectIncludes(
  savedAudioRecordListSource,
  "onDeleteRecording: (clipId: string) => void;",
  "saved-audio surface requires a deletion handler",
);
expectIncludes(
  savedAudioRecordListSource,
  "onDeleteRecording(displayRecord.record.clipId);",
  "saved-audio deletion control removes the selected retained recording",
);
expectIncludes(
  savedAudioRecordListSource,
  'accessibilityRole="button"',
  "saved-audio deletion control is exposed as a button",
);
expectIncludes(
  savedAudioRecordListSource,
  "Delete saved recording",
  "saved-audio deletion control identifies the target recording",
);
expectIncludes(
  chatScreenSource,
  "deleteApprovedAudioRecord(clipId);",
  "chat screen removes retained recordings through the approved audio store",
);
expectIncludes(
  chatScreenSource,
  "onDeleteRecording={handleDeleteSavedAudioRecord}",
  "chat screen wires deletion controls into the saved-audio surface",
);
expectIncludes(
  savedAudioRecordListSource,
  "accessibilityLabel={displayRecord.accessibilityLabel}",
  "saved-audio surface exposes identifying metadata to accessibility",
);
expectIncludes(
  savedAudioRecordListSource,
  'title = "Saved audio"',
  "saved-audio surface has a user-facing title",
);
