import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const prefix = "sinapve:v1:";

export class FieldEncryptionNotConfiguredError extends Error {
  constructor() {
    super("SINAPVE_FIELD_ENCRYPTION_KEY is required for sensitive field encryption.");
  }
}

function getKey() {
  const secret = process.env.SINAPVE_FIELD_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) throw new FieldEncryptionNotConfiguredError();
  return createHash("sha256").update(secret).digest();
}

export function encryptSensitiveText(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${prefix}${Buffer.concat([iv, tag, ciphertext]).toString("base64url")}`;
}

export function decryptSensitiveText(value: string | null | undefined) {
  if (!value) return "";
  if (!value.startsWith(prefix)) return value;

  const packed = Buffer.from(value.slice(prefix.length), "base64url");
  const iv = packed.subarray(0, 12);
  const tag = packed.subarray(12, 28);
  const ciphertext = packed.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function sha256Digest(value: ArrayBuffer | string) {
  return createHash("sha256").update(typeof value === "string" ? value : Buffer.from(value)).digest("hex");
}
