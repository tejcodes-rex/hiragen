/**
 * AES-256-GCM encryption utility for storing user integration credentials.
 */

import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY || 'a]1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b';
  // Accept 64-char hex string → 32 bytes
  if (hex.length === 64) return Buffer.from(hex, 'hex');
  // Fallback: hash whatever was provided into 32 bytes
  return crypto.createHash('sha256').update(hex).digest();
}

/**
 * Encrypt plaintext → "iv:authTag:ciphertext" (all base64)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
}

/**
 * Decrypt "iv:authTag:ciphertext" → plaintext
 */
export function decrypt(encrypted: string): string {
  const key = getKey();
  const [ivB64, authTagB64, ciphertext] = encrypted.split(':');

  if (!ivB64 || !authTagB64 || !ciphertext) {
    throw new Error('Invalid encrypted format');
  }

  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'base64', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
