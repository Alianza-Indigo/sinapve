import { afterEach, describe, expect, it } from "vitest";
import { signGatewayHeaders, verifyGatewaySignature } from "./gateway-signature";

const KEY = "clave-compartida-de-prueba-para-gateway";

function buildHeaders(overrides: Record<string, string> = {}) {
  const headers = new Headers({
    "x-sinapve-user-id": "u-1",
    "x-sinapve-roles": "APVE",
    "x-sinapve-organization-id": "org-1"
  });
  for (const [key, value] of Object.entries(overrides)) headers.set(key, value);
  return headers;
}

afterEach(() => {
  delete process.env.SINAPVE_GATEWAY_SIGNING_KEY;
});

describe("verifyGatewaySignature", () => {
  it("queda deshabilitada sin clave enlazada (modo desarrollo)", () => {
    const result = verifyGatewaySignature(buildHeaders());
    expect(result).toEqual({ enabled: false, valid: true, reason: "signing_disabled" });
  });

  it("acepta una firma valida y vigente", () => {
    process.env.SINAPVE_GATEWAY_SIGNING_KEY = KEY;
    const now = 1_760_000_000_000;
    const ts = String(now);
    const headers = buildHeaders();
    headers.set("x-sinapve-timestamp", ts);
    headers.set("x-sinapve-signature", signGatewayHeaders(headers, KEY, ts));
    const result = verifyGatewaySignature(headers, now);
    expect(result.valid).toBe(true);
  });

  it("rechaza cuando falta la firma", () => {
    process.env.SINAPVE_GATEWAY_SIGNING_KEY = KEY;
    const result = verifyGatewaySignature(buildHeaders(), 1_760_000_000_000);
    expect(result).toMatchObject({ enabled: true, valid: false, reason: "missing_signature" });
  });

  it("rechaza una firma manipulada", () => {
    process.env.SINAPVE_GATEWAY_SIGNING_KEY = KEY;
    const now = 1_760_000_000_000;
    const ts = String(now);
    const headers = buildHeaders();
    headers.set("x-sinapve-timestamp", ts);
    headers.set("x-sinapve-signature", signGatewayHeaders(headers, KEY, ts));
    headers.set("x-sinapve-roles", "TECH_ADMIN"); // altera un encabezado firmado
    const result = verifyGatewaySignature(headers, now);
    expect(result).toMatchObject({ valid: false, reason: "invalid_signature" });
  });

  it("rechaza un timestamp fuera de ventana", () => {
    process.env.SINAPVE_GATEWAY_SIGNING_KEY = KEY;
    const now = 1_760_000_000_000;
    const ts = String(now - 10 * 60_000);
    const headers = buildHeaders();
    headers.set("x-sinapve-timestamp", ts);
    headers.set("x-sinapve-signature", signGatewayHeaders(headers, KEY, ts));
    const result = verifyGatewaySignature(headers, now);
    expect(result).toMatchObject({ valid: false, reason: "stale_timestamp" });
  });
});
