import { useCallback, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { chatService } from "@/services/api";
import {
  startRealtimeAudioSession,
  stopRealtimeAudioSession,
} from "@/services/voice/realtimeAudioSession";
import type {
  CreateRealtimeCallRequest,
  CreateRealtimeCallResponse,
  OpenAIRealtimeActivationSource,
} from "@/services/api/types";

type RealtimeConversationState =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "unavailable";

type WebRTCLikeModule = {
  mediaDevices?: {
    getUserMedia: (constraints: {
      audio: boolean | Record<string, unknown>;
      video: boolean;
    }) => Promise<MediaStreamLike>;
  };
  RTCPeerConnection?: new (configuration?: Record<string, unknown>) => PeerConnectionLike;
  RTCSessionDescription?: new (description: {
    type: "answer" | "offer";
    sdp: string;
  }) => unknown;
};

type TrackLike = {
  enabled?: boolean;
  kind?: string;
  stop?: () => void;
  _setVolume?: (volume: number) => void;
};

type MediaStreamLike = {
  getAudioTracks?: () => TrackLike[];
  getTracks: () => TrackLike[];
};

type DataChannelLike = {
  close?: () => void;
  send?: (data: string) => void;
  onopen?: (() => void) | null;
  onmessage?: ((event: { data?: unknown }) => void) | null;
  onerror?: ((event: unknown) => void) | null;
  onclose?: (() => void) | null;
};

type PeerConnectionLike = {
  iceGatheringState?: string;
  localDescription?: { sdp?: string } | null;
  close?: () => void;
  addTrack: (track: TrackLike, stream: MediaStreamLike) => void;
  createDataChannel: (label: string) => DataChannelLike;
  createOffer: (options?: Record<string, unknown>) => Promise<{
    type: "offer";
    sdp?: string;
  }>;
  setLocalDescription: (description: unknown) => Promise<void>;
  setRemoteDescription: (description: unknown) => Promise<void>;
  addEventListener?: (eventName: string, listener: () => void) => void;
  removeEventListener?: (eventName: string, listener: () => void) => void;
  onicegatheringstatechange?: (() => void) | null;
  ontrack?: ((event: { streams?: MediaStreamLike[]; track?: TrackLike }) => void) | null;
};

interface StartRealtimeConversationOptions {
  activationSource: OpenAIRealtimeActivationSource;
  conversationId?: string;
  safetyIdentifier?: string;
}

interface UseOpenAIRealtimeConversationOptions {
  enabled?: boolean;
  createRealtimeCall?: (
    request: CreateRealtimeCallRequest,
  ) => Promise<CreateRealtimeCallResponse>;
  onUserTranscript?: (transcript: string) => void;
  onAssistantTranscript?: (transcript: string) => void;
  onError?: (error: Error) => void;
}

interface UseOpenAIRealtimeConversationReturn {
  state: RealtimeConversationState;
  error: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  isActive: boolean;
  start: (options: StartRealtimeConversationOptions) => Promise<boolean>;
  stop: () => Promise<void>;
}

const ICE_GATHERING_TIMEOUT_MS = 2500;
const REMOTE_AUDIO_TRACK_VOLUME = 1;
const REALTIME_DATA_CHANNEL_LABEL = "oai-events";
const OPENAI_REALTIME_ENABLED =
  process.env.EXPO_PUBLIC_OPENAI_REALTIME_ENABLED !== "0";

async function loadWebRTCModule(): Promise<WebRTCLikeModule | null> {
  try {
    return (await import("react-native-webrtc")) as unknown as WebRTCLikeModule;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(record: Record<string, unknown>, field: string): string {
  const value = record[field];
  return typeof value === "string" ? value : "";
}

function collectResponseDoneText(event: Record<string, unknown>): string {
  const response = event.response;
  if (!isRecord(response) || !Array.isArray(response.output)) {
    return "";
  }

  const parts: string[] = [];
  for (const outputItem of response.output) {
    if (!isRecord(outputItem) || !Array.isArray(outputItem.content)) {
      continue;
    }

    for (const contentItem of outputItem.content) {
      if (!isRecord(contentItem)) {
        continue;
      }
      const transcript = stringField(contentItem, "transcript");
      const text = stringField(contentItem, "text");
      if (transcript.trim()) {
        parts.push(transcript.trim());
      } else if (text.trim()) {
        parts.push(text.trim());
      }
    }
  }

  return parts.join("\n").trim();
}

function waitForIceGatheringComplete(pc: PeerConnectionLike): Promise<void> {
  if (pc.iceGatheringState === "complete") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      pc.removeEventListener?.("icegatheringstatechange", handleStateChange);
      if (pc.onicegatheringstatechange === handleStateChange) {
        pc.onicegatheringstatechange = null;
      }
      resolve();
    };

    const handleStateChange = () => {
      if (pc.iceGatheringState === "complete") {
        finish();
      }
    };

    pc.addEventListener?.("icegatheringstatechange", handleStateChange);
    if (!pc.addEventListener) {
      pc.onicegatheringstatechange = handleStateChange;
    }

    setTimeout(finish, ICE_GATHERING_TIMEOUT_MS);
  });
}

