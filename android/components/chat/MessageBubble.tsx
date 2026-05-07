import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { chatService } from '@/services/api';
import { Message } from '@/types/chat';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Linking,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { getMessageUrlBadgeParts } from './messageUrlBadges';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const isUser = message.role === 'user';
  const userBubbleColor = useThemeColor({}, 'userBubble');
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [areHiddenBadgesVisible, setAreHiddenBadgesVisible] = useState(false);
  const [fileDownloadStatuses, setFileDownloadStatuses] = useState<
    Record<string, 'downloading' | 'downloaded' | 'failed'>
  >({});
  const messageParts = useMemo(
    () => getMessageUrlBadgeParts(message.content),
    [message.content],
  );
  const displayedBadges = useMemo(
    () =>
      areHiddenBadgesVisible
        ? messageParts.badges.flatMap((badge) =>
            badge.kind === 'overflow' ? badge.hiddenBadges || [] : [badge],
          )
        : messageParts.badges,
    [areHiddenBadgesVisible, messageParts.badges],
  );

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  useEffect(() => {
    setAreHiddenBadgesVisible(false);
    setFileDownloadStatuses({});
  }, [message.content]);

  const handleDownloadGeneratedFile = async (
    file: NonNullable<Message['generatedFiles']>[number],
  ) => {
    const fileId = file.driveFileId || file.id;
    setFileDownloadStatuses((current) => ({
      ...current,
      [fileId]: 'downloading',
    }));

    try {
      await chatService.downloadGeneratedFile(file);
      setFileDownloadStatuses((current) => ({
        ...current,
        [fileId]: 'downloaded',
      }));
    } catch {
      setFileDownloadStatuses((current) => ({
        ...current,
        [fileId]: 'failed',
      }));
    }
  };

  const backgroundColor = isUser ? userBubbleColor : 'transparent';

  const textColor = isUser ? '#fff' : colorScheme === 'dark' ? '#fff' : '#000';
  const assistantLinkBadgeColor =
    colorScheme === 'dark' ? '#2c2c2e' : '#F2F4F7';
  const assistantLinkBadgeBorderColor =
    colorScheme === 'dark' ? '#474C52' : '#D7DCE2';
  const linkBadgeColor = isUser
    ? '#fff'
    : colorScheme === 'dark'
      ? '#ECEDEE'
      : '#4A5568';

  return (
    <Animated.View style={[
      styles.container, 
      isUser ? styles.userContainer : styles.assistantContainer,
      { opacity: fadeAnim }
    ]}>
      <View style={[styles.bubble, { backgroundColor }]}>
        {messageParts.text.length > 0 && (
          <ThemedText style={[styles.text, { color: textColor }]}>
            {messageParts.text}
          </ThemedText>
        )}
        {displayedBadges.length > 0 && (
          <View style={styles.linkBadgeRow}>
            {displayedBadges.map((badge) => {
              if (badge.kind === 'overflow') {
                return (
                  <Pressable
                    key={badge.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Show ${
                      badge.omittedCount || 0
                    } hidden source badges`}
                    onPress={() => setAreHiddenBadgesVisible(true)}
                    style={({ pressed }) => [
                      styles.linkBadge,
                      styles.overflowLinkBadge,
                      isUser
                        ? styles.userLinkBadge
                        : {
                            backgroundColor: assistantLinkBadgeColor,
                            borderColor: assistantLinkBadgeBorderColor,
                          },
                      pressed && styles.pressedLinkBadge,
                    ]}
                  >
                    <ThemedText
                      numberOfLines={1}
                      style={[
                        styles.linkBadgeText,
                        styles.overflowLinkBadgeText,
                        { color: linkBadgeColor },
                      ]}
                    >
                      {badge.label}
                    </ThemedText>
                  </Pressable>
                );
              }

              if (badge.kind === 'tag') {
                return (
                  <View
                    key={badge.id}
                    accessibilityLabel={badge.label}
                    style={[
                      styles.linkBadge,
                      styles.sourceTagBadge,
                      isUser
                        ? styles.userLinkBadge
                        : {
                            backgroundColor: assistantLinkBadgeColor,
                            borderColor: assistantLinkBadgeBorderColor,
                          },
                    ]}
                  >
                    <ThemedText
                      numberOfLines={1}
                      style={[
                        styles.linkBadgeText,
                        styles.sourceTagBadgeText,
                        { color: linkBadgeColor },
                      ]}
                    >
                      {badge.label}
                    </ThemedText>
                  </View>
                );
              }

              if (badge.url) {
                return (
                  <Pressable
                    key={badge.id}
                    accessibilityRole="link"
                    accessibilityLabel={`Open ${badge.label}`}
                    onPress={() => {
                      if (badge.url) {
                        void Linking.openURL(badge.url);
                      }
                    }}
                    style={({ pressed }) => [
                      styles.linkBadge,
                      badge.kind === 'reference' && styles.referenceLinkBadge,
                      isUser
                        ? styles.userLinkBadge
                        : {
                            backgroundColor: assistantLinkBadgeColor,
                            borderColor:
                              badge.kind === 'reference'
                                ? linkBadgeColor
                                : assistantLinkBadgeBorderColor,
                          },
                      pressed && styles.pressedLinkBadge,
                    ]}
                  >
                    <IconSymbol name="link" size={13} color={linkBadgeColor} />
                    <ThemedText
                      numberOfLines={1}
                      style={[
                        styles.linkBadgeText,
                        { color: linkBadgeColor },
                      ]}
                    >
                      {badge.label}
                    </ThemedText>
                  </Pressable>
                );
              }

              return (
                <View
                  key={badge.id}
                  accessibilityLabel={badge.label}
                  style={[
                    styles.linkBadge,
                    badge.kind === 'reference' && styles.referenceLinkBadge,
                    isUser
                      ? styles.userLinkBadge
                      : {
                          backgroundColor: assistantLinkBadgeColor,
                          borderColor:
                            badge.kind === 'reference'
                              ? linkBadgeColor
                              : assistantLinkBadgeBorderColor,
                        },
                  ]}
                >
                  <ThemedText
                    numberOfLines={1}
                    style={[
                      styles.linkBadgeText,
                      { color: linkBadgeColor },
                    ]}
                  >
                    {badge.label}
                  </ThemedText>
                </View>
              );
            })}
          </View>
        )}
        {message.generatedFiles && message.generatedFiles.length > 0 && (
          <View style={styles.generatedFileRow}>
            {message.generatedFiles.map((file) => {
              const fileId = file.driveFileId || file.id;
              const downloadStatus = fileDownloadStatuses[fileId];
              return (
                <Pressable
                  key={fileId}
                  accessibilityRole="button"
                  accessibilityLabel={`Download ${file.name}`}
                  onPress={() => {
                    if (downloadStatus !== 'downloading') {
                      void handleDownloadGeneratedFile(file);
                    }
                  }}
                  style={({ pressed }) => [
                    styles.linkBadge,
                    styles.generatedFileBadge,
                    isUser
                      ? styles.userLinkBadge
                      : {
                          backgroundColor: assistantLinkBadgeColor,
                          borderColor: assistantLinkBadgeBorderColor,
                        },
                    pressed && styles.pressedLinkBadge,
                  ]}
                >
                  {downloadStatus === 'downloading' ? (
                    <ActivityIndicator size="small" color={linkBadgeColor} />
                  ) : (
                    <IconSymbol
                      name="square.and.arrow.down.fill"
                      size={13}
                      color={linkBadgeColor}
                    />
                  )}
                  <ThemedText
                    numberOfLines={1}
                    style={[styles.linkBadgeText, { color: linkBadgeColor }]}
                  >
                    {downloadStatus === 'downloaded'
                      ? `${file.name} 저장됨`
                      : downloadStatus === 'failed'
                        ? `${file.name} 실패`
                        : file.name}
                  </ThemedText>
                </Pressable>
              );
            })}
          </View>
        )}
        {message.status === 'error' && (
          <ThemedText style={styles.errorStatus}>
            {message.errorMessage || 'Failed to send'}
          </ThemedText>
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
  linkBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  generatedFileRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  linkBadge: {
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 4,
    maxWidth: '100%',
    minHeight: 24,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  userLinkBadge: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.34)',
  },
  referenceLinkBadge: {
    borderStyle: 'dashed',
  },
  overflowLinkBadge: {
    minWidth: 32,
    justifyContent: 'center',
  },
  overflowLinkBadgeText: {
    fontWeight: '700',
    textAlign: 'center',
  },
  sourceTagBadge: {
    justifyContent: 'center',
  },
  sourceTagBadgeText: {
    fontWeight: '700',
  },
  generatedFileBadge: {
    borderStyle: 'solid',
  },
  pressedLinkBadge: {
    opacity: 0.72,
  },
  linkBadgeText: {
    flexShrink: 1,
    fontSize: 12,
    lineHeight: 16,
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
