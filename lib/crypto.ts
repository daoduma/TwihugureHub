// lib/crypto.ts
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET environment variable is not set");
  }
  // Derive a 32-byte key from the secret
  return crypto.createHash("sha256").update(secret).digest();
}

/**
 * Encrypts a plaintext string using AES-256-CBC.
 * Returns: hex(iv) + ":" + hex(ciphertext)
 */
export function encryptApiKey(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return iv.toString("hex") + ":" + encrypted.toString("hex");
}

/**
 * Decrypts a ciphertext produced by encryptApiKey.
 */
export function decryptApiKey(ciphertext: string): string {
  const key = getKey();
  const [ivHex, encryptedHex] = ciphertext.split(":");
  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid ciphertext format");
  }
  const iv = Buffer.from(ivHex, "hex");
  const encrypted = Buffer.from(encryptedHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

/**
 * Masks an API key, showing only the last 4 characters.
 */
export function maskApiKey(plaintext: string): string {
  if (plaintext.length <= 4) return "****";
  return "•".repeat(Math.min(plaintext.length - 4, 20)) + plaintext.slice(-4);
}
