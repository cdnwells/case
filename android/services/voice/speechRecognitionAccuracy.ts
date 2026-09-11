import type {
  AndroidIntentOptions,
  ExpoSpeechRecognitionResult,
} from "expo-speech-recognition";

const LANGUAGE_MODEL_WEB_SEARCH = "web_search";

export const CASE_RECOGNITION_LANGUAGE_HINTS = ["ko-KR", "en-US"];

export const DEFAULT_CASE_WAKE_WORDS = [
  "case",
  "Case",
  "케이스",
  "케이쓰",
  "케이 스",
  "케 이스",
  "케이스야",
  "헤이 케이스",
  "hey case",
];

const WAKE_WORD_MATCH_PHRASES = [
  ...DEFAULT_CASE_WAKE_WORDS,
  "kase",
  "k case",
  "k-case",
  "케스",
  "케잇",
  "케이즈",
  "케이수",
];

function uniqueNonEmpty(values: readonly string[]): string[] {
  return Array.from(
    new Set(values.map((value) => value.trim()).filter(Boolean)),
  );
}

export function createWakeWordContextualStrings(
  wakeWords: readonly string[] = DEFAULT_CASE_WAKE_WORDS,
): string[] {
  return uniqueNonEmpty([...DEFAULT_CASE_WAKE_WORDS, ...wakeWords]);
}

export function normalizeSpeechMatchText(value: string): string {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~，。！？、・]+/g, "");
}

export function transcriptMatchesWakeWord(
  results: readonly Pick<ExpoSpeechRecognitionResult, "transcript">[],
  wakeWords: readonly string[] = DEFAULT_CASE_WAKE_WORDS,
): boolean {
  const normalizedWakeWords = [
    ...WAKE_WORD_MATCH_PHRASES,
    ...wakeWords,
  ].map(normalizeSpeechMatchText);

  return results.some((result) => {
    const transcript = normalizeSpeechMatchText(result.transcript || "");
    if (!transcript) return false;
    return normalizedWakeWords.some((wakeWord) => transcript.includes(wakeWord));
  });
}

export function createWakeWordAndroidIntentOptions(): Partial<
  AndroidIntentOptions
> {
  return {
    EXTRA_ENABLE_LANGUAGE_DETECTION: true,
    EXTRA_LANGUAGE_DETECTION_ALLOWED_LANGUAGES: CASE_RECOGNITION_LANGUAGE_HINTS,
    EXTRA_LANGUAGE_MODEL: LANGUAGE_MODEL_WEB_SEARCH,
    EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 500,
    EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 1000,
  };
}
