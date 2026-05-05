import { useEffect, useRef, useState, useCallback } from "react";
import {
  useSpeechRecognitionEvent,
  ExpoSpeechRecognitionModule,
} from "expo-speech-recognition";
import * as Speech from "expo-speech";

interface UseWakeWordOptions {
  enabled: boolean;
  wakeWords?: string[];
  locale?: string;
  onDetected: () => void;
}

interface UseWakeWordReturn {
  isListening: boolean;
}

export function useWakeWord({
  enabled,
  wakeWords = ["case", "케이스"],
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
  // Flag set when wake word is found, checked in "end" handler
  const wakeWordDetectedRef = useRef(false);

  const startListening = useCallback(async () => {
    if (!enabledRef.current || sessionActiveRef.current) return;

    try {
      const { granted } =
        await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!granted) return;

      wakeWordDetectedRef.current = false;
      sessionActiveRef.current = true;

      await ExpoSpeechRecognitionModule.start({
        lang: locale,
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
        requiresOnDeviceRecognition: true,
        addsPunctuation: false,
        androidIntentOptions: {
          EXTRA_ENABLE_LANGUAGE_DETECTION: true,
        },
      });

      setIsListening(true);
    } catch {
      sessionActiveRef.current = false;
      // Retry after delay if still enabled
      if (enabledRef.current) {
        setTimeout(() => startListening(), 2000);
      }
    }
  }, [locale]);

  const stopListening = useCallback(async () => {
    if (!sessionActiveRef.current) return;
    sessionActiveRef.current = false;
    setIsListening(false);
    try {
      await ExpoSpeechRecognitionModule.abort();
    } catch {
      // ignore
    }
  }, []);

  // Check transcripts for wake word
  useSpeechRecognitionEvent("result", (event) => {
    if (!enabledRef.current || !sessionActiveRef.current) return;

    const transcript = event.results[0]?.transcript?.toLowerCase() || "";
    const detected = wakeWords.some((w) =>
      transcript.includes(w.toLowerCase()),
    );

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
    // If wake word was detected, call onDetected (recognition is now fully stopped)
    if (wakeWordDetectedRef.current) {
      wakeWordDetectedRef.current = false;
      setIsListening(false);
      onDetectedRef.current();
      return;
    }

    // Only process if this hook owned the session
    if (!enabledRef.current) return;

    setIsListening(false);
    sessionActiveRef.current = false;

    // Auto-restart if still enabled
    if (enabledRef.current) {
      setTimeout(() => startListening(), 500);
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
      startListening();
    } else {
      stopListening();
    }
  }, [enabled, startListening, stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionActiveRef.current) {
        sessionActiveRef.current = false;
        ExpoSpeechRecognitionModule.abort();
      }
    };
  }, []);

  return { isListening };
}
