# ElevenLabs Voice AI Integration & 5-Voice Selection Architecture

**Date:** September 06, 2026  
**Scope:** ElevenLabs TTS Integration, Provider Layer (`lib/voice/`), 5-Voice Registry (`lib/voice/voice-registry.ts`), Preprocessing Pipeline (`lib/voice/preprocess.ts`), Next.js API Route (`app/api/tts/route.ts`), Web Audio Level Analyzer (`lib/voice/audio-controller.ts`), Voice Preference Hook (`hooks/useVoicePreference.ts`), Voice Selector UI (`components/voice/VoiceSelectorModal.jsx`), and Voice AI Page (`app/(routes)/voice-ai/page.jsx`).

---

## 1. Executive Summary

ChatBox AI has been upgraded with **ElevenLabs Flash v2.5** and an **Approved 5-Voice Selection Architecture** for real-time, low-latency, natural conversational speech. 

Key technical principles enforced:
- **Exact 5 Selectable Assistant Voices**: Supports 5 distinct voice profiles (Talia, Jade, Caleb, Darian, Eddie).
- **Server-Side Allowlist Registry**: Client sends `voiceOptionId` (`voice-1` to `voice-5`). The server resolves approved ElevenLabs `voiceId` via `ASSISTANT_VOICES` registry to prevent clients from requesting arbitrary/expensive voices.
- **Zero UI Redesign**: Existing `ParticlesOrb` visual system, 3D Fibonacci sphere renderer, and emerald theme remain untouched.
- **Strict API Security**: `ELEVENLABS_API_KEY` is kept server-side inside `app/api/tts/route.ts`. No keys are exposed to client JavaScript or browser logs.
- **Voice Preference Persistence**: Voice selection persists across reloads and sessions via `localStorage` (`chatbox_assistant_voice_id`) and account preferences.
- **Real-Time Audio Level Analyzer**: Uses Web Audio API `AudioContext` and `AnalyserNode` to calculate real-time RMS audio levels, feeding live values to `ParticlesOrb` so the orb reacts dynamically to spoken voice.
- **Free Tier & Quota Protections**: Enforces a max 500-character request limit, text normalization, rate safeguards, and LRU server audio caching to protect ElevenLabs' 10,000 monthly credits.

---

## 2. Architecture & File Structure

```
lib/voice/
  ├── types.ts            # VoiceRequest, VoiceSettings, VoiceProvider interfaces
  ├── config.ts           # Centralized environment variables & ElevenLabs config
  ├── preprocess.ts       # Text normalization & markdown stripping engine
  ├── voice-registry.ts   # Approved 5-voice registry & sample preview text
  ├── elevenlabs.ts       # ElevenLabs API streaming implementation
  ├── provider.ts         # Factory pattern for VoiceProvider abstraction
  └── audio-controller.ts # Web Audio API player & RMS level analyzer

hooks/
  └── useVoicePreference.ts # Persisted active voice preference hook

components/voice/
  └── VoiceSelectorModal.jsx # 5-voice selection modal with sample audio preview

app/api/tts/
  └── route.ts            # Server-side endpoint POST /api/tts

app/(routes)/voice-ai/
  └── page.jsx            # Updated Voice AI Page integrated with voice selector & AudioController
```

---

## 3. Approved 5-Voice Registry (`lib/voice/voice-registry.ts`)

| Voice ID | Assistant Name | Gender | Personality / Description | Default Fallback Voice ID |
|----------|---------------|--------|---------------------------|---------------------------|
| `voice-1` | **Talia** | Female | Warm, calm, supportive, intelligent *(Default)* | `21m00Tcm4TlvDq8ikWAM` |
| `voice-2` | **Jade** | Female | Friendly, upbeat, natural, energetic | `EXAVITQu4vr4xnSDxMaL` |
| `voice-3` | **Caleb** | Male | Calm, reliable, confident, professional | `JBFqnCBsd6RMkjVDRZzb` |
| `voice-4` | **Darian** | Male | Warm, mature, grounded, relaxed | `VR6AewLTigWG4xVOuG7A` |
| `voice-5` | **Eddie** | Male | Helpful, gentle, reassuring, friendly | `N2lLspCBkWGWmqPjvh14` |

---

## 4. Key Components & Implementation Details

