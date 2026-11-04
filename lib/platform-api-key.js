/**
 * Platform API Key Generator & Hasher
 * Handles generation and hashing of user-facing API keys
 * Format: cbx_live_<32-char-random> or cbx_test_<32-char-random>
 */

import crypto from 'crypto';

const KEY_PREFIX_LIVE = 'cbx_live_';
const KEY_PREFIX_TEST = 'cbx_test_';
const KEY_SUFFIX_LENGTH = 32;

/**
 * Generate a new platform API key
 * @param {string} environment - 'live' or 'test'
 * @returns {string} Full API key
 */
export function generatePlatformApiKey(environment = 'live') {
  const prefix = environment === 'test' ? KEY_PREFIX_TEST : KEY_PREFIX_LIVE;
  const randomSuffix = crypto.randomBytes(KEY_SUFFIX_LENGTH).toString('hex').slice(0, KEY_SUFFIX_LENGTH);
  return `${prefix}${randomSuffix}`;
}

/**
 * Hash an API key using SHA-256
 * @param {string} apiKey - Full API key
 * @returns {string} Hashed key
 */
export function hashPlatformApiKey(apiKey) {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

function getEncryptionSecret() {
  const secret = process.env.API_KEY_ENCRYPTION_SECRET || process.env.APPWRITE_API_KEY || process.env.SUBSCRIPTION_CHECK_SECRET || '';
  if (!secret) {
    throw new Error('API key encryption secret is not configured. Set API_KEY_ENCRYPTION_SECRET.');
  }
  return secret;
}

function deriveEncryptionKey() {
  return crypto.createHash('sha256').update(getEncryptionSecret()).digest();
}

export function encryptPlatformApiKey(apiKey) {
  if (!apiKey) {
    throw new Error('API key is required for encryption.');
  }

  const key = deriveEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(apiKey, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return {
    encrypted_key: encrypted.toString('base64'),
    encrypted_key_iv: iv.toString('base64'),
    encrypted_key_tag: tag.toString('base64'),
  };
}

export function decryptPlatformApiKey({ encrypted_key, encrypted_key_iv, encrypted_key_tag }) {
  if (!encrypted_key || !encrypted_key_iv || !encrypted_key_tag) {
    return null;
  }

  const key = deriveEncryptionKey();
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(encrypted_key_iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(encrypted_key_tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encrypted_key, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

/**
 * Verify an API key matches its hash
 * @param {string} apiKey - Full API key
 * @param {string} hash - Hashed key
 * @returns {boolean} True if key matches hash
 */
export function verifyPlatformApiKey(apiKey, hash) {
  return hashPlatformApiKey(apiKey) === hash;
}

/**
 * Extract the last 8 characters of an API key for display
 * @param {string} apiKey - Full API key
 * @returns {string} Last 8 characters
 */
export function getPlatformKeyLastDigits(apiKey) {
  return apiKey.slice(-8);
}

/**
 * Extract environment from API key (live/test)
 * @param {string} apiKey - Full API key
 * @returns {string|null} 'live', 'test', or null if invalid
 */
export function getPlatformKeyEnvironment(apiKey) {
  if (apiKey.startsWith(KEY_PREFIX_LIVE)) return 'live';
  if (apiKey.startsWith(KEY_PREFIX_TEST)) return 'test';
  return null;
}

/**
 * Validate API key format
 * @param {string} apiKey - Full API key
 * @returns {boolean} True if valid format
 */
export function isValidPlatformApiKeyFormat(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return false;
  const env = getPlatformKeyEnvironment(apiKey);
  if (!env) return false;
  const minLength = (env === 'live' ? KEY_PREFIX_LIVE : KEY_PREFIX_TEST).length + KEY_SUFFIX_LENGTH;
  return apiKey.length >= minLength;
}
