/**
 * Token Encryption Module
 * AES-256-GCM encryption/decryption for OAuth tokens
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits auth tag

/**
 * Get encryption key from environment variable
 * @returns {Buffer} 32-byte encryption key
 */
function getEncryptionKey() {
  const keyHex = process.env.APP_TOKEN_ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('APP_TOKEN_ENCRYPTION_KEY environment variable is not set');
  }
  // Derive a 32-byte key from the env variable using SHA-256
  return crypto.createHash('sha256').update(keyHex).digest();
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param {string} plaintext - The text to encrypt
 * @returns {{ ciphertext: string, iv: string, tag: string }} Encrypted data with IV and auth tag (all base64)
 */
export function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string');
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
  };
}

/**
 * Decrypt a ciphertext string using AES-256-GCM
 * @param {string} ciphertext - Base64 encoded ciphertext
 * @param {string} iv - Base64 encoded initialization vector
 * @param {string} tag - Base64 encoded authentication tag
 * @returns {string} Decrypted plaintext
 */
export function decrypt(ciphertext, iv, tag) {
  if (!ciphertext || !iv || !tag) {
    throw new Error('Ciphertext, IV, and tag are all required for decryption');
  }

  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(tag, 'base64'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(ciphertext, 'base64')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}
