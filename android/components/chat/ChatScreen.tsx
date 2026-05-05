import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useChat } from '@/hooks/useChat';
import {
  deleteApprovedAudioRecord,
  useApprovedAudioRecordViews,
} from '@/hooks/useApprovedVoiceGate';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import {
  KeyboardProvider,
  KeyboardStickyView,
} from 'react-native-keyboard-controller';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';
import { SavedAudioRecordList } from './SavedAudioRecordList';

export function ChatScreen() {
  const { messages, isLoading, error, sendMessage, addLocalMessage } = useChat();
  const savedAudioRecords = useApprovedAudioRecordViews();
  const handleDeleteSavedAudioRecord = useCallback((clipId: string) => {
    deleteApprovedAudioRecord(clipId);
  }, []);

  const lastAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        return messages[i].content;
      }
    }
    return undefined;
  }, [messages]);

  return (
    <ThemedView style={styles.container}>
      <KeyboardProvider>
        <KeyboardStickyView
          style={styles.keyboardView}
          offset={{ opened: 50, closed: 0 }}
        >
          <MessageList messages={messages} isLoading={isLoading} />
          <SavedAudioRecordList
            records={savedAudioRecords}
            onDeleteRecording={handleDeleteSavedAudioRecord}
          />
          {error && (
            <ThemedView style={styles.errorBanner}>
              <ThemedText
                style={styles.errorText}
                accessibilityRole="alert"
                accessibilityLiveRegion="polite"
              >
                {error}
              </ThemedText>
            </ThemedView>
          )}
          <ChatInput
            onSend={sendMessage}
            disabled={isLoading}
            lastAssistantMessage={lastAssistantMessage}
            onLocalMessage={addLocalMessage}
          />
        </KeyboardStickyView>
      </KeyboardProvider>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  errorBanner: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 13,
    lineHeight: 18,
  },
});
