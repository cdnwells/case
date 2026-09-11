import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function expectEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

function expectIncludes(source, expected, message) {
  if (!source.includes(expected)) {
    throw new Error(`${message}: expected source to include ${expected}`);
  }
}

function expectNotIncludes(source, unexpected, message) {
  if (source.includes(unexpected)) {
    throw new Error(`${message}: expected source not to include ${unexpected}`);
  }
}

function expectBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  if (firstIndex === -1 || secondIndex === -1 || firstIndex >= secondIndex) {
    throw new Error(`${message}: expected ${first} before ${second}`);
  }
}

const chatInputSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "ChatInput.tsx"),
  "utf8",
);
const approvedVoiceHandlerStart = chatInputSource.indexOf(
  "const handleApprovedVoiceDetected",
);
const approvedVoiceHandlerSource = chatInputSource.slice(
  approvedVoiceHandlerStart,
  chatInputSource.indexOf("useApprovedVoiceGate({", approvedVoiceHandlerStart),
);
const approvedVoiceGateBindingSource = chatInputSource.slice(
  chatInputSource.indexOf("useApprovedVoiceGate({"),
  chatInputSource.indexOf("// Pulse animation", approvedVoiceHandlerStart),
);
const wakeWordHandlerStart = chatInputSource.indexOf(
  "const handleWakeWordDetected",
);
const wakeWordHandlerSource = chatInputSource.slice(
  wakeWordHandlerStart,
  chatInputSource.indexOf("useApprovedVoiceGate({", wakeWordHandlerStart),
);
const wakeWordBindingSource = chatInputSource.slice(
  chatInputSource.indexOf("useWakeWord({"),
  chatInputSource.indexOf("// Pulse animation", approvedVoiceHandlerStart),
);
const longPressHandlerSource = chatInputSource.slice(
  chatInputSource.indexOf("const handleManualVoiceStart"),
  chatInputSource.indexOf("const handleStopRealtimeVoiceInput"),
);
const primaryActionHandlerSource = chatInputSource.slice(
  chatInputSource.indexOf("const handlePrimaryActionPress"),
  chatInputSource.indexOf("const handleTextInputFocus"),
);

expectEqual(
  approvedVoiceHandlerStart >= 0,
  true,
  "chat input declares an approved voice recognition event handler",
);
expectIncludes(
  chatInputSource,
  "useApprovedVoiceGate,",
  "chat input imports the approved voice gate hook",
);
expectIncludes(
  chatInputSource,
  "ApprovedAudioSavePrompt",
  "chat input imports the user-visible approved audio save prompt",
);
expectIncludes(
  chatInputSource,
  "saveApprovedAudioForUserVisibleLaterUse",
  "chat input imports the explicit approved-audio save flow",
);
expectIncludes(
  chatInputSource,
  "useWakeWord",
  "chat input imports the wake-word hook for always-listening fallback",
);
expectNotIncludes(
  chatInputSource,
  "wakeWords",
  "chat input uses the wake-word hook defaults instead of redefining phrases inline",
);
expectIncludes(
  chatInputSource,
  "approvedVoiceCount === 0",
  "chat input enables wake-word fallback only when no approved voice profiles are loaded",
);
expectIncludes(
  chatInputSource,
  'approvedVoiceProfileRuntimeStatus !== "loading"',
  "chat input waits for approved voice profile loading before starting wake-word fallback",
);
expectIncludes(
  approvedVoiceGateBindingSource,
  "enabled: approvedVoiceGateEnabled",
  "approved voice gate is enabled only when approved profiles can own continuous listening",
);
expectIncludes(
  approvedVoiceGateBindingSource,
  "onApprovedVoiceDetected: handleApprovedVoiceDetected",
  "approved voice gate forwards approved recognition events to the speech-processing handoff",
);
expectIncludes(
  wakeWordBindingSource,
  "enabled: wakeWordFallbackEnabled",
  "wake-word listener is enabled as the always-listening fallback",
);
expectIncludes(
  wakeWordBindingSource,
  "onDetected: handleWakeWordDetected",
  "wake-word listener hands detection off to speech input",
);

expectIncludes(
  primaryActionHandlerSource,
  "if (canSend)",
  "primary action still sends typed messages before starting voice chat",
);
expectIncludes(
  primaryActionHandlerSource,
  "if (canStartPrimaryRealtimeVoice)",
  "primary action starts realtime voice when the composer is empty",
);
expectIncludes(
  primaryActionHandlerSource,
  "await handleManualVoiceStart();",
  "primary action reuses the realtime-first manual voice path",
);
expectBefore(
  primaryActionHandlerSource,
  "if (canSend)",
  "if (canStartPrimaryRealtimeVoice)",
  "typed messages keep priority over empty-composer realtime voice",
);
expectIncludes(
  chatInputSource,
  "onPress={handlePrimaryActionPress}",
  "send button routes normal taps through the realtime-prioritized primary action",
);
expectIncludes(
  chatInputSource,
  "onLongPress={handleManualVoiceStart}",
  "long press keeps the same realtime-first manual voice entry point",
);
expectIncludes(
  chatInputSource,
  'canStartPrimaryRealtimeVoice\n                      ? "실시간 음성 대화 시작"',
  "empty-composer primary action is announced as realtime voice chat",
);

expectIncludes(
  chatInputSource,
  "matchedApprovedVoiceProfileId={\n              approvedAudioSaveCandidate.matchedApprovedVoiceProfileId",
  "chat input surfaces the matched approved voice profile id in the save prompt",
);
expectIncludes(
  chatInputSource,
  "matchedApprovedVoiceLabel={\n              approvedAudioSaveCandidate.matchedApprovedVoiceLabel",
  "chat input surfaces the matched approved voice profile label in the save prompt",
);

expectIncludes(
  chatInputSource,
  "laterUsePurpose={approvedAudioSavePurpose}",
  "chat input renders the user-visible later-use purpose before saving captured audio",
);
expectIncludes(
  chatInputSource,
  "onLaterUsePurposeChange={handleApprovedAudioSavePurposeChange}",
  "chat input wires purpose entry into the explicit save prompt",
);
expectIncludes(
  chatInputSource,
  "disabled={Boolean(disabled) || !isVoiceMode}",
  "chat input disables the explicit save prompt after the approved speech window closes",
);
expectIncludes(
  chatInputSource,
  "APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_EMPTY_PURPOSE_ERROR",
  "chat input rejects explicit save attempts without a later-use purpose",
);
expectIncludes(
  chatInputSource,
  "saveApprovedAudioForUserVisibleLaterUse(approvedAudioSaveCandidate",
  "chat input persists approved audio only through the user-visible explicit save flow",
);
expectIncludes(
  chatInputSource,
  "approvedAudioSaveCandidate?.releaseCapturedAudio(\"processing_cancelled\");",
  "chat input discards captured audio when the explicit save flow is dismissed",
);
expectBefore(
  chatInputSource,
  "if (!approvedAudioSavePurpose.trim())",
  "saveApprovedAudioForUserVisibleLaterUse(approvedAudioSaveCandidate",
  "chat input validates the later-use purpose before captured audio persistence",
);

expectIncludes(chatInputSource, 'useOpenAILiveConversation', 'voice controls use the Live hook');
expectNotIncludes(chatInputSource, 'useVoiceInput', 'Live failures never activate chained speech recognition');
expectIncludes(chatInputSource, 'history: voiceHistory', 'new sessions receive chat history');
expectIncludes(chatInputSource, 'onCaption: onVoiceCaption', 'captions update existing chat rows');
expectIncludes(chatInputSource, 'activationStops.current.map', 'microphone owners stop before Live capture');
