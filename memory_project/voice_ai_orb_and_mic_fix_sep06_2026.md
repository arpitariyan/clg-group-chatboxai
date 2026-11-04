# Voice AI Particles Orb Upgrade & Microphone Access Security Header Fix

**Date:** September 06, 2026  
**Scope:** Voice AI Core (`app/(routes)/voice-ai`), `ParticlesOrb` component (`components/ui/ParticlesOrb.jsx`), `StateCircle` wrapper, `voice-ai.css`, and global HTTP security headers (`lib/security-headers.js`).

---

## 1. Executive Summary

This documentation records two major technical improvements completed for the ChatBox AI Voice experience:
1. **ParticlesOrb Visual & State Upgrade**: Transformed the AI Voice Orb into a high-end, responsive energy core using ChatBox AI's emerald/cyan design system.
2. **Microphone Access Root Cause Resolution**: Identified and resolved a critical HTTP security header policy (`Permissions-Policy: microphone=()`) that hard-blocked browser microphone access across all environments.

---

## 2. Particles Orb & Motion System Architecture

### 2.1 Color Palette & Design Tokens
Replaced generic defaults with ChatBox AI's native Emerald/Cyan color tokens:
- **Primary Emerald:** `#00E6C3`
- **Bright Cyan Highlight:** `#66FFE5`
- **Secondary Emerald:** `#00BFA5`
- **Deep Emerald:** `#008F78`
- **Deep Teal:** `#00483F`
- **Background Core Atmosphere:** `#00352F`

### 2.2 Particle Field & Luminance Hierarchy
- **Renderer:** Fibonacci sphere particle generator (`count = 720` particles) rendered via HTML5 2D Canvas.
- **Luminance Distribution:**
  - **Highlight (5-10%):** `#66FFE5` (front-facing, active motion)
  - **Bright (20-30%):** `#00E6C3`
  - **Medium (40-50%):** `#00BFA5`
  - **Deep (20-30%):** `#00483F` (back-facing depth shading)

### 2.3 State Machine Mapping (`lib/orb-state.js`)
Preserved and refined 7 state machine modes:
- `IDLE`: Slow rotation, gentle micro-breathing (1.00 → 1.025).
- `CONNECTING`: Orbital gathering motion, system coming online.
- `LISTENING`: Surface ripples, audio-responsive radial expansion (`levelRef`).
- `THINKING`: Internal pulse, controlled compression/expansion.
- `SPEAKING`: Fluid particle flow, dynamic voice luminance.
- `ERROR`: Temporary rose/red warning tint (`#f43f5e`), smooth recovery.
- `DISABLED`: Subdued, grayscale desaturation, reduced opacity.

### 2.4 Clean Background Atmosphere
- Set `.orb-atmosphere-glow`, `.orb-emerald-halo`, and `.orb-cyan-bloom` to `display: none !important` in `voice-ai.css` to remove heavy blurred background aura behind the orb, ensuring the 3D particle sphere floats cleanly on the dark UI background.

---

## 3. Microphone Access Root Cause & Fix

### 3.1 The Bug
The Voice AI page displayed "Microphone access was denied" errors even when users explicitly enabled microphone access in Chrome browser settings.

### 3.2 Root Cause Analysis
- **Global Security Header Constraint:** `lib/security-headers.js` contained:
  ```javascript
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()'
  }
  ```
- **Impact:** `Permissions-Policy: microphone=()` is an HTTP response header sent by Next.js middleware. It instructs the browser engine to **globally disable microphone access for all documents** served by the app, overriding user browser setting toggles and HTTPS/localhost origins.

### 3.3 Solution
Updated `lib/security-headers.js` to allow same-origin microphone access:
```javascript
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(self), geolocation=(), browsing-topics=()'
  }
```

### 3.4 Web Speech API vs. `getUserMedia` Quirks
- **`webkitSpeechRecognition`**: Requires an actual HTTPS connection (`https://`). Chromium does not exempt `http://localhost` for speech recognition because audio data is processed via Google servers.
- **Ground-Truth Probe (`verifyMicrophoneAccess`)**: Uses temporary `getUserMedia({ audio: true })` check to confirm hardware mic access before attributing errors to user permission denial.

---

## 4. Key Files Modified

- [`lib/security-headers.js`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/lib/security-headers.js) - Changed `microphone=()` to `microphone=(self)`.
- [`components/ui/ParticlesOrb.jsx`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/components/ui/ParticlesOrb.jsx) - Fibonacci sphere canvas particle renderer & emerald state integration.
- [`lib/orb-state.js`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/lib/orb-state.js) - Emerald palette tokens & state mixing interpolation logic.
- [`app/(routes)/voice-ai/voice-ai.css`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/app/(routes)/voice-ai/voice-ai.css) - Removed background glow elements behind the orb.
- [`app/(routes)/voice-ai/page.jsx`](file:///d:/All%20Projects/ChatboxAi_change/chatboxai-renewal/app/(routes)/voice-ai/page.jsx) - Web Speech API initialization, error handling, and minimal clean control UI.
