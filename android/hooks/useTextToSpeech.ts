import { useState, useCallback, useEffect, useRef } from "react";
import { File } from "expo-file-system";
import * as Speech from "expo-speech";
import type {
  OpenAITtsVoice,
  SynthesizeSpeechRequest,
  SynthesizeSpeechResponse,
} from "@/services/api/types";

type AudioSubscription = { remove: () => void };
type GeneratedAudioPlayer = {
  addListener: (
    eventName: "playbackStatusUpdate",
    listener: (status: { didJustFinish: boolean }) => void,
  ) => AudioSubscription;
  pause: () => void;
  play: () => void;
  remove: () => void;
};
type ExpoAudioModule = {
  createAudioPlayer: (
    source: { uri: string },
    options: { updateInterval: number },
  ) => GeneratedAudioPlayer;
};

interface UseTextToSpeechOptions {
  language?: string;
  pitch?: number;
  rate?: number;
  openAIVoice?: OpenAITtsVoice;
  openAIInstructions?: string;
  synthesizeSpeech?: (
    request: SynthesizeSpeechRequest,
  ) => Promise<SynthesizeSpeechResponse>;
}

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  speak: (text: string) => void;
  speakAsync: (text: string) => Promise<void>;
  stop: () => void;
}

const DEFAULT_OPENAI_VOICE: OpenAITtsVoice = "marin";

function deleteGeneratedSpeechFile(uri: string | null) {
  if (!uri?.startsWith("file://")) {
    return;
  }

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    /* ignore cache cleanup failures */
  }
}

async function loadExpoAudioModule(): Promise<ExpoAudioModule | null> {
  try {
    return (await import("expo-audio")) as ExpoAudioModule;
  } catch {
    return null;
  }
}

