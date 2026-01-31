import { ThemedText } from '@/components/themed-text';
import { Message } from '@/types/chat';
import React, { useRef } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { TypingIndicator } from '../ui/TypingIndicator';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);
  // const tintColor = useThemeColor({}, 'tint');

  const renderItem = ({ item }: { item: Message }) => <MessageBubble message={item} />;

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <ThemedText style={styles.emptyText}>대화를 시작하세요</ThemedText>
    </View>
  );

  const renderFooter = () => {
    if (!isLoading) return null;
    return (
      <View style={styles.loadingContainer}>
        <TypingIndicator />
      </View>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
      style={styles.container}
      data={messages}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      contentContainerStyle={[
        styles.contentContainer,
        messages.length === 0 && styles.emptyContentContainer,
      ]}
      onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={renderFooter}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    paddingVertical: 8,
    justifyContent: 'flex-end',
  },
  emptyContentContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
  },
  emptyText: {
    opacity: 0.5,
    fontSize: 16,
  },
  loadingContainer: {
    paddingVertical: 8,
    alignItems: 'flex-start', // Align loading to the left like an incoming message
  },
});
