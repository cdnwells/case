import assert from "node:assert/strict";
import test from "node:test";

import {
  createSpeechContextualStrings,
  createSpeechInputAndroidIntentOptions,
  createWakeWordAndroidIntentOptions,
  createWakeWordContextualStrings,
  normalizeSpeechMatchText,
  selectBestSpeechTranscript,
  transcriptMatchesWakeWord,
} from "./speechRecognitionAccuracy.ts";

test("wake-word matching tolerates common Korean and English recognition variants", () => {
  assert.equal(
    transcriptMatchesWakeWord([{ transcript: "케이 스 시작해" }]),
    true,
  );
  assert.equal(
    transcriptMatchesWakeWord([{ transcript: "hey case run tests" }]),
    true,
  );
  assert.equal(
    transcriptMatchesWakeWord([{ transcript: "그냥 대화만 하는 중" }]),
    false,
  );
});

test("speech matching normalization removes punctuation and spacing noise", () => {
  assert.equal(normalizeSpeechMatchText(" 케 이-스! "), "케이스");
});

test("speech transcript selection prefers a higher-confidence alternative", () => {
  assert.equal(
    selectBestSpeechTranscript([
      { transcript: "서버를 꺼", confidence: 0.42 },
      { transcript: "서버를 켜", confidence: 0.91 },
    ]),
    "서버를 켜",
  );
});

test("speech transcript selection keeps the first usable transcript when confidence is unavailable", () => {
  assert.equal(
    selectBestSpeechTranscript([
      { transcript: "첫 번째 명령", confidence: -1 },
      { transcript: "두 번째 명령", confidence: -1 },
    ]),
    "첫 번째 명령",
  );
});

test("recognition context biases include app and command vocabulary", () => {
  const speechContext = createSpeechContextualStrings(["테스트"]);
  const wakeContext = createWakeWordContextualStrings(["케이스야"]);

  assert.equal(speechContext.includes("Codex"), true);
  assert.equal(speechContext.includes("명령"), true);
  assert.equal(speechContext.filter((phrase) => phrase === "테스트").length, 1);
  assert.equal(wakeContext.includes("case"), true);
  assert.equal(wakeContext.includes("케이스야"), true);
});

test("Android recognizer options use wake-word and dictation tuned language models", () => {
  assert.equal(
    createWakeWordAndroidIntentOptions().EXTRA_LANGUAGE_MODEL,
    "web_search",
  );
  assert.equal(
    createSpeechInputAndroidIntentOptions({ silenceTimeout: 8000 })
      .EXTRA_LANGUAGE_MODEL,
    "free_form",
  );
  assert.equal(
    createSpeechInputAndroidIntentOptions({ silenceTimeout: 8000 })
      .EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS,
    8000,
  );
  assert.equal(
    createSpeechInputAndroidIntentOptions({ silenceTimeout: 8000 })
      .EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS,
    6000,
  );
});
