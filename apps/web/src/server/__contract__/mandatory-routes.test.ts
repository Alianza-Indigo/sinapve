import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Contrato: cada recurso minimo del PRD (10.2) debe existir como route handler.
// Verifica la correspondencia especificacion -> implementacion sin arrancar el
// servidor.
const apiRoot = join(process.cwd(), "src", "app", "api", "v1");

function routeFileFor(endpoint: string): string {
  const segments = endpoint
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.replace(/^\{(.+)\}$/, "[$1]"));
  return join(apiRoot, ...segments, "route.ts");
}

const mandatoryEndpoints = [
  "reports",
  "reports/{reportId}/status",
  "reports/{reportId}/messages",
  "cases",
  "cases/{caseId}",
  "cases/{caseId}/assignments",
  "cases/{caseId}/events",
  "cases/{caseId}/protocol-runs",
  "protocol-runs/{runId}/steps/{stepId}/complete",
  "cases/{caseId}/referrals",
  "cases/{caseId}/interventions",
  "cases/{caseId}/close",
  "cases/{caseId}/reopen",
  "dashboards/{dashboardId}",
  "metrics/{metricCode}",
  "maps/risk",
  "ai/classifications",
  "ai/summaries",
  "ai/feedback",
  "certifications/verify/{publicCode}",
  "report-jobs"
];

describe("PRD 10.2 mandatory API resources", () => {
  it.each(mandatoryEndpoints)("implements /api/v1/%s", (endpoint) => {
    expect(existsSync(routeFileFor(endpoint)), `Falta route handler para ${endpoint}`).toBe(true);
  });
});
