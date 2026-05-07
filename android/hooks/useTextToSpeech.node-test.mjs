import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const hookSource = readFileSync(new URL("./useTextToSpeech.ts", import.meta.url), "utf8");
const chatInputSource = readFileSync(
  new URL("../components/chat/ChatInput.tsx", import.meta.url),
  "utf8",
);

test("text-to-speech prefers OpenAI marin or cedar audio with device fallback", () => {
  assert.match(hookSource, /createAudioPlayer/);
  assert.match(hookSource, /await import\("expo-audio"\)/);
  assert.match(hookSource, /synthesizeSpeech/);
  assert.match(hookSource, /DEFAULT_OPENAI_VOICE: OpenAITtsVoice = "marin"/);
  assert.match(hookSource, /openAIVoice/);
  assert.doesNotMatch(hookSource, /import \{[^}]*createAudioPlayer[^}]*\} from "expo-audio"/);
  assert.match(hookSource, /catch\(\(\) => \{[\s\S]*speakWithDeviceSpeech\(spokenText, requestId\)/);
  assert.match(hookSource, /import \* as Speech from "expo-speech"/);

  assert.match(chatInputSource, /EXPO_PUBLIC_OPENAI_TTS_VOICE/);
  assert.match(chatInputSource, /process\.env\.EXPO_PUBLIC_OPENAI_TTS_VOICE === "cedar" \? "cedar" : "marin"/);
  assert.match(chatInputSource, /synthesizeSpeech: chatService\.synthesizeSpeech\?\.bind\(chatService\)/);
});
