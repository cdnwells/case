import { ThemedText } from "@/components/themed-text";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_DISMISS_BUTTON_LABEL,
  APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_EMPTY_PURPOSE_ERROR,
  APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_PURPOSE_FIELD_LABEL,
  APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_SAVE_BUTTON_LABEL,
  APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_STORAGE_NOTICE,
} from "@/services/voice/approvedAudioExplicitSaveFlow";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface ApprovedAudioSavePromptProps {
  laterUsePurpose: string;
  matchedVoiceId: string;
  matchedApprovedVoiceProfileId: string;
  matchedApprovedVoiceLabel: string;
  disabled?: boolean;
  isSaving?: boolean;
  error?: string | null;
  onLaterUsePurposeChange: (purpose: string) => void;
  onSave: () => void;
  onDismiss: () => void;
}

export function ApprovedAudioSavePrompt({
  laterUsePurpose,
  matchedVoiceId,
  matchedApprovedVoiceProfileId,
  matchedApprovedVoiceLabel,
  disabled = false,
  isSaving = false,
  error,
  onLaterUsePurposeChange,
  onSave,
  onDismiss,
}: ApprovedAudioSavePromptProps) {
  const colorScheme = useColorScheme();
  const textColor = useThemeColor({}, "text");
  const caseColor = useThemeColor({}, "symbolColor");
  const isDark = colorScheme === "dark";
  const normalizedLaterUsePurpose = laterUsePurpose.trim();
  const canSave =
    normalizedLaterUsePurpose.length > 0 && !disabled && !isSaving;
  const surfaceColor = isDark ? "#1f2325" : "#f4f7f5";
  const borderColor = isDark ? "#3a3a3c" : "#d9e2dc";
  const inputBackgroundColor = isDark ? "#2c2c2e" : "#ffffff";
  const mutedColor = isDark ? "#a8afb5" : "#57616a";
  const matchedVoiceProfile =
    matchedApprovedVoiceProfileId &&
    matchedApprovedVoiceProfileId !== matchedApprovedVoiceLabel
      ? `${matchedApprovedVoiceLabel} (${matchedApprovedVoiceProfileId})`
      : matchedApprovedVoiceLabel || matchedVoiceId;

  return (
    <View
      style={[
        styles.surface,
        { backgroundColor: surfaceColor, borderColor },
      ]}
      accessibilityLabel="Approved audio explicit save flow"
    >
      <View style={styles.headerRow}>
        <View style={styles.heading}>
          <ThemedText style={styles.title}>
            {APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_SAVE_BUTTON_LABEL}
          </ThemedText>
          <ThemedText
            style={[styles.subtitle, { color: mutedColor }]}
            numberOfLines={2}
          >
            {matchedVoiceProfile} -{" "}
            {APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_STORAGE_NOTICE}
          </ThemedText>
        </View>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onDismiss}
          disabled={isSaving}
          accessibilityRole="button"
          accessibilityLabel={`${APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_DISMISS_BUTTON_LABEL} captured audio without saving`}
        >
          <IconSymbol name="xmark.circle.fill" size={18} color={mutedColor} />
        </TouchableOpacity>
      </View>

      <View style={styles.inputRow}>
        <View style={styles.purposeField}>
          <ThemedText style={[styles.fieldLabel, { color: mutedColor }]}>
            {APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_PURPOSE_FIELD_LABEL}
          </ThemedText>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: inputBackgroundColor,
                borderColor,
                color: textColor,
              },
            ]}
            value={laterUsePurpose}
            onChangeText={onLaterUsePurposeChange}
            placeholder={APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_PURPOSE_FIELD_LABEL}
            placeholderTextColor={mutedColor}
            editable={!disabled && !isSaving}
            maxLength={120}
            accessibilityLabel={
              APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_PURPOSE_FIELD_LABEL
            }
          />
        </View>
        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: canSave ? caseColor : "transparent",
              borderColor: canSave ? caseColor : borderColor,
              opacity: canSave ? 1 : 0.55,
            },
          ]}
          onPress={onSave}
          disabled={!canSave}
          accessibilityRole="button"
          accessibilityLabel={
            canSave
              ? `Save captured audio for later use: ${normalizedLaterUsePurpose}`
              : APPROVED_AUDIO_EXPLICIT_SAVE_FLOW_EMPTY_PURPOSE_ERROR
          }
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <IconSymbol
                name="square.and.arrow.down.fill"
                size={16}
                color={canSave ? "#fff" : mutedColor}
              />
              <ThemedText
                style={[
                  styles.saveButtonText,
                  { color: canSave ? "#fff" : mutedColor },
                ]}
                numberOfLines={1}
              >
                Save
              </ThemedText>
            </>
          )}
        </TouchableOpacity>
      </View>

      {error ? (
        <ThemedText
          style={styles.errorText}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 8,
  },
  headerRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  heading: {
    flex: 1,
    paddingRight: 8,
  },
  title: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 15,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  inputRow: {
    marginTop: 6,
    minHeight: 48,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  purposeField: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  fieldLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "600",
  },
  input: {
    marginTop: 3,
    height: 34,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 0,
    fontSize: 13,
    lineHeight: 18,
  },
  saveButton: {
    width: 84,
    height: 34,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    marginLeft: 4,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "700",
  },
  errorText: {
    marginTop: 6,
    color: "#dc2626",
    fontSize: 12,
    lineHeight: 16,
  },
});
