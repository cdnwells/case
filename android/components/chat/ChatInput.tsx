import { IconSymbol } from "@/components/ui/icon-symbol";
import type { ApprovedSpeechAudioReleaseReason } from "@/constants/audioBuffer";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  useApprovedVoiceGate,
  type ApprovedVoiceRecognitionEvent,
} from "@/hooks/useApprovedVoiceGate";
import { useOpenAIRealtimeConversation } from "@/hooks/useOpenAIRealtimeConversation";
import {
  APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_EMPTY_PURPOSE_ERROR,
  saveApprovedAudioForUserVisibleLaterUse,
} from "@/services/voice/approvedAudioExplicitSaveFlow";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useWakeWord } from "@/hooks/useWakeWord";
import type { ApprovedVoiceProfileRuntimeStatus } from "@/hooks/useApprovedVoiceProfileRuntime";
import { chatService } from "@/services/api";
import type {
  ChatAttachmentRequest,
  ChatDriveFileAttachmentRequest,
  ChatImageAttachmentRequest,
  DriveFileSummary,
} from "@/types/chat";
import { File } from "expo-file-system";
import * as Haptics from "expo-haptics";
import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Image,
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ApprovedAudioSavePrompt } from "./ApprovedAudioSavePrompt";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  CHAT_IMAGE_ATTACHMENT_NON_DECODABLE_MESSAGE,
  CHAT_IMAGE_ATTACHMENT_PICKER_MIME_TYPE,
  createSelectedImageAttachmentFromPickedFile,
  getPreparedImageAttachmentPayloadErrorMessage,
  getRejectedImageAttachmentSelectionStateUpdate,
  getImageAttachmentSizeValidationErrorMessage,
  normalizePreparedImageAttachmentPayload,
  type ImageAttachmentDecodedDimensions,
  type SelectedImageAttachment,
  validateSelectedImageAttachmentDecodable,
  validateSelectedImageAttachmentSize,
} from "./imageAttachmentValidation";

const OPENAI_TTS_VOICE =
  process.env.EXPO_PUBLIC_OPENAI_TTS_VOICE === "cedar" ? "cedar" : "marin";
const DEFAULT_VOICE_INPUT_SILENCE_TIMEOUT_MS = 8000;
const WAKE_WORD_VOICE_INPUT_SILENCE_TIMEOUT_MS = 12000;

interface ChatInputProps {
  onSend: (
    message: string,
    options?: { attachments?: ChatAttachmentRequest[] },
  ) => void | Promise<void>;
  disabled?: boolean;
  lastAssistantMessage?: string;
  onLocalMessage?: (content: string, role?: "user" | "assistant") => void;
  approvedVoiceProfileRuntimeStatus?: ApprovedVoiceProfileRuntimeStatus;
  approvedVoiceCount?: number;
}

function decodeSelectedImageAttachment(
  uri: string,
): Promise<ImageAttachmentDecodedDimensions> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      reject,
    );
  });
}

