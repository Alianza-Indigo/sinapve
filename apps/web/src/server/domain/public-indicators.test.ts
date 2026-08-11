import { describe, expect, it } from "vitest";
import { buildPublicIndicators } from "./public-indicators";
import type { CaseFile, HelpReport } from "./types";

function makeCase(severity: CaseFile["severity"], first: number, sla: number): CaseFile {
  return {
    id: `c-${Math.random()}`,
    folio: "CASO",
    reportId: "r",
    organizationId: "o",
    title: "t",
    state: "activo",
    parallelStates: [],
    severity,
    assignedTo: "x",
    firstResponseMinutes: first,
    slaMinutes: sla,
    protectionSummary: "s",
    timeline: []
  };
}

function makeReport(): HelpReport {
  return {
    id: `r-${Math.random()}`,
    folio: "F",
    mode: "anonimo",
    reporterType: "estudiante",
    organizationId: "o",
    schoolName: "s",
    municipality: "m",
    state: "e",
    description: "d",
    safetyNow: "segura",
    createdAt: new Date(0).toISOString(),
    status: "recibido",
    suggestedSeverity: "leve"
  };
}

describe("buildPublicIndicators", () => {
  it("nunca expone folios ni registros individuales", () => {
    const cases = Array.from({ length: 12 }, () => makeCase("leve", 5, 60));
    const indicators = buildPublicIndicators(Array.from({ length: 12 }, makeReport), cases);
    const serialized = JSON.stringify(indicators);
    expect(serialized).not.toContain("CASO");
    expect(serialized).not.toContain("folio");
  });

  it("suprime cifras pequenas por debajo del umbral de privacidad", () => {
    const indicators = buildPublicIndicators([makeReport(), makeReport()], [makeCase("leve", 5, 60)]);
    const reportsKpi = indicators.kpis.find((kpi) => kpi.code === "reports_received");
    expect(reportsKpi?.suppressed).toBe(true);
    expect(reportsKpi?.value).toBe("reservado por privacidad");
  });

  it("expone agregados cuando superan el umbral", () => {
    const cases = Array.from({ length: 15 }, () => makeCase("grave", 5, 60));
    const indicators = buildPublicIndicators(Array.from({ length: 20 }, makeReport), cases);
    const casesKpi = indicators.kpis.find((kpi) => kpi.code === "cases_opened");
    expect(casesKpi?.suppressed).toBe(false);
    expect(casesKpi?.value).toBe("15");
    const severityChart = indicators.charts[0];
    const grave = severityChart.series.find((point) => point.label === "grave");
    expect(grave?.value).toBe(15);
    const leve = severityChart.series.find((point) => point.label === "leve");
    expect(leve?.value).toBe(0); // 0 casos leves: no hay celda que suprimir
  });
});
