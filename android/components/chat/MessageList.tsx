import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Message } from '@/types/chat';
import React, { useRef } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  isLoading: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const flatListRef = useRef<FlatList>(null);
  const tintColor = useThemeColor({}, 'tint');

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
        <ActivityIndicator size="small" color={tintColor} />
      </View>
    );
  };

  return (
    <FlatList
      ref={flatListRef}
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
  contentContainer: {
    flexGrow: 1,
    paddingVertical: 16,
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
    paddingVertical: 16,
    alignItems: 'center',
  },
});
