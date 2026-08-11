import { createHmac, timingSafeEqual } from "crypto";

// EP-01 / 12.1: verificacion de la firma del gateway de identidad. El gateway
// institucional firma los encabezados de identidad con una clave compartida
// (SINAPVE_GATEWAY_SIGNING_KEY). La aplicacion verifica la firma para no confiar
// ciegamente en encabezados falsificables. Cuando la clave no esta enlazada, la
// verificacion queda deshabilitada (modo desarrollo), coherente con la
// convencion de configuracion del repositorio.

const signedHeaderNames = [
  "x-sinapve-user-id",
  "x-sinapve-user-name",
  "x-sinapve-roles",
  "x-sinapve-organization-id",
  "x-sinapve-state-code",
  "x-sinapve-municipality-code",
  "x-sinapve-school-id",
  "x-sinapve-assigned-cases"
];

export type SignatureVerification =
  | { enabled: false; valid: true; reason: "signing_disabled" }
  | { enabled: true; valid: true; reason: "verified" }
  | { enabled: true; valid: false; reason: "missing_signature" | "invalid_signature" | "stale_timestamp" };

export function isGatewaySigningEnabled() {
  return Boolean(process.env.SINAPVE_GATEWAY_SIGNING_KEY);
}

// Mensaje canonico: timestamp + cada encabezado firmado en orden fijo. Evita
// ambiguedad de orden y ataques de reordenamiento.
function canonicalMessage(headers: Headers, timestamp: string) {
  const parts = [timestamp];
  for (const name of signedHeaderNames) {
    parts.push(`${name}=${headers.get(name) ?? ""}`);
  }
  return parts.join("\n");
}

export function verifyGatewaySignature(headers: Headers, now = Date.now(), maxSkewMs = 5 * 60_000): SignatureVerification {
  const key = process.env.SINAPVE_GATEWAY_SIGNING_KEY;
  if (!key) return { enabled: false, valid: true, reason: "signing_disabled" };

  const signature = headers.get("x-sinapve-signature");
  const timestamp = headers.get("x-sinapve-timestamp");
  if (!signature || !timestamp) return { enabled: true, valid: false, reason: "missing_signature" };

  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > maxSkewMs) {
    return { enabled: true, valid: false, reason: "stale_timestamp" };
  }

  const expected = createHmac("sha256", key).update(canonicalMessage(headers, timestamp)).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signature, "base64url");
  } catch {
    return { enabled: true, valid: false, reason: "invalid_signature" };
  }
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
    return { enabled: true, valid: false, reason: "invalid_signature" };
  }
  return { enabled: true, valid: true, reason: "verified" };
}

// Utilidad para gateways/pruebas: produce la firma canonica de un conjunto de
// encabezados con la clave compartida.
export function signGatewayHeaders(headers: Headers, key: string, timestamp: string) {
  return createHmac("sha256", key).update(canonicalMessage(headers, timestamp)).digest("base64url");
}
