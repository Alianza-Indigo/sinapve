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

  it("builds the 32 required dashboard widgets from the PRD catalog", () => {
    const widgets = buildCertifiedWidgets(reports, cases);
    expect(widgets.map((widget) => widget.id)).toEqual([
      "G01_CASES_OVER_TIME",
      "G02_REPORTS_VS_CONFIRMED",
      "G03_SEVERITY_DISTRIBUTION",
      "G04_FIRST_RESPONSE",
      "G05_SLA_COMPLIANCE",
      "G06_ATTENTION_FUNNEL",
      "G07_OPEN_CASE_AGE",
      "G08_RECURRENCE",
      "G09_VIOLENCE_CATEGORIES",
      "G10_TERRITORIAL_RISK",
      "G11_INRE_TREND",
      "G12_INRE_FACTORS",
      "G13_RISK_CAPACITY_MATRIX",
      "G14_AI_ALERTS",
      "G15_APVE_WORKLOAD",
      "G16_EMIR_CAPACITY",
      "G17_ESCALATIONS",
      "G18_EXTERNAL_RESPONSE_TIME",
      "G19_CERTIFICATION_COVERAGE",
      "G20_TRAINING_PROGRESS",
      "G21_RECERTIFICATIONS",
      "G22_AUDIT_COMPLIANCE",
      "G23_DATA_QUALITY",
      "G24_SAFETY_PERCEPTION",
      "G25_ADJUSTED_INCIDENCE",
      "G26_NEURODIVERGENT_INCLUSION",
      "G27_SCHOOL_RETENTION",
      "G28_DID_IMPACT",
      "G29_TERRITORIAL_COVERAGE",
      "G30_BUDGET_EXECUTION",
      "G31_CAMPAIGNS",
      "G32_SATISFACTION_TRUST"
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
