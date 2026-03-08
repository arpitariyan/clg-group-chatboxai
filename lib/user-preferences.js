const VALID_ACCENTS = ['violet', 'blue', 'emerald', 'amber', 'rose', 'indigo']

export const GENERAL_PREFS_KEY = 'chatboxai_general_prefs'

export const DEFAULT_GENERAL_PREFS = {
  compactMode: false,
  reducedMotion: false,
  soundEffects: true,
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
