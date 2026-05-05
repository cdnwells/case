import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function expectEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

function expectBefore(source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);

  if (firstIndex === -1 || secondIndex === -1 || firstIndex >= secondIndex) {
    throw new Error(`${message}: expected ${first} before ${second}`);
  }
}

const useVoiceInputSource = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), "useVoiceInput.ts"),
  "utf8",
);
const transcriptionEndHandlerStart = useVoiceInputSource.indexOf(
  'useSpeechRecognitionEvent("end"',
);
const transcriptionEndHandlerSource = useVoiceInputSource.slice(
  transcriptionEndHandlerStart,
  useVoiceInputSource.indexOf(
    '// Listen to speech recognition errors',
    transcriptionEndHandlerStart,
  ),
);

expectEqual(
  transcriptionEndHandlerStart >= 0,
  true,
  "voice input declares a transcription completion handler",
);
expectEqual(
  useVoiceInputSource.includes(
    "releaseTranscriptionAudioAfterCompletionWithoutSaveIntent",
  ),
  true,
  "voice input imports the no-save transcription audio cleanup helper",
);
expectEqual(
  useVoiceInputSource.includes("approvedSpeechAudioSegment?:"),
  true,
  "voice input accepts the approved rolling-buffer audio segment in start options",
);
expectEqual(
  useVoiceInputSource.includes("approvedVoiceGateRequired?:"),
  true,
  "voice input lets explicit live speech paths bypass the buffered-audio gate per recording start",
);
expectEqual(
  useVoiceInputSource.includes(
    "approvedVoiceGateRequired = requireApprovedVoiceGate",
  ),
  true,
  "voice input keeps the hook-level approved voice gate requirement as the default",
);
expectEqual(
  useVoiceInputSource.includes(
    "approvedSpeechAudioSegmentRef.current = eligibleRollingBufferAudioSegment",
  ),
  true,
  "voice input keeps the eligible rolling-buffer segment on the local speech-processing path",
);
expectEqual(
  useVoiceInputSource.includes("approvedSpeechProcessingAudioSource?:"),
  true,
  "voice input accepts explicit approved speech-processing audio source metadata",
);
expectEqual(
  useVoiceInputSource.includes(
    "APPROVED_VOICE_LIVE_AUDIO_STREAM_FALLBACK_SOURCE",
  ),
  true,
  "voice input names the live audio stream fallback for approved speech when no rolling-buffer audio is eligible",
);
expectEqual(
  useVoiceInputSource.includes(
    "Live audio stream fallback required for approved speech",
  ),
  true,
  "voice input rejects inconsistent source metadata instead of pretending missing buffered audio exists",
);
expectBefore(
  transcriptionEndHandlerSource,
  "releaseTranscribedAudioWithoutSaveIntent();",
  "onTranscript(transcript);",
  "transcription completion clears captured audio before transcript processing",
);
