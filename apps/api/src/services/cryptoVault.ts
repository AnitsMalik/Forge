import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Resolves a 32-byte Buffer key from the environment or fallback.
 */
function resolveMasterKey(customKeyHex?: string): Buffer {
  const envKey = customKeyHex || process.env.ENCRYPTION_MASTER_KEY;
  if (envKey) {
    if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
      return Buffer.from(envKey, 'hex');
    }
    // Hash non-64-hex strings to guarantee a 32-byte key
    return crypto.createHash('sha256').update(envKey).digest();
  }
  // Standard fallback for local development environments
  return crypto.createHash('sha256').update('socialforge-local-dev-master-encryption-key-2026').digest();
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Output format: ivHex:authTagHex:ciphertextHex
 */
export function encryptSecret(plainText: string, masterKeyHex?: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = resolveMasterKey(masterKeyHex);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an AES-256-GCM encrypted string formatted as ivHex:authTagHex:ciphertextHex.
 */
export function decryptSecret(cipherString: string, masterKeyHex?: string): string {
  if (!cipherString) return '';
  const parts = cipherString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid ciphertext format. Expected iv:authTag:ciphertext');
  }

  const [ivHex, authTagHex, encryptedText] = parts;
  const key = resolveMasterKey(masterKeyHex);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Tests if a string matches the ivHex:authTagHex:ciphertextHex AES-GCM pattern.
 */
export function isEncryptedSecret(value: string): boolean {
  if (!value || typeof value !== 'string') return false;
  const parts = value.split(':');
  if (parts.length !== 3) return false;
  return parts[0].length === 32 && parts[1].length === 32 && parts[2].length > 0;
}

/**
 * Returns a masked representation of a secret for secure API serialization.
 */
export function maskSecret(secret: string): string {
  if (!secret) return '••••••••';
  const clean = secret.length > 8 ? secret.slice(-4) : '••••';
  return `••••••••••••••••${clean}`;
}
