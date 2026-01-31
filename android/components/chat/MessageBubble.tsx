import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Message } from '@/types/chat';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const isUser = message.role === 'user';
  const userBubbleColor = useThemeColor({}, 'userBubble');
  // const assistantBubbleColor = useThemeColor({}, 'assistantBubble');

  const backgroundColor = isUser ? userBubbleColor : 'transparent';

  const textColor = isUser ? '#fff' : colorScheme === 'dark' ? '#fff' : '#000';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.bubble, { backgroundColor }]}>
        <ThemedText style={[styles.text, { color: textColor }]}>{message.content}</ThemedText>
        {message.status === 'error' && (
          <ThemedText style={styles.errorStatus}>Failed to send</ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 12,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
  },
  text: {
    fontSize: 16,
  },
  status: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 4,
  },
  errorStatus: {
    fontSize: 11,
    color: '#ff4444',
    marginTop: 4,
  },
});