### 4.1 Provider Abstraction Layer (`lib/voice/`)
- `types.ts`: Defines `VoiceProvider`, `VoiceRequest`, and `VoiceSettings` interfaces.
- `config.ts`: Defaults to model `eleven_flash_v2_5` (~75ms latency), stability `0.45`, similarity boost `0.80`, style `0.15`, speed `0.98`, speaker boost `true`.
- `elevenlabs.ts`: Streams audio from `https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream` using HTTP POST with server-side authentication headers.

### 4.2 Preprocessing Engine (`lib/voice/preprocess.ts`)
- Cleans LLM response text before passing to TTS:
  - Removes code blocks, markdown symbols (`#`, `*`, `_`, `` ` ``), links, citations.
  - Normalizes ISO dates (`2026-09-08` -> `September eighth, 2026`).
  - Normalizes currencies (`₹1,499` -> `1,499 rupees`, `$50` -> `50 dollars`).
  - Formats phone numbers for natural pausing (`+91 98765 43210` -> `plus 9 1, 9 8 7 6 5, 4 3 2 1 0`).
  - Safely truncates long text on sentence boundaries if length exceeds 500 characters.

### 4.3 Server Route Handler (`app/api/tts/route.ts`)
- Handles `POST /api/tts`.
- Resolves `voiceOptionId` via `getVoiceOptionById(voiceOptionId)` from the server-side registry.
- Resolves optional Firebase user authentication via `resolveRequestUser(req, false)`.
- Records API credit usage with concurrency locking via `deductApiCreditsWithLock(userEmail, 1, { endpoint: 'elevenlabs_tts', transactionType: 'tts_usage' })`.
- Implements an LRU in-memory cache to return cached MP3 buffers for identical phrases (`X-TTS-Cache: HIT`).
- Streams `audio/mpeg` response back to client without unnecessary full-disk buffering.

### 4.4 Web Audio Level Analyzer (`lib/voice/audio-controller.ts`)
- Manages Web Audio API lifecycle (`AudioContext`, `AudioBufferSourceNode`, `AnalyserNode`).
- Computes real-time frequency amplitude and updates `audioLevelRef.current` (0.0 to 1.0).
- Supports instant cancellation (`stop()` / `abort()`) when a new speech request arrives or when the user begins speaking/taps mic.

### 4.5 Voice Preference Hook & Selector UI (`hooks/` & `components/voice/`)
- `useVoicePreference.ts`: Reads & writes active voice selection (`chatbox_assistant_voice_id`) to `localStorage`.
- `VoiceSelectorModal.jsx`: Presents the 5 voice profiles with audio preview buttons using sample text `"Hey! I'm here. How can I help you today?"`.

### 4.6 Frontend Integration (`app/(routes)/voice-ai/page.jsx`)
- Adds header pill button showing the active voice name and description.
- Opens `VoiceSelectorModal` on button click.
- Passes `selectedVoiceId` with every query to `/api/tts`.
- Connects `audioLevelRef` directly to `<StateCircle levelRef={audioLevelRef} />` and `ParticlesOrb`.
- Maintains graceful fallback to Web Speech API if ElevenLabs API key is unconfigured or quota is exhausted.

---

## 5. Verification & Testing Matrix

| Test Case | Scenario | Expected Behavior | Status |
|-----------|----------|-------------------|--------|
| **1** | 5-Voice Selection | Modal displays 5 distinct voices with preview buttons | ✅ Verified |
| **2** | Audio Preview | Preview plays standardized sample sentence cleanly | ✅ Verified |
| **3** | Preference Persistence | Selected voice persists across page reloads and sessions | ✅ Verified |
| **4** | Server Allowlist Check | Client sends `voiceOptionId`; server resolves approved `voiceId` | ✅ Verified |
| **5** | Date / Time formatting | Spoken as "ten thirty AM" naturally | ✅ Verified |
| **6** | Currency ("The price is ₹1,499.") | Spoken as "1,499 rupees" | ✅ Verified |
| **7** | Consecutive Request / Interrupt | Previous audio stops instantly; no overlapping voices | ✅ Verified |
| **8** | Mobile Playback & Gesture | Unlocks Web Audio Context safely on user touch | ✅ Verified |
| **9** | Failover / Unconfigured Key | Gracefully falls back without breaking UI or chat | ✅ Verified |
