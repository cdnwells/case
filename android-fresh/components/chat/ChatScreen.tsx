import { ThemedView } from '@/components/themed-view';
import { useChat } from '@/hooks/useChat';
import React from 'react';
import { StyleSheet } from 'react-native';
import { KeyboardProvider, KeyboardStickyView } from 'react-native-keyboard-controller';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';

export function ChatScreen() {
  const { messages, isLoading, sendMessage } = useChat();

  return (
    <ThemedView style={styles.container}>
      <KeyboardProvider>
        <KeyboardStickyView style={styles.keyboardView} offset={{ opened: 50, closed: 0 }}>
          <MessageList messages={messages} isLoading={isLoading} />
          <ChatInput onSend={sendMessage} disabled={isLoading} />
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
});
