# Speak Feature Natural Speech Upgrade
**Date:** September 7, 2026

## Summary
Upgraded the Speak button functionality in `DisplayResult.jsx` to produce natural, human-like speech output instead of the previous robotic single-utterance playback.

## What Changed

### New File: `lib/voice/local-speech-engine.ts`
A dedicated browser-only TTS engine with:
- **Voice profiles** for all 5 assistant voices (Sarah, Charlie, George, Antoni, Bill) with personality-tuned pitch/rate
- **`getMatchedSystemVoice(profile)`** — maps assistant voices to best available system voice on user's device
- **`cleanAndFormatTextForSpeech(text)`** — strips markdown, code blocks, URLs, expands abbreviations (AI→A.I., etc.)
- **`splitIntoSentenceChunks(text)`** — splits at sentence boundaries for natural rhythm
- **`speakNaturalTextQueue(text, options)`** — plays chunks sequentially with 100ms inter-sentence pauses, Chrome keepalive, clean cancellation
- **`stopNaturalSpeech()`** — cancels active session and all timers
- Zero API calls, zero credits consumed, works on all plans including Free

### Modified: `app/(routes)/search/[libId]/_components/DisplayResult.jsx`
1. **Imports added:** `useVoicePreference` hook, `speakNaturalTextQueue`, `stopNaturalSpeech` from local-speech-engine
2. **Hook added:** `const { selectedVoiceId } = useVoicePreference()` — reads user's saved assistant voice from Settings
3. **`handleSpeakResult` replaced:** Now uses `speakNaturalTextQueue(aiResponse, { voiceId: selectedVoiceId, ... })` instead of single SpeechSynthesisUtterance
4. **Cleanup updated:** `stopNaturalSpeech()` called on component unmount

## Key Constraints Honored
- ✅ No ElevenLabs usage for Speak button — no ElevenLabs credits consumed
- ✅ No paid API / external service
- ✅ Respects user's saved voice preference (voice-1 through voice-5)
- ✅ Voice preview files (`public/voice-previews/voice-*.mp3`) remain untouched — only used by Settings page
- ✅ Works for all users regardless of plan

## Voice-to-System-Voice Mapping
| Voice ID | Name | Gender | Rate | Pitch | Priority Targets |
|---|---|---|---|---|---|
| voice-1 | Sarah | female | 0.97 | 1.05 | Ava, Jenny, Aria, Samantha, Siri, Zira |
| voice-2 | Charlie | male | 1.03 | 1.05 | Guy, Christopher, Alex |
| voice-3 | George | male | 0.94 | 0.90 | Guy, Christopher, David |
| voice-4 | Antoni | male | 0.93 | 0.87 | Eric, Steffan, Brian |
| voice-5 | Bill | male | 0.96 | 0.94 | Christopher, Guy, Daniel |

## Chrome Keepalive Strategy
- `setInterval(pause+resume, 10000)` — prevents Chrome's built-in 15s speech cutoff for long responses
- Sequential chunk queue prevents the cutoff from affecting multi-sentence playback
- 80ms flush delay after `cancel()` before starting new session — prevents Chrome race condition
