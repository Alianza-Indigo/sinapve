import { describe, expect, it } from "vitest";
import { presetForRoles, resolveKpi, buildPanel, type DashboardContext } from "./dashboard-presets";
import type { Actor, CaseFile, HelpReport } from "./types";

function caseFile(overrides: Partial<CaseFile>): CaseFile {
  return {
    id: overrides.id ?? "case_1",
    folio: overrides.folio ?? "CASO-1",
    reportId: "rep_1",
    organizationId: overrides.organizationId ?? "org_1",
    title: overrides.title ?? "Caso",
    state: overrides.state ?? "en_seguimiento",
    parallelStates: [],
    severity: overrides.severity ?? "moderada",
    assignedTo: overrides.assignedTo ?? "APVE",
    firstResponseMinutes: overrides.firstResponseMinutes ?? 10,
    slaMinutes: overrides.slaMinutes ?? 30,
    protectionSummary: "",
    timeline: []
  };
}

function report(overrides: Partial<HelpReport>): HelpReport {
  return {
    id: overrides.id ?? "rep_1",
    folio: overrides.folio ?? "SNPV-1",
    mode: "anonimo",
    reporterType: "estudiante",
    organizationId: overrides.organizationId ?? "org_1",
    schoolName: "Escuela",
    municipality: overrides.municipality ?? "Municipio",
    state: overrides.state ?? "Estado",
    description: "",
    safetyNow: "segura",
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    status: overrides.status ?? "recibido",
    suggestedSeverity: "moderada"
  };
}

const actor: Actor = { id: "u1", name: "Actor", roles: ["SCHOOL_DIRECTOR"], scope: {} };

function ctx(cases: CaseFile[], reports: HelpReport[]): DashboardContext {
  return { actor, cases, reports, widgets: [] };
}

describe("dashboard presets", () => {
  it("selects the preset by role priority", () => {
    expect(presetForRoles(["SUPER_ADMIN"]).label).toBe("Superadministración");
    expect(presetForRoles(["FEDERAL", "APVE"]).label).toBe("Federal / UNPVE");
    expect(presetForRoles(["APVE"]).label).toBe("APVE");
    expect(presetForRoles(["EMIR"]).role).toBe("EMIR");
  });

  it("falls back to a minimal preset for non-operational roles", () => {
    expect(presetForRoles(["STUDENT"]).panels).toHaveLength(0);
  });

  it("every preset references valid quick-action modules and at least one KPI", () => {
    for (const roles of [["SCHOOL_DIRECTOR"], ["APVE"], ["UEPE"], ["EMIR"], ["FEDERAL"], ["AUDITOR"], ["SUPER_ADMIN"]] as const) {
      const preset = presetForRoles([...roles]);
      expect(preset.kpis.length).toBeGreaterThan(0);
      expect(preset.quickActions.length).toBeGreaterThan(0);
    }
  });
});

describe("kpi resolution", () => {
  it("computes active and critical case counts from scoped data", () => {
    const cases = [
      caseFile({ id: "a", severity: "critica", state: "en_seguimiento" }),
      caseFile({ id: "b", severity: "moderada", state: "cerrado" }),
      caseFile({ id: "c", severity: "leve", state: "activo" })
    ];
    const context = ctx(cases, []);
    expect(resolveKpi("casos_activos", context).display).toBe("2");
    const crit = resolveKpi("casos_criticos", context);
    expect(crit.display).toBe("1");
    expect(crit.tone).toBe("critical");
  });

  it("counts reports of the current month", () => {
    const context = ctx([], [report({ createdAt: new Date().toISOString() })]);
    expect(resolveKpi("reportes_mes", context).display).toBe("1");
  });

  it("returns an honest dash for KPIs without a data source", () => {
    expect(resolveKpi("emir_disponibles", ctx([], [])).display).toBe("—");
    expect(resolveKpi("cobertura", ctx([], [])).display).toBe("—");
  });

  it("uses specialized aggregates when provided", () => {
    const context: DashboardContext = {
      actor,
      cases: [caseFile({ id: "a", organizationId: "org_1" })],
      reports: [],
      widgets: [],
      aggregates: {
        emirAvailable: 8,
        emirActive: 5,
        emirAvailabilityPct: 60,
        findingsOpen: 45,
        auditCompliancePct: 78,
        schoolsTotal: 4
      }
    };
    expect(resolveKpi("emir_disponibles", context).display).toBe("8");
    expect(resolveKpi("despachos", context).display).toBe("5");
    expect(resolveKpi("disponibilidad", context).display).toBe("60%");
    const findings = resolveKpi("hallazgos", context);
    expect(findings.display).toBe("45");
    expect(findings.tone).toBe("warn");
    expect(resolveKpi("cumplimiento", context).display).toBe("78%");
    // 1 escuela con actividad de 4 totales = 25%
    expect(resolveKpi("cobertura", context).display).toBe("25%");
  });
});

describe("operational panels", () => {
  it("lists critical cases", () => {
    const cases = [caseFile({ id: "a", severity: "critica", folio: "CASO-A" }), caseFile({ id: "b", severity: "leve" })];
    const panel = buildPanel("criticos", ctx(cases, []));
    expect(panel.items).toHaveLength(1);
    expect(panel.items[0].primary).toBe("CASO-A");
  });

  it("derives system alerts from data", () => {
    const cases = [caseFile({ id: "a", severity: "critica" })];
    const panel = buildPanel("alertas", ctx(cases, [report({ status: "recibido" })]));
    expect(panel.items.length).toBeGreaterThan(0);
  });
});
