const VALID_ACCENTS = ['violet', 'blue', 'emerald', 'amber', 'rose', 'indigo']
const VALID_CHAT_FONTS = [
  'default',
  'sans',
  'system',
  'dyslexic',
  'oswald',
  'boldonse',
  'libre-baskerville',
  'unbounded',
  'berkshire-swash',
]

export const DEFAULT_CHAT_FONT = 'default'
export const CHAT_FONT_PREF_KEY_PREFIX = 'chatboxai_chat_font'
export const CHAT_FONT_OPTIONS = [
  { label: 'Default', value: 'default' },
  { label: 'Sans', value: 'sans' },
  { label: 'System', value: 'system' },
  { label: 'Dyslexic-friendly', value: 'dyslexic' },
  { label: 'Oswald', value: 'oswald' },
  { label: 'Boldonse', value: 'boldonse' },
  { label: 'Libre Baskerville', value: 'libre-baskerville' },
  { label: 'Unbounded', value: 'unbounded' },
  { label: 'Berkshire Swash', value: 'berkshire-swash' },
]

export const ORB_COLORS = [
  { id: 'cyan', name: 'Cyan (Default)', from: '#00E6C3', to: '#66FFE5', bgClass: 'bg-cyan-400' },
  { id: 'purple', name: 'Purple', from: '#9333EA', to: '#C084FC', bgClass: 'bg-purple-500' },
  { id: 'blue', name: 'Blue', from: '#2563EB', to: '#60A5FA', bgClass: 'bg-blue-500' },
  { id: 'rose', name: 'Rose', from: '#E11D48', to: '#FB7185', bgClass: 'bg-rose-500' },
  { id: 'amber', name: 'Amber', from: '#D97706', to: '#FBBF24', bgClass: 'bg-amber-500' },
]

export const GENERAL_PREFS_KEY = 'chatboxai_general_prefs'

export const DEFAULT_GENERAL_PREFS = {
  compactMode: false,
  reducedMotion: false,
  soundEffects: true,
  orbColor: 'cyan',
}

export function loadGeneralPreferences() {
  if (typeof window === 'undefined') return { ...DEFAULT_GENERAL_PREFS }

  try {
    const raw = localStorage.getItem(GENERAL_PREFS_KEY)
    if (!raw) return { ...DEFAULT_GENERAL_PREFS }

    const parsed = JSON.parse(raw)
    return { ...DEFAULT_GENERAL_PREFS, ...(parsed || {}) }
  } catch {
    return { ...DEFAULT_GENERAL_PREFS }
  }
}

export function saveGeneralPreferences(prefs) {
  if (typeof window === 'undefined') return

  const merged = { ...DEFAULT_GENERAL_PREFS, ...(prefs || {}) }
  localStorage.setItem(GENERAL_PREFS_KEY, JSON.stringify(merged))
}

export function setGeneralPreference(key, value) {
  const next = { ...loadGeneralPreferences(), [key]: value }
  saveGeneralPreferences(next)
  return next
}

export function isSoundEffectsEnabled() {
  return Boolean(loadGeneralPreferences().soundEffects)
}

export function applyGeneralPreferencesToDocument(prefs) {
  if (typeof document === 'undefined') return

  const merged = { ...DEFAULT_GENERAL_PREFS, ...(prefs || {}) }
  const root = document.documentElement

  root.classList.toggle('compact-mode', Boolean(merged.compactMode))
  root.classList.toggle('reduced-motion', Boolean(merged.reducedMotion))
}

export function applyAccentToDocument(accentColor) {
  if (typeof document === 'undefined') return

  const accent = VALID_ACCENTS.includes(accentColor) ? accentColor : 'violet'
  document.documentElement.setAttribute('data-accent', accent)
}

export function normalizeChatFont(chatFont) {
  return VALID_CHAT_FONTS.includes(chatFont) ? chatFont : DEFAULT_CHAT_FONT
}

export function applyChatFontToDocument(chatFont) {
  if (typeof document === 'undefined') return

  const normalized = normalizeChatFont(chatFont)
  document.documentElement.setAttribute('data-chat-font', normalized)
}

function getChatFontStorageKey(userIdentifier) {
  const normalizedUser = String(userIdentifier || 'anonymous').trim().toLowerCase()
  return `${CHAT_FONT_PREF_KEY_PREFIX}_${normalizedUser}`
}

export function saveUserChatFontPreference(chatFont, userIdentifier) {
  if (typeof window === 'undefined') return

  const normalized = normalizeChatFont(chatFont)
  const storageKey = getChatFontStorageKey(userIdentifier)
  localStorage.setItem(storageKey, normalized)
}

export function loadUserChatFontPreference(userIdentifier) {
  if (typeof window === 'undefined') return DEFAULT_CHAT_FONT

  try {
    const storageKey = getChatFontStorageKey(userIdentifier)
    const stored = localStorage.getItem(storageKey)
    return normalizeChatFont(stored)
  } catch {
    return DEFAULT_CHAT_FONT
  }
}

export const DEFAULT_ASSISTANT_VOICE = 'voice-1'
export const ASSISTANT_VOICE_PREF_KEY_PREFIX = 'chatbox_assistant_voice_id'

export function normalizeAssistantVoice(voiceId) {
  if (!voiceId || typeof voiceId !== 'string') return DEFAULT_ASSISTANT_VOICE
  const cleanId = voiceId.trim().toLowerCase()
  const validIds = ['voice-1', 'voice-2', 'voice-3', 'voice-4', 'voice-5']
  return validIds.includes(cleanId) ? cleanId : DEFAULT_ASSISTANT_VOICE
}

function getVoiceStorageKey(userIdentifier) {
  if (!userIdentifier || userIdentifier === 'anonymous') {
    return ASSISTANT_VOICE_PREF_KEY_PREFIX
  }
  const normalizedUser = String(userIdentifier).trim().toLowerCase()
  return `${ASSISTANT_VOICE_PREF_KEY_PREFIX}_${normalizedUser}`
}

export function saveUserVoicePreference(voiceId, userIdentifier) {
  if (typeof window === 'undefined') return

  const normalized = normalizeAssistantVoice(voiceId)
  
  try {
    // 1. Save to user-scoped key if userIdentifier is provided
    if (userIdentifier && userIdentifier !== 'anonymous') {
      const userKey = getVoiceStorageKey(userIdentifier)
      localStorage.setItem(userKey, normalized)
    }

    // 2. Also save to generic key as the active device preference
    localStorage.setItem(ASSISTANT_VOICE_PREF_KEY_PREFIX, normalized)
  } catch (err) {
    console.warn('Could not save voice preference to localStorage:', err)
  }
}

export function loadUserVoicePreference(userIdentifier) {
  if (typeof window === 'undefined') return DEFAULT_ASSISTANT_VOICE

  try {
    // 1. Check user-scoped key first if userIdentifier is provided
    if (userIdentifier && userIdentifier !== 'anonymous') {
      const userKey = getVoiceStorageKey(userIdentifier)
      const userStored = localStorage.getItem(userKey)
      if (userStored) {
        return normalizeAssistantVoice(userStored)
      }
    }

    // 2. Fall back to generic device key
    const genericStored = localStorage.getItem(ASSISTANT_VOICE_PREF_KEY_PREFIX)
    if (genericStored) {
      return normalizeAssistantVoice(genericStored)
    }

    // 3. Default to Sarah (voice-1) for users who haven't chosen a voice
    return DEFAULT_ASSISTANT_VOICE
  } catch (err) {
    console.warn('Could not load voice preference from localStorage:', err)
    return DEFAULT_ASSISTANT_VOICE
  }
}

