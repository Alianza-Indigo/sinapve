import { describe, expect, it } from "vitest";
import { buildCertifiedWidgets, reportConversionRate, slaCompliance } from "./metrics";
import type { CaseFile, HelpReport } from "./types";

const reports: HelpReport[] = [
  {
    id: "rep_001",
    folio: "SNPV-001",
    mode: "confidencial",
    reporterType: "estudiante",
    organizationId: "org_001",
    schoolName: "Plantel fixture",
    municipality: "001",
    state: "CHH",
    description: "Riesgo observado",
    safetyNow: "riesgo",
    createdAt: "2026-08-10T18:30:00Z",
    status: "convertido_caso",
    suggestedSeverity: "grave"
  }
];

const cases: CaseFile[] = [
  {
    id: "case_001",
    folio: "CASO-001",
    reportId: "rep_001",
    organizationId: "org_001",
    title: "Caso fixture",
    state: "activo",
    parallelStates: [],
    severity: "grave",
    assignedTo: "APVE",
    firstResponseMinutes: 10,
    slaMinutes: 30,
    protectionSummary: "Proteccion registrada",
    timeline: [{ id: "event_001", at: "2026-08-10T18:30:00Z", actor: "APVE", title: "Inicio", detail: "Fixture", audit: true }]
  }
];

describe("certified metrics", () => {
  it("calculates SLA compliance from server-side case facts", () => {
    expect(slaCompliance(cases)).toBe(100);
  });

  it("builds the six required initial dashboard widgets", () => {
    const widgets = buildCertifiedWidgets(reports, cases);
    expect(widgets.map((widget) => widget.id)).toEqual([
      "G01_CASES_OVER_TIME",
      "G04_FIRST_RESPONSE",
      "G05_SLA_COMPLIANCE",
      "G07_OPEN_CASE_AGE",
      "G10_TERRITORIAL_RISK",
      "G19_CERTIFICATION_COVERAGE"
    ]);
  });

  it("keeps conversion formula deterministic", () => {
    expect(reportConversionRate(reports, cases)).toBe(100);
  });

  it("does not invent operational values when the database has no rows", () => {
    const widgets = buildCertifiedWidgets([], []);
    expect(widgets.every((widget) => widget.quality === 0 || widget.id === "G19_CERTIFICATION_COVERAGE")).toBe(true);
    expect(widgets.find((widget) => widget.id === "G01_CASES_OVER_TIME")?.series).toEqual([]);
  });
});
