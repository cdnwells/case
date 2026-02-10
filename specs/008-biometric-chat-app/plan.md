# Biometric Chat App - Implementation Plan

## Overview

Convert existing Expo React Native app to a single-page chat application with Android biometric authentication. HTTP requests will be mocked initially to echo user messages back.

## Goals

- Single-page app architecture (remove tab navigation)
- Android biometric authentication before showing chat
- Chat interface with message sending capability
- HTTP service layer with mock implementation that echoes messages
- Easy switch to real hub server when ready

## Technical Approach

- Use `expo-local-authentication` for biometric auth
- Service interface pattern (`IChatService`) for easy mock/real API switching
- React hooks for state management (`useAuth`, `useChat`)
- Optimistic UI updates for messages
- Reuse existing themed components

## Components

### Authentication
- `hooks/useAuth.ts` - Biometric authentication logic
- `components/auth/BiometricLockScreen.tsx` - Lock screen UI

### Chat
- `hooks/useChat.ts` - Chat state and message handling
- `components/chat/ChatScreen.tsx` - Main chat container
- `components/chat/MessageList.tsx` - Scrollable message list
- `components/chat/MessageBubble.tsx` - Individual message component
- `components/chat/ChatInput.tsx` - Text input with send button

### Services
- `services/api/types.ts` - IChatService interface
- `services/api/mockChatService.ts` - Echo implementation
- `services/api/chatService.ts` - Real HTTP implementation
- `services/api/index.ts` - Export with USE_MOCK toggle

## Implementation Steps

1. **Setup & Cleanup**
   - Install `expo-local-authentication`
   - Delete tab navigation files (`app/(tabs)/`, `app/modal.tsx`)
   - Delete unused demo components
   - Add Android biometric permissions to `app.json`

2. **Type Definitions & Service Layer**
   - Create `types/chat.ts` with Message interfaces
   - Create `services/api/` folder with mock and real services

3. **Authentication Layer**
   - Create `useAuth` hook with biometric logic
   - Create `BiometricLockScreen` component

4. **Chat Components**
   - Create `useChat` hook for message state
   - Create `MessageBubble`, `MessageList`, `ChatInput`, `ChatScreen` components

5. **App Structure**
   - Simplify `app/_layout.tsx` to single screen
   - Create `app/index.tsx` with auth flow

6. **Theme Updates**
   - Add chat-specific colors to `constants/theme.ts`

## Dependencies

**New packages to install:**
```bash
npx expo install expo-local-authentication
```

**Existing packages used:**
- `react-native-safe-area-context`
- `expo-haptics`
- `react-native-reanimated`

## File Structure (Final)

```
app/
  _layout.tsx          # Simplified root layout
  index.tsx            # Main entry with auth/chat routing
components/
  auth/
    BiometricLockScreen.tsx
  chat/
    ChatScreen.tsx
    MessageList.tsx
    MessageBubble.tsx
    ChatInput.tsx
    index.ts
  themed-text.tsx      # Keep existing
  themed-view.tsx      # Keep existing
  ui/
    icon-symbol.tsx    # Keep existing
hooks/
  useAuth.ts
  useChat.ts
  use-color-scheme.ts  # Keep existing
  use-theme-color.ts   # Keep existing
services/
  api/
    types.ts
    mockChatService.ts
    chatService.ts
    index.ts
types/
  chat.ts
constants/
  theme.ts             # Updated with chat colors
```

## Trade-offs & Decisions

| Decision | Rationale |
|----------|-----------|
| `expo-local-authentication` | Official Expo package, handles both fingerprint and Face ID |
| Interface-based service | Easy mock/real switching via boolean flag |
| Hooks for state | Sufficient for single-page app, no need for Redux/Zustand |
| Optimistic UI | Better UX - messages appear immediately |
| Hub URL placeholder | `https://api.hub.example.com` - replace when real server ready |

## Verification

1. Run `npm start` then `npm run android`
2. Verify biometric prompt appears on app launch
3. Authenticate successfully
4. Send a message
5. Verify message echoes back with "Echo: {your message}"
6. Test dark/light theme toggle

## Open Questions

- Should authentication persist between app restarts?
- Timeout period before re-authentication required?
- Message history persistence (AsyncStorage)?
