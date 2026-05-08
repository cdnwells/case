import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import test from "node:test";

const hookSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "useOpenAIRealtimeConversation.ts"),
  "utf8",
);
const chatInputSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../components/chat/ChatInput.tsx"),
  "utf8",
);
const chatServiceSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../services/api/chatService.ts"),
  "utf8",
);
const realtimeAudioSessionSource = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../services/voice/realtimeAudioSession.ts",
  ),
  "utf8",
);
const realtimeAudioSessionNativeSource = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../modules/battery-optimization/android/src/main/java/expo/modules/caseaudio/CaseRealtimeAudioSessionModule.kt",
  ),
  "utf8",
);
const expoModuleConfigSource = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    "../modules/battery-optimization/expo-module.config.json",
  ),
  "utf8",
);
const apiTypesSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "../services/api/types.ts"),
  "utf8",
);

test("OpenAI Realtime hook creates a WebRTC offer through the Hub", () => {
  assert.match(hookSource, /await import\("react-native-webrtc"\)/);
  assert.match(hookSource, /createDataChannel\(REALTIME_DATA_CHANNEL_LABEL\)/);
  assert.match(hookSource, /mediaDevices\.getUserMedia/);
  assert.match(hookSource, /createRealtimeCall\(\{/);
  assert.match(hookSource, /setRemoteDescription/);
  assert.match(hookSource, /startRealtimeAudioSession\(\{/);
  assert.match(hookSource, /stopRealtimeAudioSession\(\)/);
  assert.match(hookSource, /enableRemoteAudioPlayback\(remoteStream, event\.track/);
  assert.match(hookSource, /audioTrack\.enabled = true/);
  assert.match(hookSource, /audioTrack\._setVolume\?\./);
  assert.match(hookSource, /conversation\.item\.input_audio_transcription\.completed/);
  assert.match(hookSource, /response\.output_audio_transcript\.done/);
});

test("Chat service sends Realtime SDP to the protected Hub endpoint", () => {
  assert.match(chatServiceSource, /\/realtime\/calls/);
  assert.match(chatServiceSource, /Accept: "application\/sdp"/);
  assert.match(apiTypesSource, /CreateRealtimeCallRequest/);
  assert.match(apiTypesSource, /CreateRealtimeCallResponse/);
  assert.match(apiTypesSource, /createRealtimeCall\?/);
});

test("Realtime voice routes Android WebRTC audio to audible output", () => {
  assert.match(
    realtimeAudioSessionSource,
    /requireOptionalNativeModule<NativeRealtimeAudioSessionModule>\(\s*"CaseRealtimeAudioSession"/,
  );
  assert.match(realtimeAudioSessionSource, /Platform\.OS !== "android"/);
  assert.match(realtimeAudioSessionSource, /start\(speakerphone\)/);
  assert.match(realtimeAudioSessionNativeSource, /Name\("CaseRealtimeAudioSession"\)/);
  assert.match(realtimeAudioSessionNativeSource, /MODE_IN_COMMUNICATION/);
  assert.match(realtimeAudioSessionNativeSource, /USAGE_VOICE_COMMUNICATION/);
  assert.match(realtimeAudioSessionNativeSource, /setCommunicationDevice/);
  assert.match(realtimeAudioSessionNativeSource, /isSpeakerphoneOn/);
  assert.match(
    expoModuleConfigSource,
    /expo\.modules\.caseaudio\.CaseRealtimeAudioSessionModule/,
  );
});

test("Chat input tries Realtime voice before speech-recognition fallback", () => {
  assert.match(chatInputSource, /useOpenAIRealtimeConversation/);
  assert.match(chatInputSource, /const startRealtimeVoiceMode/);
  assert.match(chatInputSource, /startRealtimeVoiceMode\(\s*"approved_voice"/);
  assert.match(chatInputSource, /startRealtimeVoiceMode\("wake_word"\)/);
  assert.match(chatInputSource, /startRealtimeVoiceMode\("manual"\)/);
  assert.match(chatInputSource, /const handlePrimaryActionPress/);
  assert.match(chatInputSource, /onPress=\{handlePrimaryActionPress\}/);
  assert.match(chatInputSource, /canStartPrimaryRealtimeVoice/);
  assert.match(chatInputSource, /onUserTranscript: handleRealtimeUserTranscript/);
  assert.match(chatInputSource, /onAssistantTranscript: handleRealtimeAssistantTranscript/);
  assert.match(chatInputSource, /handleStopRealtimeVoiceInput/);
});
