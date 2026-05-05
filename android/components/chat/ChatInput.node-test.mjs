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
const voiceInputBindingSource = chatInputSource.slice(
  chatInputSource.indexOf("useVoiceInput({"),
  chatInputSource.indexOf("// Track when recording actually starts"),
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
expectNotIncludes(
  chatInputSource,
  "useWakeWord",
  "chat input continuous listening path does not depend on the wake-word hook",
);
expectNotIncludes(
  chatInputSource,
  "wakeWords",
  "chat input does not configure wake-word phrases before speech processing",
);
expectIncludes(
  approvedVoiceGateBindingSource,
  "onApprovedVoiceDetected: handleApprovedVoiceDetected",
  "approved voice gate forwards approved recognition events to the speech-processing handoff",
);
expectIncludes(
  voiceInputBindingSource,
  "requireApprovedVoiceGate: true",
  "speech recognition requires approved voice gate metadata before processing starts",
);
expectIncludes(
  approvedVoiceHandlerSource,
  "await startRecording({",
  "approved voice recognition starts downstream speech processing",
);
expectBefore(
  approvedVoiceHandlerSource,
  "setApprovedAudioSaveCandidate(result);",
  "await startRecording({",
  "chat input presents the approved-audio save purpose flow before speech processing can request persistence",
);
expectIncludes(
  approvedVoiceHandlerSource,
  "approvedVoiceGateAccepted: true",
  "speech-processing handoff marks the event as approved by the voice gate",
);
expectIncludes(
  approvedVoiceHandlerSource,
  "approvedVoiceMatchedVoiceId: result.matchedVoiceId",
  "speech-processing handoff passes the matched approved voice identity",
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
  approvedVoiceHandlerSource,
  "approvedVoiceRecognizedAtMs: result.recognizedAtMs",
  "speech-processing handoff passes the approved recognition timestamp",
);
expectIncludes(
  approvedVoiceHandlerSource,
  "approvedVoiceDownstreamAuthorization: result.downstreamAuthorization",
  "speech-processing handoff passes downstream authorization metadata",
);
expectIncludes(
  approvedVoiceHandlerSource,
  "approvedSpeechAudioSegment: result.approvedSpeechAudioSegment",
  "speech-processing handoff passes the eligible rolling-buffer audio segment",
);
expectIncludes(
  approvedVoiceHandlerSource,
  "approvedSpeechProcessingAudioSource:\n        result.approvedSpeechProcessingAudioSource",
  "speech-processing handoff passes live-stream fallback source metadata when no rolling-buffer segment is eligible",
);
expectIncludes(
  approvedVoiceHandlerSource,
  "releaseCapturedAudio: result.releaseCapturedAudio",
  "speech-processing handoff keeps audio release control attached to the approved event",
);
expectBefore(
  approvedVoiceHandlerSource,
  "await startRecording({",
  "void Haptics.impactAsync",
  "approved voice processing starts before nonessential haptics",
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
