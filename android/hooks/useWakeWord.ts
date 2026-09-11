import { useEffect, useRef, useState, useCallback } from "react";
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
} from "expo-speech-recognition";
import * as Speech from "expo-speech";
import {
  DEFAULT_CASE_WAKE_WORDS,
  createWakeWordAndroidIntentOptions,
  createWakeWordContextualStrings,
  transcriptMatchesWakeWord,
} from "@/services/voice/speechRecognitionAccuracy";

interface UseWakeWordOptions {
  enabled: boolean;
  wakeWords?: string[];
  locale?: string;
  onDetected: () => void;
}

interface UseWakeWordReturn {
  stopListening: () => Promise<void>;
  isListening: boolean;
}

export function useWakeWord({
  enabled,
  wakeWords = DEFAULT_CASE_WAKE_WORDS,
  locale = "ko-KR",
  onDetected,
}: UseWakeWordOptions): UseWakeWordReturn {
  const [isListening, setIsListening] = useState(false);

  // Refs to avoid stale closures in event handlers
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  // Track whether this hook owns the current recognition session
  const sessionActiveRef = useRef(false);
  const generationRef = useRef(0);
  const suspendedRef = useRef(false);
  const startingRef = useRef(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopPromiseRef = useRef<Promise<void> | null>(null);
  const endWaiterRef = useRef<(() => void) | null>(null);
  // Flag set when wake word is found, checked in "end" handler
  const wakeWordDetectedRef = useRef(false);

  const startListening = useCallback(async () => {
    if (!enabledRef.current || suspendedRef.current || sessionActiveRef.current || startingRef.current) return;
    const generation = generationRef.current;
    startingRef.current = true;

    try {
      const { granted } =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted || generation !== generationRef.current || !enabledRef.current || suspendedRef.current) return;

      wakeWordDetectedRef.current = false;
      sessionActiveRef.current = true;

      await ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true,
        maxAlternatives: 5,
        continuous: true,
        requiresOnDeviceRecognition: true,
        addsPunctuation: false,
        contextualStrings: createWakeWordContextualStrings(wakeWords),
        androidIntentOptions: createWakeWordAndroidIntentOptions(),
      });

      setIsListening(true);
    } catch {
      sessionActiveRef.current = false;
      // Retry after delay if still enabled
      if (enabledRef.current && !suspendedRef.current) {
        retryTimerRef.current = setTimeout(() => startListening(), 2000);
      }
    } finally { startingRef.current = false; }
  }, [locale]);

  const stopListening = useCallback(async () => {
    suspendedRef.current = true;
    generationRef.current++;
    wakeWordDetectedRef.current = false;
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    if (stopPromiseRef.current) return stopPromiseRef.current;
    if (!sessionActiveRef.current) return;
    sessionActiveRef.current = false;
    setIsListening(false);
    stopPromiseRef.current = new Promise<void>(resolve => {
      const timeout = setTimeout(finish, 1000);
      function finish() { clearTimeout(timeout); endWaiterRef.current = null; resolve(); }
      endWaiterRef.current = finish;
      try { ExpoSpeechRecognitionModule.abort(); } catch { finish(); }
    });
    await stopPromiseRef.current;
    stopPromiseRef.current = null;
  }, []);

  // Check transcripts for wake word
  useSpeechRecognitionEvent("result", (event) => {
    if (!enabledRef.current || !sessionActiveRef.current) return;

    const detected = transcriptMatchesWakeWord(event.results, wakeWords);

    if (detected) {
      // Ignore if TTS is currently playing — mic is picking up speaker audio
      Speech.isSpeakingAsync().then((speaking) => {
        if (speaking) return;
        if (!sessionActiveRef.current) return;
        wakeWordDetectedRef.current = true;
        sessionActiveRef.current = false;
        ExpoSpeechRecognitionModule.abort();
      });
    }
  });

  // Handle recognition end
  useSpeechRecognitionEvent("end", () => {
    endWaiterRef.current?.();
    // If wake word was detected, call onDetected (recognition is now fully stopped)
    if (wakeWordDetectedRef.current) {
      wakeWordDetectedRef.current = false;
      setIsListening(false);
      onDetectedRef.current();
      return;
    }

    // Only process if this hook owned the session
    if (!enabledRef.current || suspendedRef.current) return;

    setIsListening(false);
    sessionActiveRef.current = false;

    // Auto-restart if still enabled
    if (enabledRef.current && !suspendedRef.current) {
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      retryTimerRef.current = setTimeout(() => startListening(), 500);
    }
  });

  // Handle recognition errors
  useSpeechRecognitionEvent("error", () => {
    if (!enabledRef.current || !sessionActiveRef.current) return;

    sessionActiveRef.current = false;
    setIsListening(false);

    // Retry after delay
    if (enabledRef.current) {
      setTimeout(() => startListening(), 2000);
    }
  });

  // Start/stop based on enabled prop
  useEffect(() => {
    if (enabled) {
      suspendedRef.current = false;
      startListening();
    } else {
      stopListening();
    }
  }, [enabled, startListening, stopListening]);

  // Cancel retries and pending permission results on unmount.
  useEffect(() => () => { void stopListening(); }, [stopListening]);

  return { isListening, stopListening };
}
