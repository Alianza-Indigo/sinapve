import { afterEach, describe, expect, it } from "vitest";
import { decryptSensitiveText, encryptSensitiveText, FieldEncryptionNotConfiguredError, sha256Digest } from "./field-crypto";

const originalKey = process.env.SINAPVE_FIELD_ENCRYPTION_KEY;

afterEach(() => {
  process.env.SINAPVE_FIELD_ENCRYPTION_KEY = originalKey;
});

describe("field crypto", () => {
  it("encrypts and decrypts sensitive text without returning plaintext storage", () => {
    process.env.SINAPVE_FIELD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef";
    const encrypted = encryptSensitiveText("relato sensible");
    expect(encrypted).not.toContain("relato sensible");
    expect(decryptSensitiveText(encrypted)).toBe("relato sensible");
  });

  it("requires a configured key for new sensitive writes", () => {
    delete process.env.SINAPVE_FIELD_ENCRYPTION_KEY;
    expect(() => encryptSensitiveText("x")).toThrow(FieldEncryptionNotConfiguredError);
  });

  it("generates stable sha256 digests", () => {
    expect(sha256Digest("sinapve")).toHaveLength(64);
    expect(sha256Digest("sinapve")).toBe(sha256Digest("sinapve"));
  });
});
