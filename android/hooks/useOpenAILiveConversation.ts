import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { chatService } from '@/services/api';
import { createLiveTransport } from '@/services/voice/liveTransport';
import { LiveConversation, type LiveCaption, type LiveState } from '@/services/voice/liveConversation';
import { openAIRealtimeService } from '@/services/voice/openAIRealtimeService';
import type { CreateLiveSessionRequest } from '@/services/api/types';

export function useOpenAILiveConversation({ onCaption }: { onCaption?: (caption: LiveCaption) => void } = {}) {
  const [state, setState] = useState<LiveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const callback = useRef(onCaption);
  callback.current = onCaption;
  const mounted = useRef(true);
  const instance = useRef<LiveConversation | null>(null);
  if (!instance.current) instance.current = new LiveConversation({
    createTransport: createLiveTransport,
    createSession: request => openAIRealtimeService.createSession(request),
    closeSession: () => openAIRealtimeService.closeSession(),
    delegate: (session, id, history, signal) => chatService.delegateLiveTask?.(session, id, history, signal)
      || Promise.resolve({ content: 'Please continue this task in text chat.' }),
    onState: (next, message) => { if (mounted.current) { setState(next); setError(message); } },
    onCaption: caption => { if (mounted.current) callback.current?.(caption); },
    log: code => console.warn('[Live voice]', code),
  });
  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener('change', state => {
      if (state === 'background') void instance.current?.stop();
    });
    return () => { mounted.current = false; listener.remove(); void instance.current?.stop(); };
  }, []);
  return {
    state, error,
    isConnecting: state === 'connecting',
    isActive: !['idle', 'error'].includes(state),
    start: (options: Omit<CreateLiveSessionRequest, 'sdp' | 'signal'>) => instance.current!.start(options),
    stop: () => instance.current!.stop(),
  };
}
