# Voice Assistant Selection, User-Scoped Persistence & Full-Stack Playback Architecture

**Date:** September 07, 2026  
**Scope:** Voice Selection & Preference Persistence (`hooks/useVoicePreference.ts`, `lib/user-preferences.js`), Approved 5-Voice Registry (`lib/voice/voice-registry.ts`), Audio Controller Engine (`lib/voice/audio-controller.ts`), Voice AI Interaction Page (`app/(routes)/voice-ai/page.jsx`), General Settings Voice Management (`app/(routes)/settings/_components/GeneralSettings.jsx`), and Server Route (`app/api/tts/route.ts`).

---

## 1. Executive Summary

ChatBox AI has upgraded its Voice Assistant system with **robust user-scoped preference persistence**, **Sarah (`voice-1`) as the permanent default**, and **consistent ElevenLabs voice synthesis across Voice AI generation, manual play, and replay**.

Key achievements:
1. **Sarah as the Guaranteed Default**: For any user who has never selected another voice, Sarah (`voice-1`) is consistently resolved as the default across all interfaces.
2. **User-Scoped Persistence (Never Resets)**: When a user selects a voice from the 5 approved voices (Sarah, Charlie, George, Antoni, Bill), the selection is saved specifically for that user (`chatbox_assistant_voice_id_${userIdentifier}` and active device fallback `chatbox_assistant_voice_id`), and synced with the user's profile (`userData?.assistant_voice`). The chosen voice persists across page reloads, route transitions, and future sessions without resetting to Sarah.
3. **Cross-Component Event Broadcast**: Selection changes anywhere (in the Voice Selector Modal, on the Voice AI page, or in General Settings) immediately dispatch a `chatbox_assistant_voice_changed` window event, ensuring all active components instantly reflect the updated voice without full-page reloads.
4. **Consistent Voice Generation, Playback & Replay in Voice AI (`/voice-ai`)**:
   - Automatic speech generation following AI queries and manual Play/Replay button clicks strictly use the user's chosen voice via ElevenLabs Flash v2.5 / Multilingual v2.
5. **General Settings Voice Panel**: Added an Assistant Voice selector with zero-credit static audio previews (`/voice-previews/voice-*.mp3`) and full reset integration in **Settings > Appearance**.
6. **Separation of Concerns**: Chat results (`DisplayResult.jsx`) remains decoupled on its standalone logic, leaving the Voice Assistant architecture clean, modular, and focused.

---

## 2. Architecture & File Modifications

```
lib/
  ├── user-preferences.js            # Added user-scoped voice preference loader, saver, & normalizer
  └── voice/
      ├── voice-registry.ts          # Default voice constants & robust case-insensitive voice resolution
      ├── config.ts                  # Clean fallback alignment for default voice ID (EXAVITQu4vr4xnSDxMaL)
      └── audio-controller.ts        # Auto-resolves user-preferred voice when omitted

hooks/
  └── useVoicePreference.ts          # User-scoped persistence hook with AuthContext/UserContext sync & event broadcasting

components/
  └── voice/
      └── VoiceSelectorModal.jsx     # 5-voice modal with zero-credit previews & persistent selection

app/
  ├── (routes)/
  │   ├── settings/_components/
  │   │   └── GeneralSettings.jsx   # Assistant Voice management cards, audio preview, & default reset
  │   └── voice-ai/
  │       └── page.jsx               # Authenticated ElevenLabs speech synthesis for query, play, and replay
  └── api/
      └── tts/
          └── route.ts               # Server-side TTS endpoint with server-controlled allowlist & credit deduplication
```

---

## 3. Detailed Component Implementations

### 3.1 User Preferences Storage (`lib/user-preferences.js`)
- `DEFAULT_ASSISTANT_VOICE = 'voice-1'` (Sarah).
- `getVoiceStorageKey(userIdentifier)`: Generates scoped keys (e.g. `chatbox_assistant_voice_id_user@example.com`).
- `saveUserVoicePreference(voiceId, userIdentifier)`: Saves to both user-scoped key and the generic active key.
- `loadUserVoicePreference(userIdentifier)`: Priority cascade:
  1. User-scoped key in `localStorage`
  2. Generic `chatbox_assistant_voice_id` key
  3. Default `voice-1` (Sarah)

### 3.2 Voice Preference Hook (`hooks/useVoicePreference.ts`)
- Automatically accesses `currentUser` (from `AuthContext`) and `userData` / `updateUserData` (from `UserContext`).
- Subscribes to `chatbox_assistant_voice_changed` custom events and browser `storage` events.
- On `setVoicePreference(voiceId)`:
  - Updates React state `selectedVoiceId`.
  - Saves locally via `saveUserVoicePreference(verified.id, userIdentifier)`.
  - Persists to user profile via `updateUserData({ assistant_voice: verified.id })`.
  - Dispatches `CustomEvent('chatbox_assistant_voice_changed', { detail: { voiceId, userIdentifier } })`.

### 3.3 Voice AI Page (`app/(routes)/voice-ai/page.jsx`)
- Uses `selectedVoiceId` from `useVoicePreference()`.
- Passes Firebase auth bearer token to `AudioController.playText` for authenticated quota tracking and credit deduction.
- When query finishes, auto-speech calls `speakResponse(textToSpeak, ...)`.
- Clicking the Volume2 / Play button calls `speakResponse(aiResponse, ...)` with the same saved voice.
- Changing voice via `VoiceSelectorModal` immediately updates state so all future queries and replays use the new voice.

### 3.4 General Settings (`GeneralSettings.jsx`)
- Added **Assistant Voice** cards to Appearance settings.
- Features zero-credit audio previews using static `/voice-previews/voice-*.mp3` assets.
- Selecting any voice instantly updates user preferences and broadcasts changes across the entire app.
- "Restore Default Settings" properly resets the assistant voice to Sarah (`voice-1`).

---

## 4. Verification & Testing Matrix

| Test Case | Scenario | Expected Behavior | Status |
|---|---|---|---|
| **1** | Default Voice | First-time users get Sarah (`voice-1`) automatically | ✅ Verified |
| **2** | Voice Selection Persistence | Changing voice to Charlie/George/Antoni/Bill persists across reload & navigation | ✅ Verified |
| **3** | User Scoping | User-specific preferences remain intact across sessions | ✅ Verified |
| **4** | Voice AI Play & Replay | Play & replay buttons in Voice AI use the selected voice | ✅ Verified |
| **5** | General Settings UI | Assistant Voice grid displays 5 voices with zero-credit previews & active badge | ✅ Verified |
| **6** | Restore Defaults | General Settings reset button restores assistant voice to Sarah | ✅ Verified |
| **7** | Real-time Broadcast | Changing voice in Settings immediately updates Voice AI components | ✅ Verified |
