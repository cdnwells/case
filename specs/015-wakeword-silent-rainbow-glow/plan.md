# 015 - Wake Word Silent Response with Rainbow Glow Effect

## Context

Currently when the wake word "case" is detected, a random greeting message is both displayed as a chat bubble AND played via TTS. The requirement is to:
1. **Not render any message** in the chat when wake word is detected
2. **Only play the Case voice** (TTS greeting continues)
3. **Show a rainbow-colored glow** around the chat input field trim

## Changes

### 1. Install `expo-linear-gradient`
```bash
cd android && npx expo install expo-linear-gradient
```

### 2. Modify `android/components/chat/ChatInput.tsx`

**a) Remove message rendering on wake word (line 139)**
```diff
- onLocalMessage?.(response, "assistant");
```
TTS `speakAsync(response)` remains — voice plays but no message bubble appears.

**b) Add imports**
- `LinearGradient` from `expo-linear-gradient`
- `Easing` from `react-native-reanimated`

**c) Add rainbow glow animation state** (after existing pulse animation)
- `glowOpacity` shared value — controls fade in/out
- `glowProgress` shared value — 0→1 repeating, controls gradient rotation
- `useEffect(isVoiceMode)` — on voice mode enter: fade in + start infinite rotation; on exit: fade out
- `glowAnimatedStyle` — opacity + rotate transform

**d) Wrap `inputContainer` in rainbow glow layer**

Structure:
```
<View style={styles.container}>
  <View style={styles.glowWrapper}>              ← new wrapper
    <Animated.View style={glowAnimatedStyle}>     ← rotating gradient layer
      <LinearGradient colors={[7 rainbow colors]} />
    </Animated.View>
    <View style={styles.inputContainer}>          ← existing input (overlaid on top)
      {/* existing contents unchanged */}
    </View>
  </View>
</View>
```

- `glowWrapper`: `position: relative`, `borderRadius: 24`
- Gradient layer: `position: absolute`, expanded 3px (top/left/right/bottom: -3), `borderRadius: 27`, `overflow: hidden`
- Gradient uses 7 colors (red, orange, yellow, green, blue, violet, red) diagonal, rotation creates rainbow cycling effect
- `inputContainer` overlays on top so only 3px border is visible

**e) Add styles**
- `glowWrapper`, `glowRotator`, `glowGradient` StyleSheet entries

### Glow Lifecycle
- ON: `handleWakeWordDetected` → `setIsVoiceMode(true)` → glow fades in
- OFF: recording complete/cancel/text input focus → `setIsVoiceMode(false)` → glow fades out
- No separate state needed — driven by existing `isVoiceMode`

## Files to Modify
- `android/components/chat/ChatInput.tsx` — only source file changed
- `android/package.json` — `expo-linear-gradient` added via npx expo install

## Verification
- Wake word "case" detected: TTS greeting plays, no message bubble appears in chat
- Rainbow glow appears around input field trim (on voice mode enter)
- Glow disappears when voice mode ends
- Manual testing (no virtual machine per CLAUDE.md)
