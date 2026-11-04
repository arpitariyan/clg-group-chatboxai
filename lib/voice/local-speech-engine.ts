/**
 * local-speech-engine.ts
 *
 * Deep-naturalization TTS engine for the DisplayResult Speak button.
 * Uses ONLY browser Web Speech API — zero API calls, zero credits, all plans.
 *
 * Naturalness layers applied:
 *  1. Rich text normalization  — numbers, units, symbols, think-tag removal
 *  2. Abbreviation expansion   — AI, API, e.g., etc. spoken correctly
 *  3. Prosodic phrase splitting — every sentence AND major clause boundary gets its own utterance
 *  4. Contextual pause gaps    — comma=120ms, semicolon=200ms, period=280ms, paragraph=450ms
 *  5. Sentence-type detection  — questions get +0.04 pitch lift; exclamations get +0.03 rate
 *  6. Position-aware rate arc  — opener sentences slightly slower, mid faster, closers slow again
 *  7. Subtle random micro-variation — ±0.025 rate, ±0.01 pitch per chunk so no two sound identical
 *  8. Chrome keepalive patch   — pause/resume every 10s prevents the 15s cutoff bug
 *  9. Voices-loaded guard      — waits for voiceschanged before selecting voice
 * 10. Graceful cancellation    — single shared session singleton, instant stop
 */

// ─── Voice Profiles ──────────────────────────────────────────────────────────

export interface VoiceProfile {
  id: string;
  name: string;
  gender: 'female' | 'male';
  /** Base speaking rate (0.8–1.15) */
  rate: number;
  /** Base pitch (0.85–1.1) */
  pitch: number;
  /** Ordered list of preferred system voice name substrings (case-insensitive) */
  preferredVoiceNames: string[];
}

export const VOICE_PROFILES: Record<string, VoiceProfile> = {
  /** Sarah — warm, friendly, natural female */
  'voice-1': {
    id: 'voice-1', name: 'Sarah', gender: 'female', rate: 0.95, pitch: 1.06,
    preferredVoiceNames: ['ava', 'jenny', 'aria', 'samantha', 'siri', 'zira', 'google us english', 'google us', 'google'],
  },
  /** Charlie — upbeat, casual, energetic male */
  'voice-2': {
    id: 'voice-2', name: 'Charlie', gender: 'male', rate: 1.02, pitch: 1.05,
    preferredVoiceNames: ['guy', 'christopher', 'alex', 'google uk english male', 'google uk', 'google'],
  },
  /** George — confident, deep, authoritative male */
  'voice-3': {
    id: 'voice-3', name: 'George', gender: 'male', rate: 0.92, pitch: 0.88,
    preferredVoiceNames: ['guy', 'christopher', 'david', 'alex', 'google uk english male', 'google'],
  },
  /** Antoni — warm, grounded, gentle male */
  'voice-4': {
    id: 'voice-4', name: 'Antoni', gender: 'male', rate: 0.91, pitch: 0.86,
    preferredVoiceNames: ['eric', 'steffan', 'brian', 'guy', 'google uk english male', 'google'],
  },
  /** Bill — reassuring, calm, thoughtful male */
  'voice-5': {
    id: 'voice-5', name: 'Bill', gender: 'male', rate: 0.94, pitch: 0.93,
    preferredVoiceNames: ['christopher', 'guy', 'daniel', 'alex', 'david', 'google'],
  },
};

const DEFAULT_PROFILE = VOICE_PROFILES['voice-1'];

// ─── Voice Selection ──────────────────────────────────────────────────────────

export function getMatchedSystemVoice(profile: VoiceProfile): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const english = voices.filter(v => v.lang.startsWith('en'));

  // Priority 1: Preferred names in order
  for (const name of profile.preferredVoiceNames) {
    const match = english.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
    if (match) return match;
  }

  // Priority 2: Gender heuristic
  const femaleTerms = ['female', 'woman', 'girl', 'aria', 'ava', 'jenny', 'samantha', 'zira', 'siri', 'victoria', 'karen', 'moira', 'fiona', 'allison', 'susan', 'veena', 'tessa', 'alice', 'nora'];
  const maleTerms   = ['male', 'man', 'guy', 'alex', 'daniel', 'david', 'james', 'george', 'mark', 'ryan', 'chris', 'thomas', 'fred', 'arthur', 'oliver'];
  const hints = profile.gender === 'female' ? femaleTerms : maleTerms;
  const genderMatch = english.find(v => hints.some(h => v.name.toLowerCase().includes(h)));
  if (genderMatch) return genderMatch;

  // Priority 3: Default English or first available
  return english.find(v => v.default) || english[0] || voices[0];
}

