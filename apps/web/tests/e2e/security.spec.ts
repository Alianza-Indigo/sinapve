import { expect, test } from "@playwright/test";

// EP / 12: controles de acceso y abuso. Verifica que las rutas sensibles no
// filtren datos sin identidad y que las entradas invalidas se rechacen.

test("las rutas de backoffice requieren identidad institucional", async ({ request }) => {
  for (const path of ["/api/v1/reports", "/api/v1/modules/audit", "/api/v1/search?q=demo", "/api/v1/dashboards/demo", "/api/v1/realtime/stream", "/api/v1/protocols/versions", "/api/v1/protocol-runs/demo"]) {
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

test("el listado de expedientes y el envio de mensajes institucionales requieren identidad", async ({ request }) => {
  for (const url of ["/api/v1/cases?limit=20&offset=0", "/api/v1/reports?limit=20&offset=0"]) {
    const response = await request.get(url);
    expect(response.status()).toBe(401);
  }
  const res = await request.post("/api/v1/reports/REP-EJEMPLO/messages", {
    data: { senderType: "reporter", body: "Solicito seguimiento" }
  });
  expect(res.status()).toBe(403);
  expect((await res.json()).error).toBe("follow_up_token_required");
});
