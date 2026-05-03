// __tests__/unit/crypto.test.ts
// NEW: Unit tests for encrypt/decrypt round trip
import { encryptApiKey, decryptApiKey, maskApiKey } from "@/lib/crypto";

describe("crypto", () => {
  beforeEach(() => {
    process.env.ENCRYPTION_SECRET = "test-secret-32-chars-padding-ok!";
  });

  test("encrypt/decrypt round trip returns original plaintext", () => {
    const original = "sk-ant-api03-testkey12345";
    const encrypted = encryptApiKey(original);
    const decrypted = decryptApiKey(encrypted);
    expect(decrypted).toBe(original);
  });

  test("encrypted value is different from plaintext", () => {
    const key = "my-api-key";
    const encrypted = encryptApiKey(key);
    expect(encrypted).not.toBe(key);
  });

  test("different encryptions of same key produce different ciphertexts (random IV)", () => {
    const key = "my-api-key";
    const enc1 = encryptApiKey(key);
    const enc2 = encryptApiKey(key);
    expect(enc1).not.toBe(enc2);
    // But both decrypt to same value
    expect(decryptApiKey(enc1)).toBe(key);
    expect(decryptApiKey(enc2)).toBe(key);
  });

  test("decrypt throws on invalid ciphertext format", () => {
    expect(() => decryptApiKey("invalid-format")).toThrow("Invalid ciphertext format");
  });

  test("maskApiKey shows only last 4 characters", () => {
    const masked = maskApiKey("sk-ant-api03-testkey12345");
    expect(masked).toMatch(/2345$/);
    expect(masked).not.toContain("sk-ant");
  });

  test("maskApiKey handles short keys", () => {
    const masked = maskApiKey("ab");
    expect(masked).toBe("****");
  });
});
