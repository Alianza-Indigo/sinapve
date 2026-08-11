import { afterEach, describe, expect, it } from "vitest";
import { captchaProvider, isCaptchaEnabled, verifyCaptcha } from "./captcha";

afterEach(() => {
  delete process.env.SINAPVE_CAPTCHA_PROVIDER;
  delete process.env.SINAPVE_TURNSTILE_SECRET;
});

describe("captcha (activable por env, default off)", () => {
  it("esta desactivado por defecto", () => {
    expect(captchaProvider()).toBe("none");
    expect(isCaptchaEnabled()).toBe(false);
  });

  it("no exige captcha cuando esta desactivado (fail-open)", async () => {
    const result = await verifyCaptcha(undefined);
    expect(result).toMatchObject({ ok: true, skipped: true, reason: "captcha_disabled" });
  });

  it("requiere proveedor Y secreto para habilitarse", () => {
    process.env.SINAPVE_CAPTCHA_PROVIDER = "turnstile";
    expect(isCaptchaEnabled()).toBe(false); // falta secreto
    process.env.SINAPVE_TURNSTILE_SECRET = "s";
    expect(isCaptchaEnabled()).toBe(true);
  });

  it("rechaza cuando esta habilitado y falta el token", async () => {
    process.env.SINAPVE_CAPTCHA_PROVIDER = "turnstile";
    process.env.SINAPVE_TURNSTILE_SECRET = "s";
    const result = await verifyCaptcha(undefined);
    expect(result).toMatchObject({ ok: false, reason: "missing_token" });
  });
});
