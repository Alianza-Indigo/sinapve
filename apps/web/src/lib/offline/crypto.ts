import { keysStore } from "./db";

// Cifrado local del borrador (13.1: "captura cifrada local"). AES-GCM con una
// clave de dispositivo NO exportable, generada una vez y guardada en IndexedDB.
// El texto sensible del reporte nunca queda en claro en el almacenamiento local.

const KEY_ID = "device-aes-gcm";

async function getDeviceKey(): Promise<CryptoKey> {
  const existing = (await keysStore.get(KEY_ID)) as CryptoKey | undefined;
  if (existing) return existing;
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  await keysStore.put(KEY_ID, key); // CryptoKey no exportable se persiste como objeto estructurado
  return key;
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function encryptJson(payload: unknown): Promise<string> {
  const key = await getDeviceKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new TextEncoder().encode(JSON.stringify(payload));
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data));
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return toBase64(packed);
}

export async function decryptJson<T>(ciphertext: string): Promise<T> {
  const key = await getDeviceKey();
  const packed = fromBase64(ciphertext);
  const iv = packed.slice(0, 12); // slice copia a un ArrayBuffer propio (BufferSource)
  const data = packed.slice(12);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}
