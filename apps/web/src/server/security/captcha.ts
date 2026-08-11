// EP-02 / 6.2: captcha adaptativo y protección anti-abuso del reporte. Activable
// por configuración y DESACTIVADO por defecto: si no hay proveedor enlazado, el
// reporte no exige captcha (nunca bloquear la solicitud de ayuda por config).
// Proveedor soportado: Cloudflare Turnstile.

export type CaptchaProvider = "turnstile" | "none";

export function captchaProvider(): CaptchaProvider {
  return process.env.SINAPVE_CAPTCHA_PROVIDER === "turnstile" ? "turnstile" : "none";
}

// Solo se exige captcha cuando hay proveedor Y su secreto configurados.
export function isCaptchaEnabled(): boolean {
  return captchaProvider() === "turnstile" && Boolean(process.env.SINAPVE_TURNSTILE_SECRET);
}

export type CaptchaResult = { ok: boolean; skipped: boolean; reason?: string };

export async function verifyCaptcha(token: string | undefined, remoteIp?: string | null): Promise<CaptchaResult> {
  if (!isCaptchaEnabled()) {
    return { ok: true, skipped: true, reason: "captcha_disabled" };
  }
  if (!token) {
    return { ok: false, skipped: false, reason: "missing_token" };
  }
  try {
    const form = new URLSearchParams();
    form.set("secret", process.env.SINAPVE_TURNSTILE_SECRET!);
    form.set("response", token);
    if (remoteIp) form.set("remoteip", remoteIp);
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form
    });
    const data = (await response.json().catch(() => ({}))) as { success?: boolean };
    return { ok: Boolean(data.success), skipped: false, reason: data.success ? "verified" : "rejected" };
  } catch {
    // Un fallo del verificador no debe tumbar el reporte de ayuda: se registra
    // como no verificado pero se permite continuar (fail-open para protección).
    return { ok: true, skipped: true, reason: "verifier_unavailable" };
  }
}
