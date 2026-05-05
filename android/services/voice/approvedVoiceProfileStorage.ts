import { Directory, File, Paths } from "expo-file-system";

import type {
  ApprovedVoiceProfilePersistenceAdapter,
  ApprovedVoiceProfilePersistenceReadAdapter,
} from "./approvedVoiceProfiles";

const APPROVED_VOICE_PROFILE_STORAGE_DIRECTORY_NAME =
  "approved-voice-profiles";
const APPROVED_VOICE_PROFILE_STORAGE_FILE_EXTENSION = ".json";

export type ApprovedVoiceProfileFileStorage =
  ApprovedVoiceProfilePersistenceAdapter &
    ApprovedVoiceProfilePersistenceReadAdapter;

function createStorageKeyFileName(storageKey: string): string {
  const safeStorageKey = storageKey
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${safeStorageKey || "default"}${APPROVED_VOICE_PROFILE_STORAGE_FILE_EXTENSION}`;
}

function createStorageFile(storageKey: string): File {
  return new File(
    Paths.document,
    APPROVED_VOICE_PROFILE_STORAGE_DIRECTORY_NAME,
    createStorageKeyFileName(storageKey),
  );
}

export function createApprovedVoiceProfileFileStorage(): ApprovedVoiceProfileFileStorage {
  return {
    async getItem(storageKey) {
      const file = createStorageFile(storageKey);

      if (!file.exists) {
        return null;
      }

      return file.text();
    },
    async setItem(storageKey, value) {
      const directory = new Directory(
        Paths.document,
        APPROVED_VOICE_PROFILE_STORAGE_DIRECTORY_NAME,
      );
      directory.create({ idempotent: true, intermediates: true });

      const file = createStorageFile(storageKey);
      if (!file.exists) {
        file.create({ intermediates: true });
      }
      file.write(value);
    },
  };
}
