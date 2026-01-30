import React from 'react';
import { StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { useChat } from '@/hooks/useChat';

export function ChatScreen() {
  const { messages, isLoading, sendMessage } = useChat();

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <MessageList messages={messages} isLoading={isLoading} />
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </KeyboardAvoidingView>
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
