import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password (admin bootstrap)", () => {
  it("verifica la contrasena correcta contra su hash scrypt", () => {
    const hash = hashPassword("ClaveInstitucional-2026");
    expect(hash.startsWith("scrypt:")).toBe(true);
    expect(verifyPassword("ClaveInstitucional-2026", hash)).toBe(true);
  });

  it("rechaza contrasena incorrecta", () => {
    const hash = hashPassword("ClaveInstitucional-2026");
    expect(verifyPassword("otra-clave", hash)).toBe(false);
  });

  it("rechaza hash ausente o con formato invalido", () => {
    expect(verifyPassword("x", undefined)).toBe(false);
    expect(verifyPassword("x", "no-es-un-hash")).toBe(false);
    expect(verifyPassword("x", "scrypt:zz:zz")).toBe(false);
  });
});