export function useTextToSpeech({
  language = "en-US",
  pitch = 1.0,
  rate = 1.0,
  openAIVoice = DEFAULT_OPENAI_VOICE,
  openAIInstructions,
  synthesizeSpeech,
}: UseTextToSpeechOptions = {}): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const voiceIdRef = useRef<string | undefined>(undefined);
  const audioPlayerRef = useRef<GeneratedAudioPlayer | null>(null);
  const audioSubscriptionRef = useRef<AudioSubscription | null>(null);
  const generatedAudioUriRef = useRef<string | null>(null);
  const speechRequestIdRef = useRef(0);
  const pendingSpeechResolveRef = useRef<{
    requestId: number;
    resolve: () => void;
  } | null>(null);

  const resolvePendingSpeech = useCallback((requestId?: number) => {
    const pending = pendingSpeechResolveRef.current;
    if (!pending || (requestId && pending.requestId !== requestId)) {
      return;
    }

    pendingSpeechResolveRef.current = null;
    pending.resolve();
  }, []);

  const stopGeneratedAudio = useCallback(() => {
    audioSubscriptionRef.current?.remove();
    audioSubscriptionRef.current = null;

    const player = audioPlayerRef.current;
    audioPlayerRef.current = null;
    if (player) {
      try {
        player.pause();
      } catch {
        /* ignore playback cleanup failures */
      }
      try {
        player.remove();
      } catch {
        /* ignore playback cleanup failures */
      }
    }

    const generatedAudioUri = generatedAudioUriRef.current;
    generatedAudioUriRef.current = null;
    deleteGeneratedSpeechFile(generatedAudioUri);
  }, []);

  const stopCurrentPlayback = useCallback(() => {
    Speech.stop();
    stopGeneratedAudio();
  }, [stopGeneratedAudio]);

  const finishSpeechRequest = useCallback(
    (requestId: number) => {
      if (requestId === speechRequestIdRef.current) {
        setIsSpeaking(false);
      }
      stopGeneratedAudio();
      resolvePendingSpeech(requestId);
    },
    [resolvePendingSpeech, stopGeneratedAudio],
  );

  // Try to find a matching local voice for the fallback path.
  useEffect(() => {
    (async () => {
      try {
        const voices = await Speech.getAvailableVoicesAsync();
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

  useEffect(() => {
    return () => {
      speechRequestIdRef.current += 1;
      stopCurrentPlayback();
      setIsSpeaking(false);
      resolvePendingSpeech();
    };
  }, [resolvePendingSpeech, stopCurrentPlayback]);

  const speakWithDeviceSpeech = useCallback(
    (text: string, requestId: number) => {
      Speech.stop();
      Speech.speak(text, {
        language,
        pitch,
        rate,
        voice: voiceIdRef.current,
        onDone: () => finishSpeechRequest(requestId),
        onStopped: () => finishSpeechRequest(requestId),
        onError: () => finishSpeechRequest(requestId),
      });
    },
    [finishSpeechRequest, language, pitch, rate],
  );

  const playGeneratedSpeech = useCallback(
    async (uri: string, requestId: number) => {
      const expoAudio = await loadExpoAudioModule();
      if (!expoAudio) {
        throw new Error("ExpoAudio native module is unavailable");
      }
      if (requestId !== speechRequestIdRef.current) {
        deleteGeneratedSpeechFile(uri);
        return;
      }

      const player = expoAudio.createAudioPlayer(
        { uri },
        { updateInterval: 250 },
      );
      audioPlayerRef.current = player;
      generatedAudioUriRef.current = uri;

      const subscription = player.addListener("playbackStatusUpdate", (status) => {
        if (requestId !== speechRequestIdRef.current) {
          return;
        }
        if (status.didJustFinish) {
          finishSpeechRequest(requestId);
        }
      }) as AudioSubscription;
      audioSubscriptionRef.current = subscription;

      try {
        player.play();
      } catch (error) {
        audioSubscriptionRef.current?.remove();
        audioSubscriptionRef.current = null;
        audioPlayerRef.current = null;
        generatedAudioUriRef.current = null;
        try {
          player.remove();
        } catch {
          /* ignore playback cleanup failures */
        }
        deleteGeneratedSpeechFile(uri);
        throw error;
      }
    },
    [finishSpeechRequest],
  );

  const speakAsync = useCallback(
    (text: string): Promise<void> => {
      const spokenText = text.trim();
      if (!spokenText) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const requestId = speechRequestIdRef.current + 1;
        speechRequestIdRef.current = requestId;
        stopCurrentPlayback();
        resolvePendingSpeech();
        pendingSpeechResolveRef.current = { requestId, resolve };
        setIsSpeaking(true);

        if (!synthesizeSpeech) {
          speakWithDeviceSpeech(spokenText, requestId);
          return;
        }

        synthesizeSpeech({
          input: spokenText,
          voice: openAIVoice,
          instructions: openAIInstructions,
        })
          .then((speech) => {
            if (requestId !== speechRequestIdRef.current) {
              deleteGeneratedSpeechFile(speech.uri);
              return;
            }

            try {
              void playGeneratedSpeech(speech.uri, requestId).catch(() => {
                deleteGeneratedSpeechFile(speech.uri);
                if (requestId === speechRequestIdRef.current) {
                  speakWithDeviceSpeech(spokenText, requestId);
                }
              });
            } catch {
              deleteGeneratedSpeechFile(speech.uri);
              speakWithDeviceSpeech(spokenText, requestId);
            }
          })
          .catch(() => {
            if (requestId === speechRequestIdRef.current) {
              speakWithDeviceSpeech(spokenText, requestId);
            }
          });
      });
    },
    [
      openAIInstructions,
      openAIVoice,
      playGeneratedSpeech,
      resolvePendingSpeech,
      speakWithDeviceSpeech,
      stopCurrentPlayback,
      synthesizeSpeech,
    ],
  );

  const speak = useCallback(
    (text: string) => {
      void speakAsync(text);
    },
    [speakAsync],
  );

  const stop = useCallback(() => {
    speechRequestIdRef.current += 1;
    stopCurrentPlayback();
    setIsSpeaking(false);
    resolvePendingSpeech();
  }, [resolvePendingSpeech, stopCurrentPlayback]);

  return { isSpeaking, speak, speakAsync, stop };
}
