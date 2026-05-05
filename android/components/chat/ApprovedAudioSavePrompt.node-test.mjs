import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function expectIncludes(source, expected, message) {
  if (!source.includes(expected)) {
    throw new Error(`${message}: expected source to include ${expected}`);
  }
}

function expectBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  if (firstIndex === -1 || secondIndex === -1 || firstIndex >= secondIndex) {
    throw new Error(`${message}: expected ${first} before ${second}`);
  }
}

const approvedAudioSavePromptSource = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "ApprovedAudioSavePrompt.tsx",
  ),
  "utf8",
);
const saveButtonSource = approvedAudioSavePromptSource.slice(
  approvedAudioSavePromptSource.indexOf("<TouchableOpacity"),
  approvedAudioSavePromptSource.lastIndexOf("</TouchableOpacity>"),
);

expectIncludes(
  approvedAudioSavePromptSource,
  "laterUsePurpose: string;",
  "approved audio save prompt receives the user-visible later-use purpose",
);
expectIncludes(
  approvedAudioSavePromptSource,
  "matchedApprovedVoiceProfileId: string;",
  "approved audio save prompt receives the matched approved voice profile id",
);
expectIncludes(
  approvedAudioSavePromptSource,
  "matchedApprovedVoiceLabel: string;",
  "approved audio save prompt receives the matched approved voice profile label",
);
expectIncludes(
  approvedAudioSavePromptSource,
  "const matchedVoiceProfile =",
  "approved audio save prompt derives a visible matched voice profile label",
);
expectIncludes(
  approvedAudioSavePromptSource,
  "{matchedVoiceProfile} -",
  "approved audio save prompt surfaces the matched voice profile before the storage notice",
);
expectIncludes(
  approvedAudioSavePromptSource,
  "const normalizedLaterUsePurpose = laterUsePurpose.trim();",
  "approved audio save prompt normalizes the visible later-use purpose",
);
expectIncludes(
  approvedAudioSavePromptSource,
  "normalizedLaterUsePurpose.length > 0 && !disabled && !isSaving",
  "approved audio save prompt requires a non-empty purpose before save is enabled",
);
expectIncludes(
  approvedAudioSavePromptSource,
  "APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_PURPOSE_FIELD_LABEL",
  "approved audio save prompt presents the later-use purpose field label",
);
expectIncludes(
  approvedAudioSavePromptSource,
  "value={laterUsePurpose}",
  "approved audio save prompt displays the current later-use purpose before persistence",
);
expectIncludes(
  approvedAudioSavePromptSource,
  "onChangeText={onLaterUsePurposeChange}",
  "approved audio save prompt lets the user edit the later-use purpose",
);
expectIncludes(
  saveButtonSource,
  "disabled={!canSave}",
  "approved audio save prompt disables persistence until the purpose is valid",
);
expectIncludes(
  saveButtonSource,
  "onPress={onSave}",
  "approved audio save prompt wires the explicit save action",
);
expectIncludes(
  saveButtonSource,
  "`Save captured audio for later use: ${normalizedLaterUsePurpose}`",
  "approved audio save prompt presents the exact later-use purpose on the save control",
);
expectBefore(
  approvedAudioSavePromptSource,
  "value={laterUsePurpose}",
  "onPress={onSave}",
  "approved audio save prompt renders the later-use purpose before persistence can be invoked",
);
