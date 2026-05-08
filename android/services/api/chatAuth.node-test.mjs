import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("Android chat service refreshes and attaches the Case Hub token", () => {
  const chatServiceSource = readFileSync(
    new URL("./chatService.ts", import.meta.url),
    "utf8",
  );
  const tokenStoreSource = readFileSync(
    new URL("./tokenStore.ts", import.meta.url),
    "utf8",
  );
  const typesSource = readFileSync(new URL("./types.ts", import.meta.url), "utf8");

  assert.match(chatServiceSource, /\/auth\/refresh-local/);
  assert.match(chatServiceSource, /CASE_HUB_AUTH_ENABLED/);
  assert.match(chatServiceSource, /CASE_HUB_TOKEN_HEADER = "X-Case-Hub-Token"/);
  assert.match(chatServiceSource, /if \(!this\.authEnabled\)/);
  assert.match(chatServiceSource, /await this\.ensureInitialTokenRefreshAttempted\(\);/);
  assert.match(chatServiceSource, /\[CASE_HUB_TOKEN_HEADER\]: token/);
  assert.match(chatServiceSource, /fetchWithAuth/);
  assert.match(chatServiceSource, /!this\.authEnabled \|\| response\.status !== 401/);
  assert.match(chatServiceSource, /const refreshed = await this\.refreshLocalToken\(\{/);
  assert.match(chatServiceSource, /return refreshed \? request\(\) : response/);
  assert.match(chatServiceSource, /\/speech/);
  assert.match(chatServiceSource, /response\.arrayBuffer\(\)/);
  assert.match(chatServiceSource, /case-openai-tts/);

  assert.match(typesSource, /DEFAULT_API_BASE_URL = "https:\/\/cdnwell\.store"/);
  assert.match(typesSource, /process\.env\.EXPO_PUBLIC_CASE_HUB_URL/);
  assert.match(typesSource, /EXPO_PUBLIC_APP_ENV/);
  assert.match(typesSource, /CASE_HUB_AUTH_ENABLED/);
  assert.match(typesSource, /synthesizeSpeech/);
  assert.match(typesSource, /"marin" \| "cedar"/);
  assert.doesNotMatch(typesSource, /192\.168\.0\.18/);

  assert.match(tokenStoreSource, /expo-file-system/);
  assert.match(tokenStoreSource, /case-hub-auth/);
  assert.match(tokenStoreSource, /token\.txt/);
});
