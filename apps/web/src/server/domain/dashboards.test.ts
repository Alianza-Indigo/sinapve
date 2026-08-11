import { describe, expect, it } from "vitest";
import { validateDashboardWidgets } from "./dashboards";
import { certifiedMetrics, suppressSmallCells } from "./certified-metrics";

describe("validateDashboardWidgets", () => {
  it("acepta widgets del catalogo certificado", () => {
    const result = validateDashboardWidgets([{ id: "G01_CASES_OVER_TIME", visualization: "line", metric_codes: ["cases_created"] }]);
    expect(result.valid).toBe(true);
  });

  it("rechaza widgets fuera del catalogo", () => {
    const result = validateDashboardWidgets([{ id: "CUSTOM_WIDGET", visualization: "line" }]);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("no_pertenece_al_catalogo");
  });

  it("rechaza SQL o formulas libres en el constructor", () => {
    const result = validateDashboardWidgets([{ id: "G02_REPORTS", visualization: "line", query: "SELECT * FROM cases" }]);
    expect(result.valid).toBe(false);
  });

  it("rechaza visualizaciones no permitidas", () => {
    const result = validateDashboardWidgets([{ id: "G03_SEVERITY", visualization: "pie" }]);
    expect(result.valid).toBe(false);
  });
});

describe("certified metrics", () => {
  it("incluye las siete formulas certificadas del PRD 8.3", () => {
    expect(certifiedMetrics.map((metric) => metric.code)).toEqual([
      "tasa_incidencia",
      "tiempo_primera_respuesta",
      "cumplimiento_sla",
      "tasa_reincidencia_6m",
      "cobertura_certificacion",
      "escalamiento_efectivo",
      "completitud_dato"
    ]);
  });

  it("suprime celdas por debajo del umbral de privacidad", () => {
    const result = suppressSmallCells(
      [
        { label: "Plantel A", value: 3, count: 3 },
        { label: "Plantel B", value: 42, count: 42 }
      ],
      10
    );
    expect(result.suppressedCount).toBe(1);
    expect(result.cells[0]).toMatchObject({ suppressed: true, value: 0 });
    expect(result.cells[1]).toMatchObject({ suppressed: false, value: 42 });
  });
});
