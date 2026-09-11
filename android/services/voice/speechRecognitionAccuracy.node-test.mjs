import assert from "node:assert/strict";
import test from "node:test";

import {
  createWakeWordAndroidIntentOptions,
  createWakeWordContextualStrings,
  normalizeSpeechMatchText,
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



test("wake-word recognition context includes configured phrases", () => {
  const wakeContext = createWakeWordContextualStrings(["케이스야"]);

  assert.equal(wakeContext.includes("case"), true);
  assert.equal(wakeContext.includes("케이스야"), true);
});

test("Android wake-word recognizer uses the web search language model", () => {
  assert.equal(
    createWakeWordAndroidIntentOptions().EXTRA_LANGUAGE_MODEL,
    "web_search",
  );
});
