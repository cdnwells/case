import { Directory, File, Paths } from "expo-file-system";

const CASE_HUB_TOKEN_STORAGE_DIRECTORY_NAME = "case-hub-auth";
const CASE_HUB_TOKEN_STORAGE_FILE_NAME = "token.txt";

export interface CaseHubTokenStore {
  getToken(): Promise<string | null>;
  setToken(token: string): Promise<void>;
}

function normalizeCaseHubToken(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const token = value.trim();
  return token.length > 0 ? token : null;
}

function createTokenFile(): File {
  return new File(
    Paths.document,
    CASE_HUB_TOKEN_STORAGE_DIRECTORY_NAME,
    CASE_HUB_TOKEN_STORAGE_FILE_NAME,
  );
}

export function createCaseHubTokenFileStore(): CaseHubTokenStore {
  return {
    async getToken() {
      const file = createTokenFile();
      if (!file.exists) {
        return null;
      }

      return normalizeCaseHubToken(await file.text());
    },
    async setToken(token) {
      const normalizedToken = normalizeCaseHubToken(token);
      if (!normalizedToken) {
        return;
      }

      const directory = new Directory(
        Paths.document,
        CASE_HUB_TOKEN_STORAGE_DIRECTORY_NAME,
      );
      directory.create({ idempotent: true, intermediates: true });

      const file = createTokenFile();
      if (!file.exists) {
        file.create({ intermediates: true });
      }
      file.write(normalizedToken);
    },
  };
}

export const caseHubTokenStore = createCaseHubTokenFileStore();