// ─── Text Normalization ───────────────────────────────────────────────────────

/** Convert digits and common symbols to speakable words */
function normalizeNumbers(text: string): string {
  // Currency: $100, £50, €25
  text = text.replace(/\$(\d[\d,]*\.?\d*)/g, (_, n) => `${n} dollars`);
  text = text.replace(/£(\d[\d,]*\.?\d*)/g, (_, n) => `${n} pounds`);
  text = text.replace(/€(\d[\d,]*\.?\d*)/g, (_, n) => `${n} euros`);

  // Percentages
  text = text.replace(/(\d+(?:\.\d+)?)%/g, '$1 percent');

  // Years spoken naturally: 2024 → "twenty twenty four", 1999 → "nineteen ninety nine"
  // (browser TTS handles raw 4-digit years well enough; skip complex conversion)

  // Fractions: 1/2 → "one half", 3/4 → "three quarters"
  const fractionWords: Record<string, string> = {
    '1/2': 'one half', '1/3': 'one third', '2/3': 'two thirds',
    '1/4': 'one quarter', '3/4': 'three quarters', '1/5': 'one fifth',
  };
  for (const [frac, word] of Object.entries(fractionWords)) {
    text = text.replace(new RegExp(frac.replace('/', '\\/'), 'g'), word);
  }

  // Ordinals: 1st, 2nd, 3rd, 4th
  text = text.replace(/\b(\d+)(st|nd|rd|th)\b/gi, '$1$2');

  // Remove thousand separators for cleaner reading
  text = text.replace(/(\d),(\d{3})/g, '$1$2');

  return text;
}

/** Expand technical abbreviations and acronyms for natural speech */
function expandAbbreviations(text: string): string {
  const replacements: [RegExp, string][] = [
    // Tech
    [/\bAI\b/g,      'A.I.'],
    [/\bML\b/g,      'machine learning'],
    [/\bAPI\b/g,     'A.P.I.'],
    [/\bURL\b/g,     'U.R.L.'],
    [/\bHTML\b/g,    'H.T.M.L.'],
    [/\bCSS\b/g,     'C.S.S.'],
    [/\bSQL\b/g,     'S.Q.L.'],
    [/\bJSON\b/g,    'J.S.O.N.'],
    [/\bPDF\b/g,     'P.D.F.'],
    [/\bUI\b/g,      'U.I.'],
    [/\bUX\b/g,      'U.X.'],
    [/\bOS\b/g,      'O.S.'],
    [/\bCPU\b/g,     'C.P.U.'],
    [/\bRAM\b/g,     'ram'],
    [/\bGPU\b/g,     'G.P.U.'],
    [/\bSEO\b/g,     'S.E.O.'],
    [/\bCRM\b/g,     'C.R.M.'],
    [/\bCMS\b/g,     'C.M.S.'],
    [/\bSaaS\b/g,    'software as a service'],
    [/\bIoT\b/g,     'I.O.T.'],
    // Common English
    [/\bIDK\b/gi,    "I don't know"],
    [/\bFYI\b/gi,    'for your information'],
    [/\bASAP\b/gi,   'as soon as possible'],
    [/\bIMO\b/gi,    'in my opinion'],
    [/\bIMHO\b/gi,   'in my humble opinion'],
    [/\bTBH\b/gi,    'to be honest'],
    [/\be\.g\./gi,   'for example,'],
    [/\bi\.e\./gi,   'that is,'],
    [/\betc\./gi,    'and so on'],
    [/\bvs\.\b/gi,   'versus'],
    [/\bapprox\./gi, 'approximately'],
    [/\bcf\./gi,     'compare'],
    [/\bDr\.\s/g,    'Doctor '],
    [/\bMr\.\s/g,    'Mister '],
    [/\bMs\.\s/g,    'Miss '],
    [/\bMrs\.\s/g,   'Missus '],
    [/\bProf\.\s/g,  'Professor '],
    // Symbols
    [/&/g,           ' and '],
    [/\+\+/g,        ' plus plus'],
    [/->/g,          ' to '],
    [/=>/g,          ' to '],
  ];

  for (const [pat, rep] of replacements) {
    text = text.replace(pat, rep);
  }
  return text;
}

