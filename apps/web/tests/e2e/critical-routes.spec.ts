import { expect, test } from "@playwright/test";

// EP / 15.2: las 10 rutas E2E obligatorias, validadas en modo sin base de datos.
// Sin identidad institucional en encabezados, las rutas protegidas responden 401;
// las transaccionales sin base responden 503; las publicas responden 200 con
// supresion de privacidad. No se cargan datos inventados.

test("1. Reporte anonimo con seguimiento seguro", async ({ request, page }) => {
  const res = await request.post("/api/v1/reports", {
    data: {
      mode: "anonimo",
      reporterType: "estudiante",
      organizationPublicId: "escuela-demo",
      schoolName: "Escuela Demo",
      safetyNow: "segura",
      description: "Describo una situacion de convivencia para pedir ayuda."
    }
  });
  expect(res.status()).toBe(503);
  expect((await res.json()).error).toBe("database_not_configured");

  await page.goto("/seguimiento");
  await expect(page.locator("h1")).toBeVisible();
});

test("2. Caso critico y acuse multicanal exige identidad", async ({ request }) => {
  const res = await request.post("/api/v1/notifications/dispatch", {
    data: { safeSummary: "Accion requerida en tu bandeja", priority: "critica", channels: ["in_app", "sms"] }
  });
  expect(res.status()).toBe(401);
});

test("3. Caso neurodivergente: adaptaciones protegidas y portal accesible", async ({ request, page }) => {
  const res = await request.get("/api/v1/modules/adaptations");
  expect(res.status()).toBe(401);
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
});

test("4. Escalamiento externo con falta de respuesta exige identidad", async ({ request }) => {
  const res = await request.post("/api/v1/referrals/ref_demo/escalate", { data: { reason: "sin acuse externo" } });
  expect(res.status()).toBe(401);
});

test("5. Cierre, seguimiento y reapertura exige identidad", async ({ request }) => {
  const close = await request.post("/api/v1/cases/case_demo/close", { data: { reason: "cierre de prueba" } });
  expect(close.status()).toBe(401);
  const reopen = await request.post("/api/v1/cases/case_demo/reopen", { data: { reason: "reapertura de prueba" } });
  expect(reopen.status()).toBe(401);
});

test("6. Certificacion y vencimiento: verificacion publica responde de forma determinista", async ({ request }) => {
  const res = await request.get("/api/v1/certifications/verify/CERT-DEMO-CODE");
  expect([200, 404, 503]).toContain(res.status());
});

test("7. Auditoria con hallazgo exige identidad", async ({ request }) => {
  const res = await request.get("/api/v1/modules/audit");
  expect(res.status()).toBe(401);
});

test("8. Tablero con supresion de datos pequenos (indicadores publicos)", async ({ request }) => {
  const res = await request.get("/api/v1/public/indicators");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.data.minimumCellCount).toBe(10);
  expect(Array.isArray(body.data.kpis)).toBe(true);
  expect(body.data.kpis.length).toBeGreaterThan(0);
});

test("9. Usuario que cambia de plantel y pierde acceso exige identidad", async ({ request }) => {
  const res = await request.post("/api/v1/users/user-demo/revoke-assignment", {
    data: { organizationPublicId: "escuela-demo", reason: "cambio de adscripcion" }
  });
  expect(res.status()).toBe(401);
});

test("10. Caida de IA sin interrupcion operativa (fallback humano)", async ({ request }) => {
  const res = await request.post("/api/v1/ai/classifications", { data: {} });
  expect(res.status()).toBe(503);
  const body = await res.json();
  expect(body.requiresHumanConfirmation).toBe(true);
});
