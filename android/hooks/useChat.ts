import { useState, useCallback } from 'react';
import { Message, ChatState } from '@/types/chat';
import { chatService } from '@/services/api';

export function useChat() {
  const [state, setState] = useState<ChatState>({
    messages: [],
    isLoading: false,
    error: null,
  });

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user_${Date.now()}`,
      content: content.trim(),
      role: 'user',
      timestamp: new Date(),
      status: 'sending',
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isLoading: true,
      error: null,
    }));

    try {
      const response = await chatService.sendMessage({ content: userMessage.content });

      setState(prev => ({
        ...prev,
        messages: prev.messages
          .map(msg => (msg.id === userMessage.id ? { ...msg, status: 'sent' as const } : msg))
          .concat(response.message),
        isLoading: false,
      }));
    } catch {
      setState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === userMessage.id ? { ...msg, status: 'error' as const } : msg
        ),
        isLoading: false,
        error: 'Failed to send message',
      }));
    }
  }, []);

  const clearMessages = useCallback(() => {
    setState({ messages: [], isLoading: false, error: null });
  }, []);

  return {
    ...state,
    sendMessage,
    clearMessages,
  };
}
