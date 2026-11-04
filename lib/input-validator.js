/**
 * Input Validator — Sanitization and validation helpers
 * 
 * Use these functions to sanitize and validate all user-supplied data
 * before using it in database queries, API calls, or responses.
 */

// ---------------------------------------------------------------------------
// String utilities
// ---------------------------------------------------------------------------

/**
 * Sanitize a string: trim whitespace, remove control characters, enforce max length.
 * @param {unknown} value - Raw input
 * @param {number} maxLength - Maximum allowed length (default: 1000)
 * @returns {string}
 */
export function sanitizeString(value, maxLength = 1000) {
  if (value === null || value === undefined) return '';
  // Convert to string, trim, and strip ASCII control characters (except tab/newline)
  const str = String(value)
    .trim()
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  return str.slice(0, maxLength);
}

// ---------------------------------------------------------------------------
// Email validation
// ---------------------------------------------------------------------------

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

/**
 * Validate an email address.
 * @param {string} value
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateEmail(value) {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Email is required' };
  }
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length > 254) {
    return { valid: false, error: 'Email address is too long' };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid email address format' };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Password validation
// ---------------------------------------------------------------------------

/**
 * Validate password strength.
 * Requirements: min 8 chars, max 128 chars, at least one uppercase, one digit, one special char.
 * @param {string} value
 * @returns {{ valid: boolean, error?: string }}
 */
export function validatePassword(value) {
  if (!value || typeof value !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (value.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (value.length > 128) {
    return { valid: false, error: 'Password must not exceed 128 characters' };
  }
  if (!/[A-Z]/.test(value)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[0-9]/.test(value)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(value)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// Document ID validation (Appwrite IDs are alphanumeric + underscore, up to 36 chars)
// ---------------------------------------------------------------------------

const DOC_ID_REGEX = /^[a-zA-Z0-9_-]{1,36}$/;

/**
 * Validate an Appwrite document ID.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidDocumentId(value) {
  return typeof value === 'string' && DOC_ID_REGEX.test(value);
}

// ---------------------------------------------------------------------------
// OTP validation
// ---------------------------------------------------------------------------

/**
 * Validate a 6-digit OTP.
 * @param {string} value
 * @returns {boolean}
 */
export function isValidOtp(value) {
  return typeof value === 'string' && /^\d{6}$/.test(value.trim());
}

// ---------------------------------------------------------------------------
// URL validation
// ---------------------------------------------------------------------------

/**
 * Validate that a string is a safe HTTP/HTTPS URL (no javascript: or data: URIs).
 * @param {string} value
 * @returns {boolean}
 */
export function isValidHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// General
// ---------------------------------------------------------------------------

/**
 * Check if a value is a non-empty string after sanitization.
 * @param {unknown} value
 * @returns {boolean}
 */
export function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Clamp a number between min and max, with a fallback default.
 * Useful for pagination params.
 * @param {unknown} value
 * @param {number} defaultVal
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function clampInt(value, defaultVal = 1, min = 1, max = 100) {
  const n = parseInt(value, 10);
  if (isNaN(n)) return defaultVal;
  return Math.min(max, Math.max(min, n));
}
