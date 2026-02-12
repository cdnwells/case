import { useState, useCallback, useEffect, useRef } from "react";
import * as Speech from "expo-speech";

interface UseTextToSpeechOptions {
  language?: string;
  pitch?: number;
  rate?: number;
}

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  speak: (text: string) => void;
  stop: () => void;
}

export function useTextToSpeech({
  language = "en-US",
  pitch = 1.0,
  rate = 1.0,
}: UseTextToSpeechOptions = {}): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceIdRef = useRef<string | undefined>(undefined);

  // Try to find a male Korean voice on mount
  useEffect(() => {
    (async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        // const koreanMale = voices.find(
        //   (v) =>
        //     v.language.startsWith("ko") &&
        //     (/male/i.test(v.name) || /남성/i.test(v.name)),
        // );
        const selectedVoice = voices.find(
          (voice) => voice.name.includes("Male") || voice.name.includes("KR"),
        );
        if (selectedVoice) {
          voiceIdRef.current = selectedVoice.identifier;
        }
      } catch {
        /* ignore - will use default voice */
      }
    })();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      Speech.stop();
      Speech.speak(text, {
        language,
        pitch,
        rate,
        voice: voiceIdRef.current,
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => setIsSpeaking(false),
      });
    },
    [language, pitch, rate],
  );

  const stop = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speak, stop };
}