export function ChatInput({
  onSend,
  disabled,
  lastAssistantMessage,
  onLocalMessage,
  approvedVoiceProfileRuntimeStatus = "ready",
  approvedVoiceCount = 0,
}: ChatInputProps) {
  const [text, setText] = useState("");
  const [selectedImageAttachment, setSelectedImageAttachment] =
    useState<SelectedImageAttachment | null>(null);
  const [selectedDriveFileAttachment, setSelectedDriveFileAttachment] =
    useState<ChatDriveFileAttachmentRequest | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isAttachmentMenuVisible, setIsAttachmentMenuVisible] = useState(false);
  const [isDrivePickerVisible, setIsDrivePickerVisible] = useState(false);
  const [driveFileSearch, setDriveFileSearch] = useState("");
  const [driveFiles, setDriveFiles] = useState<DriveFileSummary[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [drivePickerError, setDrivePickerError] = useState<string | null>(null);
  const [isPickingAttachment, setIsPickingAttachment] = useState(false);
  const [isPreparingAttachment, setIsPreparingAttachment] = useState(false);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [approvedAudioSaveCandidate, setApprovedAudioSaveCandidate] =
    useState<ApprovedVoiceRecognitionEvent | null>(null);
  const [approvedAudioSavePurpose, setApprovedAudioSavePurpose] = useState("");
  const [approvedAudioSaveError, setApprovedAudioSaveError] =
    useState<string | null>(null);
  const [isSavingApprovedAudio, setIsSavingApprovedAudio] = useState(false);
  const hasStartedRecording = useRef(false);
  const voiceInputCanSubmitRef = useRef(false);
  const realtimeVoiceModeRef = useRef(false);
  const textInputRef = useRef<TextInput>(null);
  const colorScheme = useColorScheme();

  const backgroundColor = colorScheme === "dark" ? "#2c2c2e" : "#f5f5f5";
  const textColor = useThemeColor({}, "text");
  const caseColor = useThemeColor({}, "symbolColor");
  const placeholderColor = colorScheme === "dark" ? "#636366" : "#8e8e93";

  // TTS toggle state and hook
  const [isTTSEnabled, setIsTTSEnabled] = useState(false);
  const [isTTSButtonToggled, setIsTTSButtonToggled] = useState(false);
  const prevMessageRef = useRef<string | undefined>(undefined);
  const {
    isSpeaking,
    speak,
    stop: stopSpeaking,
  } = useTextToSpeech({
    language: "ko-KR",
    pitch: 1.0,
    rate: 1.0,
    openAIVoice: OPENAI_TTS_VOICE,
    synthesizeSpeech: chatService.synthesizeSpeech?.bind(chatService),
  });

  const clearApprovedAudioSaveFlow = useCallback(() => {
    setApprovedAudioSaveCandidate(null);
    setApprovedAudioSavePurpose("");
    setApprovedAudioSaveError(null);
    setIsSavingApprovedAudio(false);
  }, []);

  const releaseApprovedAudioSaveFlow = useCallback(
    (reason: ApprovedSpeechAudioReleaseReason) => {
      approvedAudioSaveCandidate?.releaseCapturedAudio(reason);
      clearApprovedAudioSaveFlow();
    },
    [approvedAudioSaveCandidate, clearApprovedAudioSaveFlow],
  );

  const handleRealtimeUserTranscript = useCallback(
    (transcript: string) => {
      onLocalMessage?.(transcript, "user");
    },
    [onLocalMessage],
  );

  const handleRealtimeAssistantTranscript = useCallback(
    (transcript: string) => {
      onLocalMessage?.(transcript, "assistant");
    },
    [onLocalMessage],
  );

  const {
    state: realtimeState,
    isConnecting: isRealtimeConnecting,
    isActive: isRealtimeVoiceMode,
    start: startRealtimeConversation,
    stop: stopRealtimeConversation,
  } = useOpenAIRealtimeConversation({
    createRealtimeCall: chatService.createRealtimeCall?.bind(chatService),
    onUserTranscript: handleRealtimeUserTranscript,
    onAssistantTranscript: handleRealtimeAssistantTranscript,
  });

  // Auto-speak new assistant responses when TTS is enabled
  useEffect(() => {
    if (
      isTTSEnabled &&
      lastAssistantMessage &&
      lastAssistantMessage !== prevMessageRef.current
    ) {
      speak(lastAssistantMessage);
    }
    prevMessageRef.current = lastAssistantMessage;
  }, [isTTSEnabled, lastAssistantMessage, speak]);

  // Voice input hook for right button long-press
  const {
    state: voiceState,
    isRecording,
    isProcessing,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceInput({
    onTranscript: (transcript) => {
      if (!voiceInputCanSubmitRef.current) {
        setText("");
        setIsVoiceMode(false);
        clearApprovedAudioSaveFlow();
        return;
      }
      voiceInputCanSubmitRef.current = false;
      clearApprovedAudioSaveFlow();
      setText(transcript);
      if (transcript.trim()) {
        const sendResult = onSend(transcript);
        void Promise.resolve(sendResult).catch(() => undefined);
        setText("");
      }
      setIsVoiceMode(false);
    },
    locale: "ko-KR",
    silenceTimeout: DEFAULT_VOICE_INPUT_SILENCE_TIMEOUT_MS,
    active: isVoiceMode,
    requireApprovedVoiceGate: true,
  });

  const startRealtimeVoiceMode = useCallback(
    async (
      activationSource: "approved_voice" | "wake_word" | "manual",
      safetyIdentifier?: string,
    ) => {
      if (isSpeaking) {
        stopSpeaking();
      }

      hasStartedRecording.current = false;
      voiceInputCanSubmitRef.current = false;
      setIsTTSEnabled(false);
      setIsTTSButtonToggled(false);
      setIsVoiceMode(true);
      textInputRef.current?.blur();

      const started = await startRealtimeConversation({
        activationSource,
        ...(safetyIdentifier ? { safetyIdentifier } : {}),
      });
      realtimeVoiceModeRef.current = started;
      if (!started) {
        setIsVoiceMode(false);
      }

      return started;
    },
    [isSpeaking, startRealtimeConversation, stopSpeaking],
  );

  const canListenForVoiceActivation =
    !disabled &&
    !isVoiceMode &&
    !isRecording &&
    !isProcessing &&
    !isSpeaking &&
    !isPickingAttachment &&
    !isPreparingAttachment;
  const approvedVoiceGateEnabled =
    approvedVoiceCount > 0 && canListenForVoiceActivation;
  const wakeWordFallbackEnabled =
    Platform.OS !== "web" &&
    approvedVoiceCount === 0 &&
    approvedVoiceProfileRuntimeStatus !== "loading" &&
    canListenForVoiceActivation;

  // Track when recording actually starts
  useEffect(() => {
    if (isRecording) {
      hasStartedRecording.current = true;
    }
  }, [isRecording]);

  // Reset voice mode only after recording has started and then returned to idle
  useEffect(() => {
    if (
      isVoiceMode &&
      hasStartedRecording.current &&
      voiceState === "idle" &&
      !isRecording &&
      !isProcessing
    ) {
      setIsVoiceMode(false);
      hasStartedRecording.current = false;
      voiceInputCanSubmitRef.current = false;
      clearApprovedAudioSaveFlow();
    }
  }, [
    isVoiceMode,
    voiceState,
    isRecording,
    isProcessing,
    clearApprovedAudioSaveFlow,
  ]);

  useEffect(() => {
    if (
      realtimeVoiceModeRef.current &&
      !isRealtimeVoiceMode &&
      (realtimeState === "idle" ||
        realtimeState === "error" ||
        realtimeState === "unavailable")
    ) {
      realtimeVoiceModeRef.current = false;
      setIsVoiceMode(false);
      voiceInputCanSubmitRef.current = false;
      releaseApprovedAudioSaveFlow(
        realtimeState === "idle" ? "processing_complete" : "processing_error",
      );
    }
  }, [isRealtimeVoiceMode, realtimeState, releaseApprovedAudioSaveFlow]);

  // Approved voice detection starts voice input without requiring a wake word.
  const handleApprovedVoiceDetected = useCallback(async (
    result: ApprovedVoiceRecognitionEvent,
  ) => {
    releaseApprovedAudioSaveFlow("processing_replaced");
    const realtimeStarted = await startRealtimeVoiceMode(
      "approved_voice",
      result.matchedVoiceId,
    );
    if (realtimeStarted) {
      setApprovedAudioSaveCandidate(result);
      setApprovedAudioSavePurpose("");
      setApprovedAudioSaveError(null);
      setIsSavingApprovedAudio(false);

      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {
          // Voice processing has already started; haptics must stay off the path.
        });
      }
      return;
    }

    hasStartedRecording.current = false;
    voiceInputCanSubmitRef.current = true;
    setApprovedAudioSaveCandidate(result);
    setApprovedAudioSavePurpose("");
    setApprovedAudioSaveError(null);
    setIsSavingApprovedAudio(false);
    setIsVoiceMode(true);
    textInputRef.current?.blur();

    const started = await startRecording({
      approvedVoiceGateAccepted: true,
      approvedVoiceMatchedVoiceId: result.matchedVoiceId,
      approvedVoiceRecognizedAtMs: result.recognizedAtMs,
      approvedVoiceDownstreamAuthorization: result.downstreamAuthorization,
      approvedSpeechAudioSegment: result.approvedSpeechAudioSegment,
      approvedSpeechProcessingAudioSource:
        result.approvedSpeechProcessingAudioSource,
      releaseCapturedAudio: result.releaseCapturedAudio,
    });
    if (!started) {
      voiceInputCanSubmitRef.current = false;
      setIsVoiceMode(false);
      clearApprovedAudioSaveFlow();
      return;
    }

    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {
        // Voice processing has already started; haptics must stay off the path.
      });
    }

    setIsTTSEnabled(true);
  }, [
    startRecording,
    clearApprovedAudioSaveFlow,
    releaseApprovedAudioSaveFlow,
    startRealtimeVoiceMode,
  ]);

  const handleWakeWordDetected = useCallback(async () => {
    if (!wakeWordFallbackEnabled) return;

    releaseApprovedAudioSaveFlow("processing_replaced");
    const realtimeStarted = await startRealtimeVoiceMode("wake_word");
    if (realtimeStarted) {
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {
          // Voice processing has already started; haptics must stay off the path.
        });
      }
      return;
    }

    hasStartedRecording.current = false;
    voiceInputCanSubmitRef.current = true;
    setIsVoiceMode(true);
    textInputRef.current?.blur();

    const started = await startRecording({
      approvedVoiceGateRequired: false,
      silenceTimeout: WAKE_WORD_VOICE_INPUT_SILENCE_TIMEOUT_MS,
    });
    if (!started) {
      voiceInputCanSubmitRef.current = false;
      setIsVoiceMode(false);
      clearApprovedAudioSaveFlow();
      return;
    }

    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {
        // Voice processing has already started; haptics must stay off the path.
      });
    }

    setIsTTSEnabled(true);
  }, [
    wakeWordFallbackEnabled,
    startRecording,
    clearApprovedAudioSaveFlow,
    releaseApprovedAudioSaveFlow,
    startRealtimeVoiceMode,
  ]);

  useApprovedVoiceGate({
    enabled: approvedVoiceGateEnabled,
    onApprovedVoiceDetected: handleApprovedVoiceDetected,
  });

  useWakeWord({
    enabled: wakeWordFallbackEnabled,
    onDetected: handleWakeWordDetected,
  });

  // Pulse animation for send button in voice mode
  const scale = useSharedValue(1);

  useEffect(() => {
    if (isRecording || isRealtimeVoiceMode || isRealtimeConnecting) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 500 }),
          withTiming(0.95, { duration: 500 }),
        ),
        -1,
        true,
      );
    } else {
      scale.value = withTiming(1, { duration: 200 });
    }
  }, [isRecording, isRealtimeConnecting, isRealtimeVoiceMode]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));


  // --- TTS toggle (left button) ---
  const handleTTSToggle = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    if (isTTSEnabled) {
      setIsTTSButtonToggled(false);
      setIsTTSEnabled(false);
      stopSpeaking();
    } else {
      setIsTTSButtonToggled(true);
      setIsTTSEnabled(true);
    }
  };

  // --- Send button (right) ---
  const handleSend = async () => {
    const messageText = text.trim();
    if (
      !messageText ||
      disabled ||
      isVoiceMode ||
      isPreparingAttachment ||
      attachmentError
    ) {
      return;
    }

    let attachments: ChatAttachmentRequest[] | undefined;

    if (selectedDriveFileAttachment) {
      attachments = [selectedDriveFileAttachment];
    } else if (selectedImageAttachment) {
      const validation = validateSelectedImageAttachmentSize(
        selectedImageAttachment.sizeBytes,
      );

      if (!validation.accepted) {
        setSelectedImageAttachment(null);
        setAttachmentError(
          getImageAttachmentSizeValidationErrorMessage(validation),
        );
        return;
      }

      setIsPreparingAttachment(true);
      try {
        const filePayload = await new File(selectedImageAttachment.uri).base64();
        if (!filePayload.trim()) {
          throw new Error("empty image payload");
        }

        const preparedImagePayload =
          normalizePreparedImageAttachmentPayload(filePayload);
        if (!preparedImagePayload.accepted) {
          setSelectedImageAttachment(null);
          setAttachmentError(
            getPreparedImageAttachmentPayloadErrorMessage(
              preparedImagePayload,
            ),
          );
          return;
        }

        attachments = [
          {
            type: "image",
            mimeType: preparedImagePayload.mimeType,
            contentType: preparedImagePayload.mimeType,
            dataBase64: preparedImagePayload.dataBase64,
            file: preparedImagePayload.dataBase64,
            encoding: "base64",
            imageSource: selectedImageAttachment.uri,
            name: selectedImageAttachment.name,
            sizeBytes: preparedImagePayload.sizeBytes,
            source: selectedImageAttachment.source,
          },
        ];
      } catch {
        setSelectedImageAttachment(null);
        setAttachmentError("첨부 이미지를 읽을 수 없습니다.");
        return;
      } finally {
        setIsPreparingAttachment(false);
      }
    }

    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const sendResult = onSend(
      messageText,
      attachments ? { attachments } : undefined,
    );
    void Promise.resolve(sendResult).catch(() => undefined);
    setText("");
    setSelectedImageAttachment(null);
    setSelectedDriveFileAttachment(null);
    setAttachmentError(null);
  };

  const handleApprovedAudioSavePurposeChange = useCallback(
    (purpose: string) => {
      setApprovedAudioSavePurpose(purpose);
      if (approvedAudioSaveError) {
        setApprovedAudioSaveError(null);
      }
    },
    [approvedAudioSaveError],
  );

  const handleSaveApprovedAudio = useCallback(() => {
    if (!approvedAudioSaveCandidate || isSavingApprovedAudio) {
      return;
    }

    if (!approvedAudioSavePurpose.trim()) {
      setApprovedAudioSaveError(
        APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_EMPTY_PURPOSE_ERROR,
      );
      return;
    }

    setIsSavingApprovedAudio(true);
    try {
      saveApprovedAudioForUserVisibleLaterUse(approvedAudioSaveCandidate, {
        userVisiblePurpose: approvedAudioSavePurpose,
        requestedAtMs: Date.now(),
      });
      clearApprovedAudioSaveFlow();
    } catch (error) {
      setApprovedAudioSaveError(
        error instanceof Error
          ? error.message
          : "Captured audio could not be saved.",
      );
    } finally {
      setIsSavingApprovedAudio(false);
    }
  }, [
    approvedAudioSaveCandidate,
    approvedAudioSavePurpose,
    isSavingApprovedAudio,
    clearApprovedAudioSaveFlow,
  ]);

  const handleDismissApprovedAudioSave = useCallback(() => {
    approvedAudioSaveCandidate?.releaseCapturedAudio("processing_cancelled");
    clearApprovedAudioSaveFlow();
  }, [approvedAudioSaveCandidate, clearApprovedAudioSaveFlow]);

  const handleLongPressStart = async () => {
    if (disabled || isVoiceMode || isRecording || isProcessing) {
      return;
    }

    releaseApprovedAudioSaveFlow("processing_replaced");
    const realtimeStarted = await startRealtimeVoiceMode("manual");
    if (realtimeStarted) {
      if (Platform.OS !== "web") {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {
          // Realtime voice has already started; haptics must stay off the path.
        });
      }
      return;
    }

    voiceInputCanSubmitRef.current = true;
    hasStartedRecording.current = false;
    setIsVoiceMode(true);
    textInputRef.current?.blur();

    const started = await startRecording({
      approvedVoiceGateRequired: false,
    });
    if (!started) {
      setIsVoiceMode(false);
      clearApprovedAudioSaveFlow();
      voiceInputCanSubmitRef.current = false;
      return;
    }
  };

  const handleStopVoiceInput = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await stopRecording();
  };

  const handleStopRealtimeVoiceInput = async () => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    realtimeVoiceModeRef.current = false;
    await stopRealtimeConversation();
    setIsVoiceMode(false);
    voiceInputCanSubmitRef.current = false;
    releaseApprovedAudioSaveFlow("processing_complete");
  };

  const handleTextInputFocus = () => {
    if (isRealtimeVoiceMode) {
      void handleStopRealtimeVoiceInput();
      return;
    }

    if (isRecording) {
      cancelRecording();
      setIsVoiceMode(false);
      voiceInputCanSubmitRef.current = false;
      clearApprovedAudioSaveFlow();
    }
  };

  const handlePickImageAttachment = async () => {
    setIsAttachmentMenuVisible(false);
    if (
      disabled ||
      isVoiceMode ||
      isRecording ||
      isProcessing ||
      isPickingAttachment ||
      isPreparingAttachment
    ) {
      return;
    }

    if (Platform.OS !== "android") {
      setSelectedImageAttachment(null);
      setAttachmentError("JPEG/PNG 첨부는 Android 파일 선택기에서 지원됩니다.");
      return;
    }

    setAttachmentError(null);
    setIsPickingAttachment(true);

    try {
      const pickedFileResult = await File.pickFileAsync(
        undefined,
        CHAT_IMAGE_ATTACHMENT_PICKER_MIME_TYPE,
      );
      const pickedFile = Array.isArray(pickedFileResult)
        ? pickedFileResult[0]
        : pickedFileResult;

      if (!pickedFile) return;

      const selection = createSelectedImageAttachmentFromPickedFile(pickedFile);
      if (!selection.accepted) {
        const rejectionState =
          getRejectedImageAttachmentSelectionStateUpdate(selection);
        setSelectedImageAttachment(rejectionState.selectedImageAttachment);
        setAttachmentError(rejectionState.attachmentError);
        return;
      }

      const decodeValidation = await validateSelectedImageAttachmentDecodable(
        selection.attachment.uri,
        decodeSelectedImageAttachment,
      );
      if (!decodeValidation.accepted) {
        setSelectedImageAttachment(null);
        setAttachmentError(CHAT_IMAGE_ATTACHMENT_NON_DECODABLE_MESSAGE);
        return;
      }

      setSelectedImageAttachment(selection.attachment);
      setSelectedDriveFileAttachment(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.toLowerCase().includes("cancelled")) return;

      setSelectedImageAttachment(null);
      setAttachmentError("JPEG 또는 PNG 이미지를 선택할 수 없습니다.");
    } finally {
      setIsPickingAttachment(false);
    }
  };

  const loadDriveFiles = useCallback(async (query = driveFileSearch) => {
    setIsLoadingDriveFiles(true);
    setDrivePickerError(null);
    try {
      const response = await chatService.listDriveFiles(query);
      setDriveFiles(response.files);
    } catch {
      setDrivePickerError("Google Drive 파일 목록을 불러올 수 없습니다.");
    } finally {
      setIsLoadingDriveFiles(false);
    }
  }, [driveFileSearch]);

  const handleOpenDrivePicker = useCallback(() => {
    setIsAttachmentMenuVisible(false);
    setIsDrivePickerVisible(true);
    void loadDriveFiles("");
  }, [loadDriveFiles]);

  const handleSelectDriveFile = useCallback((file: DriveFileSummary) => {
    setSelectedDriveFileAttachment({
      type: "drive-file",
      driveFileId: file.driveFileId || file.id,
      name: file.name,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      source: "google-drive",
    });
    setSelectedImageAttachment(null);
    setAttachmentError(null);
    setIsDrivePickerVisible(false);
  }, []);

  const canPickAttachment =
    !disabled &&
    !isVoiceMode &&
    !isRecording &&
    !isProcessing &&
    !isPickingAttachment &&
    !isPreparingAttachment;
  const selectedImageAttachmentCanSend =
    !selectedImageAttachment ||
    validateSelectedImageAttachmentSize(selectedImageAttachment.sizeBytes)
      .accepted;
  const canSend =
    text.trim().length > 0 &&
    !disabled &&
    !isVoiceMode &&
    !isPreparingAttachment &&
    !attachmentError &&
    selectedImageAttachmentCanSend;

  return (
    <View style={[styles.container, { paddingBottom: 8 }]}>
        <Modal
          transparent
          visible={isAttachmentMenuVisible}
          animationType="fade"
          onRequestClose={() => setIsAttachmentMenuVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.attachmentMenu, { backgroundColor }]}>
              <TouchableOpacity
                style={styles.attachmentMenuButton}
                onPress={handlePickImageAttachment}
              >
                <IconSymbol name="paperclip" size={18} color={caseColor} />
                <Text style={[styles.attachmentMenuText, { color: textColor }]}>
                  로컬 이미지
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachmentMenuButton}
                onPress={handleOpenDrivePicker}
              >
                <IconSymbol name="square.and.arrow.down.fill" size={18} color={caseColor} />
                <Text style={[styles.attachmentMenuText, { color: textColor }]}>
                  Google Drive
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.attachmentMenuCancel}
                onPress={() => setIsAttachmentMenuVisible(false)}
              >
                <Text style={[styles.attachmentMenuText, { color: placeholderColor }]}>
                  취소
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
        <Modal
          visible={isDrivePickerVisible}
          animationType="slide"
          onRequestClose={() => setIsDrivePickerVisible(false)}
        >
          <View style={[styles.drivePickerContainer, { backgroundColor }]}>
            <View style={styles.drivePickerHeader}>
              <TextInput
                style={[styles.driveSearchInput, { color: textColor }]}
                value={driveFileSearch}
                onChangeText={setDriveFileSearch}
                placeholder="Drive 파일 검색"
                placeholderTextColor={placeholderColor}
                returnKeyType="search"
                onSubmitEditing={() => loadDriveFiles(driveFileSearch)}
              />
              <TouchableOpacity
                style={styles.driveHeaderButton}
                onPress={() => loadDriveFiles(driveFileSearch)}
                disabled={isLoadingDriveFiles}
              >
                {isLoadingDriveFiles ? (
                  <ActivityIndicator size="small" color={caseColor} />
                ) : (
                  <IconSymbol name="chevron.right" size={20} color={caseColor} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.driveHeaderButton}
                onPress={() => setIsDrivePickerVisible(false)}
              >
                <IconSymbol name="xmark.circle.fill" size={20} color={placeholderColor} />
              </TouchableOpacity>
            </View>
            {drivePickerError && (
              <Text style={styles.attachmentError}>{drivePickerError}</Text>
            )}
            <FlatList
              data={driveFiles}
              keyExtractor={(item) => item.driveFileId || item.id}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.driveFileRow}
                  onPress={() => handleSelectDriveFile(item)}
                >
                  <IconSymbol name="paperclip" size={18} color={caseColor} />
                  <View style={styles.driveFileTextGroup}>
                    <Text
                      style={[styles.driveFileName, { color: textColor }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text style={[styles.driveFileMeta, { color: placeholderColor }]}>
                      {item.mimeType}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                isLoadingDriveFiles ? null : (
                  <Text style={[styles.driveEmptyText, { color: placeholderColor }]}>
                    표시할 Drive 파일이 없습니다.
                  </Text>
                )
              }
            />
          </View>
        </Modal>
        {approvedAudioSaveCandidate && (
          <ApprovedAudioSavePrompt
            laterUsePurpose={approvedAudioSavePurpose}
            matchedVoiceId={approvedAudioSaveCandidate.matchedVoiceId}
            matchedApprovedVoiceProfileId={
              approvedAudioSaveCandidate.matchedApprovedVoiceProfileId
            }
            matchedApprovedVoiceLabel={
              approvedAudioSaveCandidate.matchedApprovedVoiceLabel
            }
            disabled={Boolean(disabled) || !isVoiceMode}
            isSaving={isSavingApprovedAudio}
            error={approvedAudioSaveError}
            onLaterUsePurposeChange={handleApprovedAudioSavePurposeChange}
            onSave={handleSaveApprovedAudio}
            onDismiss={handleDismissApprovedAudioSave}
          />
        )}
        {(selectedImageAttachment || selectedDriveFileAttachment || attachmentError) && (
          <View style={styles.attachmentStatusRow}>
            {(selectedImageAttachment || selectedDriveFileAttachment) && (
              <View style={styles.attachmentChip}>
                <IconSymbol name="paperclip" size={16} color={caseColor} />
                <Text
                  style={[styles.attachmentText, { color: textColor }]}
                  numberOfLines={1}
                >
                  {selectedImageAttachment?.name ||
                    selectedDriveFileAttachment?.name}
                </Text>
                <TouchableOpacity
                  style={styles.removeAttachmentButton}
                  onPress={() => {
                    setSelectedImageAttachment(null);
                    setSelectedDriveFileAttachment(null);
                    setAttachmentError(null);
                  }}
                  accessibilityLabel="첨부 파일 제거"
                >
                  <IconSymbol
                    name="xmark.circle.fill"
                    size={16}
                    color={placeholderColor}
                  />
                </TouchableOpacity>
              </View>
            )}
            {attachmentError && (
              <>
                <Text
                  style={styles.attachmentError}
                  accessibilityRole="alert"
                  accessibilityLiveRegion="polite"
                >
                  {attachmentError}
                </Text>
                <TouchableOpacity
                  style={styles.clearAttachmentErrorButton}
                  onPress={() => setAttachmentError(null)}
                  accessibilityLabel="첨부 오류 지우기"
                >
                  <IconSymbol
                    name="xmark.circle.fill"
                    size={16}
                    color={placeholderColor}
                  />
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
        <View style={[styles.inputContainer, { backgroundColor }]}>
          {/* TTS toggle button (left) */}
          <TouchableOpacity
            style={[
              styles.voiceButton,
              {
                backgroundColor: isTTSButtonToggled ? "#4A90D9" : "#e9e9e9",
              },
            ]}
            onPress={handleTTSToggle}
            accessibilityLabel={
              isTTSButtonToggled ? "음성 출력 끄기" : "음성 출력 켜기"
            }
          >
            <IconSymbol
              name={
                isTTSButtonToggled
                  ? "speaker.wave.2.fill"
                  : "speaker.slash.fill"
              }
              size={20}
              color={isTTSButtonToggled ? "#FFFFFF" : placeholderColor}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.attachmentButton,
              {
                backgroundColor:
                  selectedImageAttachment || selectedDriveFileAttachment
                    ? "#dbeafe"
                    : "#e9e9e9",
                opacity: canPickAttachment ? 1 : 0.45,
              },
            ]}
            onPress={() => setIsAttachmentMenuVisible(true)}
            disabled={!canPickAttachment}
            accessibilityLabel="파일 첨부"
          >
            {isPickingAttachment ? (
              <ActivityIndicator size="small" color={caseColor} />
            ) : (
              <IconSymbol name="paperclip" size={20} color={caseColor} />
            )}
          </TouchableOpacity>

          <TextInput
            ref={textInputRef}
            style={[styles.input, { color: textColor }]}
            value={text}
            onChangeText={setText}
            onFocus={handleTextInputFocus}
            placeholderTextColor={placeholderColor}
            multiline
            maxLength={4000}
            editable={
              !disabled &&
              !isRecording &&
              !isProcessing &&
              !isRealtimeVoiceMode &&
              !isRealtimeConnecting
            }
            onSubmitEditing={handleSend}
            blurOnSubmit={false}
          />

          {/* Send / Voice input button (right) */}
          <Animated.View style={isVoiceMode ? animatedStyle : undefined}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                {
                  backgroundColor: isVoiceMode
                    ? "gray"
                    : canSend
                      ? caseColor
                      : "transparent",
                },
              ]}
              onPress={
                isRealtimeVoiceMode || isRealtimeConnecting
                  ? handleStopRealtimeVoiceInput
                  : isVoiceMode
                    ? handleStopVoiceInput
                    : handleSend
              }
              onLongPress={handleLongPressStart}
              delayLongPress={3000}
              disabled={false}
              accessibilityLabel={
                isVoiceMode ? "음성 입력 중지" : "메시지 보내기"
              }
            >
              {isProcessing || isPreparingAttachment || isRealtimeConnecting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <IconSymbol
                  name={isVoiceMode ? "mic.fill" : "arrow.up"}
                  size={20}
                  color={
                    isVoiceMode ? "#fff" : canSend ? "#fff" : placeholderColor
                  }
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 9,
    paddingVertical: 4,
    minHeight: 44,
  },
  voiceButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: -8,
    marginBottom: 2,
  },
  attachmentButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
    marginBottom: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    maxHeight: 120,
    paddingVertical: 8,
    paddingLeft: 10,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    marginBottom: 3,
  },
  attachmentStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  attachmentChip: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "86%",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
  },
  attachmentText: {
    flexShrink: 1,
    marginLeft: 5,
    fontSize: 13,
    lineHeight: 16,
  },
  removeAttachmentButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
    backgroundColor: "rgba(0, 0, 0, 0.12)",
  },
  attachmentError: {
    color: "#ff4444",
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
  },
  clearAttachmentErrorButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    padding: 16,
  },
  attachmentMenu: {
    borderRadius: 16,
    padding: 8,
  },
  attachmentMenuButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 10,
  },
  attachmentMenuCancel: {
    minHeight: 42,
    alignItems: "center",
    justifyContent: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(142, 142, 147, 0.35)",
  },
  attachmentMenuText: {
    fontSize: 15,
    lineHeight: 20,
  },
  drivePickerContainer: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 48,
  },
  drivePickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  driveSearchInput: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(142, 142, 147, 0.14)",
    fontSize: 15,
  },
  driveHeaderButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(142, 142, 147, 0.14)",
  },
  driveFileRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(142, 142, 147, 0.25)",
  },
  driveFileTextGroup: {
    flex: 1,
  },
  driveFileName: {
    fontSize: 15,
    lineHeight: 20,
  },
  driveFileMeta: {
    fontSize: 12,
    lineHeight: 16,
  },
  driveEmptyText: {
    marginTop: 24,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18,
  },
});
