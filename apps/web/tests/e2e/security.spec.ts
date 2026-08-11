import { expect, test } from "@playwright/test";

// EP / 12: controles de acceso y abuso. Verifica que las rutas sensibles no
// filtren datos sin identidad y que las entradas invalidas se rechacen.

test("las rutas de backoffice requieren identidad institucional", async ({ request }) => {
  for (const path of ["/api/v1/reports", "/api/v1/modules/audit", "/api/v1/search?q=demo", "/api/v1/dashboards/demo"]) {
    const res = await request.get(path);
    expect(res.status(), `${path} deberia exigir identidad`).toBe(401);
  }
});

test("el cron de revision SLA exige el secreto", async ({ request }) => {
  const res = await request.get("/api/v1/cron/sla-review");
  // Sin CRON_SECRET configurado responde 503; con secreto mal, 403.
  expect([403, 503]).toContain(res.status());
});

test("el drenaje de cola exige el secreto", async ({ request }) => {
  const res = await request.post("/api/v1/queues/drain", { headers: { authorization: "Bearer incorrecto" } });
  expect([403, 503]).toContain(res.status());
});

test("las entradas invalidas se rechazan antes de tocar la base", async ({ request }) => {
  const res = await request.post("/api/v1/reports", { data: { mode: "invalido" } });
  expect(res.status()).toBe(400);
  expect((await res.json()).error).toBe("invalid_report");
});
