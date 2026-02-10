import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Message } from '@/types/chat';
import React, { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, StyleSheet, View } from 'react-native';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const isUser = message.role === 'user';
  const userBubbleColor = useThemeColor({}, 'userBubble');
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const backgroundColor = isUser ? userBubbleColor : 'transparent';

  const textColor = isUser ? '#fff' : colorScheme === 'dark' ? '#fff' : '#000';

  return (
    <Animated.View style={[
      styles.container, 
      isUser ? styles.userContainer : styles.assistantContainer,
      { opacity: fadeAnim }
    ]}>
      <View style={[styles.bubble, { backgroundColor }]}>
        <ThemedText style={[styles.text, { color: textColor }]}>{message.content}</ThemedText>
        {message.status === 'error' && (
          <ThemedText style={styles.errorStatus}>Failed to send</ThemedText>
        )}
        {message.hasCommands && (
          <View style={styles.commandIndicator}>
            {message.executionStatus === 'queued' && (
              <>
                <ActivityIndicator size="small" color={textColor} />
                <ThemedText style={[styles.commandText, { color: textColor }]}>명령 대기 중...</ThemedText>
              </>
            )}
            {message.executionStatus === 'executing' && (
              <>
                <ActivityIndicator size="small" color={textColor} />
                <ThemedText style={[styles.commandText, { color: textColor }]}>명령 실행 중...</ThemedText>
              </>
            )}
            {message.executionStatus === 'completed' && (
              <ThemedText style={[styles.commandText, { color: textColor }]}>✓ 명령 실행 완료</ThemedText>
            )}
            {message.executionStatus === 'failed' && (
              <ThemedText style={[styles.commandText, { color: '#ff4444' }]}>✗ 명령 실행 실패</ThemedText>
            )}
          </View>
        )}
      </View>
    </Animated.View>
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
  commandIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  commandText: {
    fontSize: 12,
    opacity: 0.8,
  },
});
