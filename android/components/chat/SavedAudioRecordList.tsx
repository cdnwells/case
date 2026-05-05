import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
  listSavedAudioRecordDisplayMetadata,
  type SavedAudioRecordDisplayItem,
} from "@/services/voice/savedAudioRecordDisplay";
import type { SavedApprovedAudioRecordView } from "@/constants/audioBuffer";
import { IconSymbol } from "@/components/ui/icon-symbol";
import React, { useCallback, useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

interface SavedAudioRecordListProps {
  records: readonly SavedApprovedAudioRecordView[];
  onDeleteRecording: (clipId: string) => void;
  title?: string;
}

export function SavedAudioRecordList({
  records,
  onDeleteRecording,
  title = "Saved audio",
}: SavedAudioRecordListProps) {
  const colorScheme = useColorScheme();
  const displayRecords = useMemo(
    () => listSavedAudioRecordDisplayMetadata(records),
    [records],
  );

  if (displayRecords.length === 0) {
    return null;
  }

  const isDark = colorScheme === "dark";
  const surfaceBorderColor = isDark ? "#3a3a3c" : "#e5e5ea";
  const recordBackgroundColor = isDark ? "#1f2325" : "#f7f8f9";

  return (
    <View
      style={[styles.surface, { borderTopColor: surfaceBorderColor }]}
      accessibilityLabel="Saved audio recordings"
    >
      <View style={styles.headerRow}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        <ThemedText style={styles.count}>{displayRecords.length}</ThemedText>
      </View>
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {displayRecords.map((displayRecord) => (
          <SavedAudioRecordListItem
            key={displayRecord.record.clipId}
            displayRecord={displayRecord}
            backgroundColor={recordBackgroundColor}
            onDeleteRecording={onDeleteRecording}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function SavedAudioRecordListItem({
  displayRecord,
  backgroundColor,
  onDeleteRecording,
}: {
  displayRecord: SavedAudioRecordDisplayItem;
  backgroundColor: string;
  onDeleteRecording: (clipId: string) => void;
}) {
  const handleDeleteRecording = useCallback(() => {
    onDeleteRecording(displayRecord.record.clipId);
  }, [displayRecord.record.clipId, onDeleteRecording]);

  return (
    <View style={[styles.record, { backgroundColor }]}>
      <View style={styles.recordHeader}>
        <View
          style={styles.recordHeading}
          accessible
          accessibilityLabel={displayRecord.accessibilityLabel}
        >
          <ThemedText style={styles.recordTitle} numberOfLines={2}>
            {displayRecord.title}
          </ThemedText>
          <ThemedText style={styles.recordSubtitle} numberOfLines={1}>
            {displayRecord.subtitle}
          </ThemedText>
        </View>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDeleteRecording}
          accessibilityRole="button"
          accessibilityLabel={`Delete saved recording ${displayRecord.record.clipId}`}
        >
          <IconSymbol name="trash.fill" size={18} color="#c2410c" />
        </TouchableOpacity>
      </View>
      <View style={styles.metadata}>
        {displayRecord.metadataLines.map((line) => (
          <View key={line.label} style={styles.metadataLine}>
            <ThemedText style={styles.metadataLabel} numberOfLines={1}>
              {line.label}
            </ThemedText>
            <ThemedText
              style={styles.metadataValue}
              numberOfLines={1}
              ellipsizeMode="middle"
            >
              {line.value}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 8,
    maxHeight: 260,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  title: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  count: {
    minWidth: 24,
    height: 20,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "#4A5568",
    color: "#fff",
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
    fontWeight: "700",
  },
  list: {
    maxHeight: 220,
  },
  listContent: {
    paddingBottom: 8,
  },
  record: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  recordHeader: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  recordHeading: {
    flex: 1,
    paddingRight: 8,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  recordTitle: {
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
  },
  recordSubtitle: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.72,
  },
  metadata: {
    marginTop: 6,
  },
  metadataLine: {
    minHeight: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  metadataLabel: {
    width: 92,
    fontSize: 11,
    lineHeight: 16,
    opacity: 0.62,
  },
  metadataValue: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
});
