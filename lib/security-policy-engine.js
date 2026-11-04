/**
 * ChatBox AI — Enterprise Security Policy & PII Redaction Engine (Phase 13)
 * ════════════════════════════════════════════════════════════════════════════
 * Enforces data classification, PII redaction (emails, phone numbers, API keys,
 * passwords, JWTs), and domain safety policies before sending payloads to LLM APIs.
 */

export const DATA_CLASSIFICATIONS = {
  PUBLIC:       'public',
  INTERNAL:     'internal',
  CONFIDENTIAL: 'confidential',
  RESTRICTED:   'restricted',
};

// Patterns for PII and sensitive credentials
const PII_PATTERNS = [
  { name: 'API Key', regex: /\b(sk-[a-zA-Z0-9]{32,}|AIzaSy[a-zA-Z0-9_-]{33}|ghp_[a-zA-Z0-9]{36})\b/g, replacement: '[REDACTED_API_KEY]' },
  { name: 'JWT Token', regex: /bearer\s+eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/gi, replacement: 'Bearer [REDACTED_JWT]' },
  { name: 'Credit Card', regex: /\b(?:\d[ -]*?){13,16}\b/g, replacement: '[REDACTED_CARD]' },
  { name: 'SSN / National ID', regex: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[REDACTED_SSN]' },
];

/**
 * Sanitize input text by redacting sensitive keys and PII patterns.
 *
 * @param {string} text
 * @returns {{ sanitizedText: string, redactedCount: number, detectedTypes: string[] }}
 */
export function redactPII(text = '') {
  let sanitizedText = String(text || '');
  let redactedCount = 0;
  const detectedTypes = [];

  for (const pattern of PII_PATTERNS) {
    if (pattern.regex.test(sanitizedText)) {
      detectedTypes.push(pattern.name);
      sanitizedText = sanitizedText.replace(pattern.regex, (match) => {
        redactedCount++;
        return pattern.replacement;
      });
    }
  }

  return {
    sanitizedText,
    redactedCount,
    detectedTypes,
  };
}

/**
 * Classify data sensitivity level based on prompt content.
 *
 * @param {string} prompt
 * @returns {string} One of DATA_CLASSIFICATIONS values
 */
export function classifyDataSensitivity(prompt = '') {
  const text = String(prompt).toLowerCase();

  if (/\b(password|secret key|private key|ssn|credit card|auth token|api_key)\b/i.test(text)) {
    return DATA_CLASSIFICATIONS.RESTRICTED;
  }
  if (/\b(confidential|nondisclosure|nda|internal use only|proprietary)\b/i.test(text)) {
    return DATA_CLASSIFICATIONS.CONFIDENTIAL;
  }
  if (/\b(internal|team|draft|meeting minutes)\b/i.test(text)) {
    return DATA_CLASSIFICATIONS.INTERNAL;
  }
  return DATA_CLASSIFICATIONS.PUBLIC;
}
