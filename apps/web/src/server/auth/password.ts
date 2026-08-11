import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

// EP-01: verificación de contraseña para el admin bootstrap (login interino).
// Usa scrypt nativo de Node; no se guarda texto plano. Formato almacenado:
//   scrypt:<saltHex>:<hashHex>
// La contraseña real vive solo en la variable de entorno como hash, nunca en el repo.

const KEYLEN = 64;

export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEYLEN);
  return `scrypt:${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verifyPassword(plain: string, stored: string | undefined | null): boolean {
  if (!stored) return false;
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, saltHex, hashHex] = parts;
  let expected: Buffer;
  let salt: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }
  if (expected.length !== KEYLEN) return false;
  const actual = scryptSync(plain, salt, KEYLEN);
  return timingSafeEqual(actual, expected);
}