function enableRemoteAudioPlayback(stream?: MediaStreamLike | null, track?: TrackLike | null) {
  const audioTracks = stream?.getAudioTracks?.() || [];
  const fallbackAudioTracks =
    audioTracks.length > 0
      ? audioTracks
      : stream?.getTracks().filter((streamTrack) => streamTrack.kind === "audio") ||
        [];
  const tracks =
    track?.kind === "audio" && !fallbackAudioTracks.includes(track)
      ? [track, ...fallbackAudioTracks]
      : fallbackAudioTracks;

  for (const audioTrack of tracks) {
    audioTrack.enabled = true;
    audioTrack._setVolume?.(REMOTE_AUDIO_TRACK_VOLUME);
  }
}

export function useOpenAIRealtimeConversation({
  enabled = true,
  createRealtimeCall = chatService.createRealtimeCall?.bind(chatService),
  onUserTranscript,
  onAssistantTranscript,
  onError,
}: UseOpenAIRealtimeConversationOptions = {}): UseOpenAIRealtimeConversationReturn {
  const [state, setState] = useState<RealtimeConversationState>("idle");
  const [error, setError] = useState<string | null>(null);
  const peerConnectionRef = useRef<PeerConnectionLike | null>(null);
  const dataChannelRef = useRef<DataChannelLike | null>(null);
  const localStreamRef = useRef<MediaStreamLike | null>(null);
  const remoteStreamRef = useRef<MediaStreamLike | null>(null);
  const audioSessionStartedRef = useRef(false);
  const startRequestIdRef = useRef(0);
  const assistantAudioTranscriptRef = useRef("");
  const assistantTextTranscriptRef = useRef("");
  const lastAssistantTranscriptRef = useRef("");
  const onUserTranscriptRef = useRef(onUserTranscript);
  const onAssistantTranscriptRef = useRef(onAssistantTranscript);
  const onErrorRef = useRef(onError);

  onUserTranscriptRef.current = onUserTranscript;
  onAssistantTranscriptRef.current = onAssistantTranscript;
  onErrorRef.current = onError;

  const cleanupConnection = useCallback((nextState: RealtimeConversationState) => {
    if (audioSessionStartedRef.current) {
      stopRealtimeAudioSession();
      audioSessionStartedRef.current = false;
    }

    dataChannelRef.current?.close?.();
    dataChannelRef.current = null;

    peerConnectionRef.current?.close?.();
    peerConnectionRef.current = null;

    for (const track of localStreamRef.current?.getTracks() || []) {
      track.stop?.();
    }
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    assistantAudioTranscriptRef.current = "";
    assistantTextTranscriptRef.current = "";
    lastAssistantTranscriptRef.current = "";
    setState(nextState);
  }, []);

  const handleRealtimeError = useCallback(
    (err: unknown) => {
      const nextError =
        err instanceof Error
          ? err
          : new Error(typeof err === "string" ? err : "Realtime voice failed");
      setError(nextError.message);
      setState("error");
      onErrorRef.current?.(nextError);
    },
    [],
  );

  const stop = useCallback(async () => {
    startRequestIdRef.current += 1;
    cleanupConnection("idle");
  }, [cleanupConnection]);

  const handleServerEvent = useCallback((rawData: unknown) => {
    const emitAssistantTranscript = (transcript: string) => {
      const normalizedTranscript = transcript.trim();
      if (
        !normalizedTranscript ||
        normalizedTranscript === lastAssistantTranscriptRef.current
      ) {
        return;
      }

      lastAssistantTranscriptRef.current = normalizedTranscript;
      onAssistantTranscriptRef.current?.(normalizedTranscript);
    };

    if (typeof rawData !== "string") {
      return;
    }

    let event: unknown;
    try {
      event = JSON.parse(rawData);
    } catch {
      return;
    }

    if (!isRecord(event)) {
      return;
    }

    const eventType = stringField(event, "type");
    if (eventType === "conversation.item.input_audio_transcription.completed") {
      const transcript = stringField(event, "transcript").trim();
      if (transcript) {
        onUserTranscriptRef.current?.(transcript);
      }
      return;
    }

    if (eventType === "response.output_audio_transcript.delta") {
      assistantAudioTranscriptRef.current += stringField(event, "delta");
      return;
    }

    if (eventType === "response.output_audio_transcript.done") {
      const transcript =
        stringField(event, "transcript").trim() ||
        assistantAudioTranscriptRef.current.trim();
      assistantAudioTranscriptRef.current = "";
      if (transcript) {
        emitAssistantTranscript(transcript);
      }
      return;
    }

    if (eventType === "response.output_text.delta") {
      assistantTextTranscriptRef.current += stringField(event, "delta");
      return;
    }

    if (eventType === "response.output_text.done") {
      const transcript =
        stringField(event, "text").trim() ||
        assistantTextTranscriptRef.current.trim();
      assistantTextTranscriptRef.current = "";
      if (transcript) {
        emitAssistantTranscript(transcript);
      }
      return;
    }

    if (eventType === "response.done") {
      const transcript = collectResponseDoneText(event);
      if (transcript) {
        emitAssistantTranscript(transcript);
      }
    }
  }, []);

  const start = useCallback(
    async ({
      activationSource,
      conversationId,
      safetyIdentifier,
    }: StartRealtimeConversationOptions) => {
      if (
        !enabled ||
        !OPENAI_REALTIME_ENABLED ||
        Platform.OS === "web" ||
        !createRealtimeCall
      ) {
        setState("unavailable");
        return false;
      }

      const webRTC = await loadWebRTCModule();
      if (
        !webRTC?.mediaDevices?.getUserMedia ||
        !webRTC.RTCPeerConnection ||
        !webRTC.RTCSessionDescription
      ) {
        setState("unavailable");
        return false;
      }

      const requestId = startRequestIdRef.current + 1;
      startRequestIdRef.current = requestId;
      cleanupConnection("connecting");
      setError(null);

      try {
        audioSessionStartedRef.current = startRealtimeAudioSession({
          speakerphone: true,
        });

        const localStream = await webRTC.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        if (requestId !== startRequestIdRef.current) {
          for (const track of localStream.getTracks()) {
            track.stop?.();
          }
          return false;
        }

        const pc = new webRTC.RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        const dataChannel = pc.createDataChannel(REALTIME_DATA_CHANNEL_LABEL);

        localStreamRef.current = localStream;
        peerConnectionRef.current = pc;
        dataChannelRef.current = dataChannel;

        dataChannel.onopen = () => {
          if (requestId === startRequestIdRef.current) {
            setState("connected");
          }
        };
        dataChannel.onmessage = (event) => handleServerEvent(event.data);
        dataChannel.onerror = (event) => handleRealtimeError(event);
        dataChannel.onclose = () => {
          if (requestId === startRequestIdRef.current) {
            cleanupConnection("idle");
          }
        };

        pc.ontrack = (event) => {
          const remoteStream = event.streams?.[0] || null;
          remoteStreamRef.current = remoteStream;
          enableRemoteAudioPlayback(remoteStream, event.track || null);
        };

        for (const track of localStream.getTracks()) {
          pc.addTrack(track, localStream);
        }

        const offer = await pc.createOffer({ offerToReceiveAudio: true });
        await pc.setLocalDescription(offer);
        await waitForIceGatheringComplete(pc);

        const offerSdp = pc.localDescription?.sdp || offer.sdp || "";
        if (!offerSdp.trim()) {
          throw new Error("Realtime WebRTC offer did not include SDP");
        }

        const realtimeCall = await createRealtimeCall({
          sdp: offerSdp,
          activationSource,
          ...(conversationId ? { conversationId } : {}),
          ...(safetyIdentifier ? { safetyIdentifier } : {}),
        });

        if (requestId !== startRequestIdRef.current) {
          cleanupConnection("idle");
          return false;
        }

        await pc.setRemoteDescription(
          new webRTC.RTCSessionDescription({
            type: "answer",
            sdp: realtimeCall.sdp,
          }),
        );

        setState((currentState) =>
          currentState === "connected" ? currentState : "connecting",
        );
        return true;
      } catch (err) {
        if (requestId === startRequestIdRef.current) {
          cleanupConnection("error");
          handleRealtimeError(err);
        }
        return false;
      }
    },
    [
      cleanupConnection,
      createRealtimeCall,
      enabled,
      handleRealtimeError,
      handleServerEvent,
    ],
  );

  useEffect(() => {
    return () => {
      startRequestIdRef.current += 1;
      cleanupConnection("idle");
    };
  }, [cleanupConnection]);

  return {
    state,
    error,
    isConnecting: state === "connecting",
    isConnected: state === "connected",
    isActive: state === "connecting" || state === "connected",
    start,
    stop,
  };
}
