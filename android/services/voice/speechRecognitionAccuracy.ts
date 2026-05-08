import type {
  AndroidIntentOptions,
  ExpoSpeechRecognitionResult,
} from "expo-speech-recognition";

const LANGUAGE_MODEL_FREE_FORM = "free_form";
const LANGUAGE_MODEL_WEB_SEARCH = "web_search";
const SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_RATIO = 0.75;
const SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_MIN_MS = 2000;
const SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_MAX_MS = 12000;

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

export const CASE_COMMAND_CONTEXTUAL_STRINGS = [
  "case",
  "Case",
  "케이스",
  "Codex",
  "코덱스",
  "Claude",
  "GPT",
  "Ollama",
  "터미널",
  "명령",
  "실행",
  "파일",
  "폴더",
  "프로젝트",
  "서버",
  "테스트",
  "빌드",
  "로그",
  "에러",
  "커밋",
  "푸시",
  "풀",
  "브랜치",
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

export function createSpeechContextualStrings(
  extraPhrases: readonly string[] = [],
): string[] {
  return uniqueNonEmpty([...CASE_COMMAND_CONTEXTUAL_STRINGS, ...extraPhrases]);
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

export function selectBestSpeechTranscript(
  results: readonly Pick<
    ExpoSpeechRecognitionResult,
    "transcript" | "confidence"
  >[],
): string {
  let bestResult:
    | Pick<ExpoSpeechRecognitionResult, "transcript" | "confidence">
    | null = null;
  let bestConfidence = -1;

  for (const result of results) {
    const transcript = result.transcript?.trim();
    if (!transcript) continue;

    const confidence = Number.isFinite(result.confidence)
      ? result.confidence
      : -1;

    if (!bestResult || (confidence >= 0 && confidence > bestConfidence)) {
      bestResult = result;
      bestConfidence = confidence;
    }
  }

  return bestResult?.transcript.trim() || "";
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

export function createSpeechInputAndroidIntentOptions({
  silenceTimeout,
}: {
  silenceTimeout: number;
}): Partial<AndroidIntentOptions> {
  const possiblyCompleteSilenceTimeout = Math.min(
    silenceTimeout,
    Math.max(
      SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_MIN_MS,
      Math.min(
        SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_MAX_MS,
        Math.floor(
          silenceTimeout * SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_RATIO,
        ),
      ),
    ),
  );

  return {
    EXTRA_ENABLE_LANGUAGE_DETECTION: true,
    EXTRA_LANGUAGE_DETECTION_ALLOWED_LANGUAGES: CASE_RECOGNITION_LANGUAGE_HINTS,
    EXTRA_LANGUAGE_MODEL: LANGUAGE_MODEL_FREE_FORM,
    EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS: 1200,
    EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: silenceTimeout,
    EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS:
      possiblyCompleteSilenceTimeout,
  };
}