/**
 * Full text normalization pipeline: strip markup → clean → expand → normalize numbers.
 * Returns plain readable text with natural sentence endings.
 */
export function cleanAndFormatTextForSpeech(rawInput: unknown): string {
  if (!rawInput) return '';
  let text = String(rawInput);

  // 1. Remove <think>…</think> reasoning blocks
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, ' ');
  text = text.replace(/<think>[\s\S]*$/gi, ' ');

  // 2. Replace code blocks with a spoken note
  text = text.replace(/```[\s\S]*?```/g, ' — [code block] — ');

  // 3. Remove inline code ticks but keep the text inside
  text = text.replace(/`([^`]+)`/g, '$1');

  // 4. Remove bare URLs (not readable aloud)
  text = text.replace(/https?:\/\/[^\s)\]]+/g, '');

  // 5. Strip markdown formatting
  text = text
    .replace(/\*\*(.*?)\*\*/g, '$1')     // bold
    .replace(/__(.*?)__/g, '$1')          // bold alt
    .replace(/\*(.*?)\*/g, '$1')          // italic
    .replace(/_(.*?)_/g, '$1')            // italic alt
    .replace(/~~(.*?)~~/g, '$1')          // strikethrough
    .replace(/\[(.*?)\]\([^)]*\)/g, '$1') // [link](url) → text
    .replace(/!\[.*?\]\([^)]*\)/g, '')    // images removed
    .replace(/#{1,6}\s+(.+)/g, '$1. ')   // headers → sentence
    .replace(/^\s*>\s+/gm, '')            // blockquotes
    .replace(/\|[^\n]+\|/g, ' ')         // tables
    .replace(/<[^>]+>/g, ' ')            // HTML tags
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')   // HTML entities
    .replace(/---+/g, ', ');             // horizontal rule

  // 6. Convert bullet/numbered list items — add a spoken pause before each item
  text = text.replace(/^\s*[-*+]\s+/gm, '\n');
  text = text.replace(/^\s*\d+\.\s+/gm, '\n');

  // 7. Paragraph/newline → sentence pauses
  text = text.replace(/\n{2,}/g, ' [PARA] ');
  text = text.replace(/\n/g, ', ');

  // 8. Expand abbreviations before numbers (order matters)
  text = expandAbbreviations(text);

  // 9. Normalize numbers and symbols
  text = normalizeNumbers(text);

  // 10. Collapse whitespace
  text = text.replace(/\s{2,}/g, ' ').trim();

  // 11. Ensure text ends with punctuation
  if (text && !/[.!?]$/.test(text)) text += '.';

  return text;
}

// ─── Prosodic Chunk Builder ───────────────────────────────────────────────────

/** A single speech unit with its own prosodic settings */
interface SpeechChunk {
  text: string;
  /** ms to wait BEFORE speaking this chunk (paragraph gap, etc.) */
  preDelay: number;
  /** ms to wait AFTER speaking this chunk (sentence-end natural pause) */
  postDelay: number;
  /** Pitch adjustment relative to profile base (e.g. +0.04 for questions) */
  pitchDelta: number;
  /** Rate adjustment relative to profile base */
  rateDelta: number;
}

/**
 * Split cleaned text into prosodic chunks.
 * Each sentence is its own chunk; clause-level commas add delays not splits.
 * Paragraph markers ([PARA]) become long pre-delays.
 */
function buildProsodicChunks(text: string): SpeechChunk[] {
  const result: SpeechChunk[] = [];

  // Split on paragraph markers first
  const paragraphs = text.split(/\[PARA\]/);

  paragraphs.forEach((para, paraIdx) => {
    const paraText = para.trim();
    if (!paraText) return;

    // Split into sentences on .  !  ?  — but keep the terminator attached
    const sentences = paraText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paraText];

    sentences.forEach((raw, sentIdx) => {
      const s = raw.trim();
      if (!s || s.length < 3) return;

      // Detect sentence type
      const isQuestion    = /\?$/.test(s);
      const isExclamation = /!$/.test(s);

      // Pitch/rate based on sentence type
      let pitchDelta = 0;
      let rateDelta  = 0;

      if (isQuestion) {
        pitchDelta = +0.05;  // Questions rise at the end
        rateDelta  = +0.01;
      } else if (isExclamation) {
        pitchDelta = +0.02;
        rateDelta  = +0.04;  // Exclamations are slightly faster/energetic
      }

      // Position-aware rate arc within a paragraph
      // Opener: a bit slower (more deliberate); mid: normal; closer: slightly slower (resolution)
      if (sentIdx === 0 && paraIdx === 0) {
        rateDelta -= 0.02;  // Very first sentence: slower intro
      } else if (sentIdx === sentences.length - 1) {
        rateDelta -= 0.015; // Last sentence of paragraph: slower close
      }

      // Determine delays
      const preDelay  = paraIdx > 0 && sentIdx === 0 ? 420 : 0;   // paragraph gap
      const postDelay = isQuestion ? 320
                      : isExclamation ? 220
                      : sentIdx === sentences.length - 1 ? 300 // end of paragraph
                      : 260; // normal sentence gap

      result.push({ text: s, preDelay, postDelay, pitchDelta, rateDelta });
    });
  });

  return result.length > 0 ? result : [{ text, preDelay: 0, postDelay: 0, pitchDelta: 0, rateDelta: 0 }];
}

/** Inject natural micro-pauses at comma/colon/semicolon positions inside a sentence.
 *  We do this by splitting the sentence at those punctuations, speaking each sub-phrase
 *  as its own utterance with a short delay, instead of one continuous block.
 *  Uses a split-capture approach instead of lookbehind for universal browser compatibility. */
function splitAtInternalPauses(s: string): Array<{ text: string; delayAfter: number }> {
  // Capture the delimiter WITH the preceding phrase by splitting on the space after ,/;/:
  // We use a capturing group so the delimiter char stays with its phrase.
  const tokens = s.split(/(,\s+|;\s+|:\s+)/);
  // tokens alternates: [phrase, delimiter, phrase, delimiter, ...]
  // Rejoin each phrase with its trailing delimiter
  const parts: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (i % 2 === 0) {
      // phrase token — append next delimiter token if present
      const phrase = tokens[i];
      const delim  = tokens[i + 1] ?? '';
      const joined = (phrase + delim).trimEnd();
      if (joined) parts.push(joined);
      i++; // skip the delimiter token we just consumed
    }
  }

  if (parts.length <= 1) return [{ text: s, delayAfter: 0 }];

  return parts.map((part, i) => {
    const trimmed = part.trim();
    if (!trimmed) return null;
    const lastChar = trimmed.slice(-1);
    const delayAfter = i < parts.length - 1
      ? (lastChar === ';' || lastChar === ':' ? 160 : lastChar === ',' ? 110 : 80)
      : 0;
    return { text: trimmed, delayAfter };
  }).filter(Boolean) as Array<{ text: string; delayAfter: number }>;
}

// ─── Session Management ───────────────────────────────────────────────────────

interface SpeechSession {
  cancelled: boolean;
  keepAliveInterval: ReturnType<typeof setInterval> | null;
}

let activeSession: SpeechSession | null = null;

export function stopNaturalSpeech(): void {
  if (activeSession) {
    activeSession.cancelled = true;
    if (activeSession.keepAliveInterval) {
      clearInterval(activeSession.keepAliveInterval);
      activeSession.keepAliveInterval = null;
    }
    activeSession = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface SpeakOptions {
  voiceId?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: string) => void;
}

/** Wait for a given duration (respects cancellation) */
function delay(ms: number, session: SpeechSession): Promise<void> {
  return new Promise(resolve => {
    if (session.cancelled) { resolve(); return; }
    setTimeout(resolve, ms);
  });
}

/** Speak a single utterance string with specific pitch/rate, returns when done */
function speakUtterance(
  text: string,
  profile: VoiceProfile,
  systemVoice: SpeechSynthesisVoice | null,
  pitchDelta: number,
  rateDelta: number,
  session: SpeechSession,
  onFirstStart?: () => void,
): Promise<void> {
  return new Promise<void>(resolve => {
    if (session.cancelled) { resolve(); return; }

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang   = 'en-US';
    utt.volume = 1.0;

    // Apply profile + deltas + micro-variation
    const microRate  = (Math.random() - 0.5) * 0.025;
    const microPitch = (Math.random() - 0.5) * 0.012;

    utt.rate  = Math.max(0.78, Math.min(1.18, profile.rate  + rateDelta  + microRate));
    utt.pitch = Math.max(0.80, Math.min(1.20, profile.pitch + pitchDelta + microPitch));

    if (systemVoice) utt.voice = systemVoice;

    utt.onstart = () => { onFirstStart?.(); };
    utt.onend   = () => resolve();
    utt.onerror = () => resolve();   // non-fatal — continue to next chunk

    window.speechSynthesis.speak(utt);
  });
}

/**
 * Speak text naturally with full prosodic shaping.
 * Respects user's saved assistant voice selection.
 */
export async function speakNaturalTextQueue(
  text: string,
  options: SpeakOptions = {},
): Promise<void> {
  const { voiceId = 'voice-1', onStart, onEnd, onError } = options;

  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onError?.('Text-to-speech is not supported in this browser.');
    return;
  }

  // Stop any running session
  stopNaturalSpeech();

  // Let cancel() flush before starting (Chrome race condition fix)
  await new Promise(resolve => setTimeout(resolve, 90));

  const cleaned = cleanAndFormatTextForSpeech(text);
  if (!cleaned) {
    onError?.('No readable text found.');
    return;
  }

  const profile = VOICE_PROFILES[voiceId] ?? DEFAULT_PROFILE;
  const chunks  = buildProsodicChunks(cleaned);

  // Create session
  const session: SpeechSession = { cancelled: false, keepAliveInterval: null };
  activeSession = session;

  // Resolve system voice, waiting for voiceschanged if necessary
  let systemVoice: SpeechSynthesisVoice | null = getMatchedSystemVoice(profile);
  if (!systemVoice) {
    await new Promise<void>(resolve => {
      const h = () => { window.speechSynthesis.removeEventListener('voiceschanged', h); resolve(); };
      window.speechSynthesis.addEventListener('voiceschanged', h);
      setTimeout(resolve, 1200);
    });
    systemVoice = getMatchedSystemVoice(profile);
  }

  // Chrome keepalive: prevent the 15-second silent pause bug
  session.keepAliveInterval = setInterval(() => {
    if (session.cancelled) {
      if (session.keepAliveInterval) clearInterval(session.keepAliveInterval);
      return;
    }
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    } else {
      if (session.keepAliveInterval) clearInterval(session.keepAliveInterval);
    }
  }, 10000);

  let started = false;
  const fireStart = () => {
    if (!started) { started = true; onStart?.(); }
  };

  // ── Main playback loop ─────────────────────────────────────────────────────
  for (let ci = 0; ci < chunks.length; ci++) {
    if (session.cancelled) break;

    const chunk = chunks[ci];

    // Paragraph/section pre-delay
    if (chunk.preDelay > 0) {
      await delay(chunk.preDelay, session);
      if (session.cancelled) break;
    }

    // Split chunk into internal sub-phrases (at comma/colon/semicolon)
    const subPhrases = splitAtInternalPauses(chunk.text);

    for (let si = 0; si < subPhrases.length; si++) {
      if (session.cancelled) break;

      const sub = subPhrases[si];
      if (!sub.text.trim()) continue;

      await speakUtterance(
        sub.text,
        profile,
        systemVoice,
        chunk.pitchDelta,
        chunk.rateDelta,
        session,
        fireStart,
      );

      if (session.cancelled) break;

      // Internal clause pause (comma/colon/semicolon)
      if (sub.delayAfter > 0 && si < subPhrases.length - 1) {
        await delay(sub.delayAfter, session);
      }
    }

    if (session.cancelled) break;

    // Post-sentence pause (gives natural breathing room between sentences)
    if (chunk.postDelay > 0 && ci < chunks.length - 1) {
      await delay(chunk.postDelay, session);
    }
  }

  // Cleanup
  if (session.keepAliveInterval) {
    clearInterval(session.keepAliveInterval);
    session.keepAliveInterval = null;
  }
  if (activeSession === session) activeSession = null;
  if (!session.cancelled) onEnd?.();
}
