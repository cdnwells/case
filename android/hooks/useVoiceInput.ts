import { useEffect, useRef, useState, useCallback } from 'react';
import Voice from '@react-native-voice/voice';
import { Platform, Alert, PermissionsAndroid } from 'react-native';

type VoiceState = 'idle' | 'recording' | 'processing' | 'error';

interface UseVoiceInputOptions {
  onTranscript: (text: string) => void;
  locale?: string;
  silenceTimeout?: number;
}

interface UseVoiceInputReturn {
  state: VoiceState;
  error: string | null;
  isRecording: boolean;
  isProcessing: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  cancelRecording: () => Promise<void>;
}

export function useVoiceInput({
  onTranscript,
  locale = 'ko-KR',
  silenceTimeout = 4000,
}: UseVoiceInputOptions): UseVoiceInputReturn {
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number | null>(null);
  const currentTranscriptRef = useRef<string>('');

  // Clear silence timer
  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  // Start silence detection timer
  const startSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    lastSpeechTimeRef.current = Date.now();

    const checkSilence = () => {
      const now = Date.now();
      const timeSinceLastSpeech = lastSpeechTimeRef.current
        ? now - lastSpeechTimeRef.current
        : 0;

      if (timeSinceLastSpeech >= silenceTimeout) {
        stopRecording();
      } else {
        silenceTimerRef.current = setTimeout(checkSilence, 500);
      }
    };

    silenceTimerRef.current = setTimeout(checkSilence, 500);
  }, [silenceTimeout]);

  const stopRecording = useCallback(async () => {
    try {
      clearSilenceTimer();
      setState('processing');
      await Voice.stop();

      // Small delay to ensure transcript is captured
      setTimeout(() => {
        const transcript = currentTranscriptRef.current;
        if (transcript.trim()) {
          onTranscript(transcript);
        }
        setState('idle');
        currentTranscriptRef.current = '';
      }, 300);
    } catch (error) {
      console.error('Failed to stop recording:', error);
      setState('error');
      setTimeout(() => setState('idle'), 1000);
    }
  }, [onTranscript, clearSilenceTimer]);

  // Initialize Voice listeners
  useEffect(() => {
    Voice.onSpeechStart = () => {
      setState('recording');
    };

    Voice.onSpeechEnd = () => {
      clearSilenceTimer();
    };

    Voice.onSpeechResults = (e) => {
      if (e.value && e.value[0]) {
        currentTranscriptRef.current = e.value[0];
        lastSpeechTimeRef.current = Date.now();
      }
    };

    Voice.onSpeechError = (e) => {
      console.error('Speech error:', e);
      setState('error');
      setError(e.error?.message || 'Voice recognition failed');
      clearSilenceTimer();

      // Auto-reset to idle after 1s
      setTimeout(() => {
        setState('idle');
        setError(null);
      }, 1000);
    };

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
      clearSilenceTimer();
    };
  }, [clearSilenceTimer, stopRecording]);

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS !== 'android') {
      return true; // iOS permissions are handled via Info.plist
    }

    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: '마이크 권한 필요',
          message: '음성 인식을 위해 마이크 접근 권한이 필요합니다.',
          buttonNeutral: '나중에',
          buttonNegative: '거부',
          buttonPositive: '허용',
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        return true;
      } else {
        Alert.alert(
          '권한 거부됨',
          '음성 인식을 사용하려면 설정에서 마이크 권한을 허용해주세요.'
        );
        return false;
      }
    } catch (error) {
      console.error('Permission request error:', error);
      return false;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // First, request microphone permission
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        return;
      }

      // Check if voice recognition is available
      const isAvailable = await Voice.isAvailable();
      if (!isAvailable) {
        Alert.alert('음성 인식 불가', '이 기기에서는 음성 인식을 사용할 수 없습니다.');
        return;
      }

      currentTranscriptRef.current = '';
      await Voice.start(locale);
      setState('recording');
      startSilenceTimer();
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('오류', '음성 인식을 시작할 수 없습니다.');
    }
  }, [locale, startSilenceTimer, requestMicrophonePermission]);

  const cancelRecording = useCallback(async () => {
    try {
      clearSilenceTimer();
      await Voice.cancel();
      setState('idle');
      currentTranscriptRef.current = '';
    } catch (error) {
      console.error('Failed to cancel recording:', error);
    }
  }, [clearSilenceTimer]);

  return {
    state,
    error,
    isRecording: state === 'recording',
    isProcessing: state === 'processing',
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
