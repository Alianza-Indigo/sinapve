// EP-18 / 6.14 / 8: indicadores agregados para el portal publico. Solo expone
// cifras agregadas con umbral de privacidad; nunca folios, planteles ni
// registros individuales. Las celdas pequenas se suprimen antes de salir del
// servidor (8.1, 12.2).

import type { CaseFile, HelpReport, MetricWidget } from "./types";
import { slaCompliance, reportConversionRate } from "./metrics";
import { suppressSmallCells } from "./certified-metrics";

export type PublicKpi = {
  code: string;
  label: string;
  value: string;
  suppressed: boolean;
};

export type PublicIndicators = {
  generatedAt: string;
  minimumCellCount: number;
  kpis: PublicKpi[];
  charts: MetricWidget[];
};

// Umbral de privacidad para cifras publicas: grupos por debajo se suprimen.
const PUBLIC_MINIMUM_CELL_COUNT = 10;

function suppressScalar(value: number): { value: string; suppressed: boolean } {
  if (value > 0 && value < PUBLIC_MINIMUM_CELL_COUNT) {
    return { value: "reservado por privacidad", suppressed: true };
  }
  return { value: String(value), suppressed: false };
}

export function buildPublicIndicators(reports: HelpReport[], cases: CaseFile[], now = new Date()): PublicIndicators {
  const generatedAt = now.toISOString();

  const reportsScalar = suppressScalar(reports.length);
  const casesScalar = suppressScalar(cases.length);
  const sla = slaCompliance(cases);
  const conversion = reportConversionRate(reports, cases);

  const kpis: PublicKpi[] = [
    { code: "reports_received", label: "Solicitudes de ayuda recibidas", ...reportsScalar },
    { code: "cases_opened", label: "Expedientes abiertos", ...casesScalar },
    {
      code: "sla_compliance",
      label: "Cumplimiento de SLA",
      value: cases.length >= PUBLIC_MINIMUM_CELL_COUNT ? `${sla}%` : "reservado por privacidad",
      suppressed: cases.length > 0 && cases.length < PUBLIC_MINIMUM_CELL_COUNT
    },
    {
      code: "report_to_case_conversion",
      label: "Conversion de reporte a expediente",
      value: reports.length >= PUBLIC_MINIMUM_CELL_COUNT ? `${conversion}%` : "reservado por privacidad",
      suppressed: reports.length > 0 && reports.length < PUBLIC_MINIMUM_CELL_COUNT
    }
  ];

  const severityCounts = cases.reduce<Record<string, number>>((acc, item) => {
    acc[item.severity] = (acc[item.severity] ?? 0) + 1;
    return acc;
  }, {});
  const severitySuppression = suppressSmallCells(
    ["leve", "moderada", "grave", "critica"].map((label) => ({ label, value: severityCounts[label] ?? 0, count: severityCounts[label] ?? 0 })),
    PUBLIC_MINIMUM_CELL_COUNT
  );

  const charts: MetricWidget[] = [
    {
      id: "G03_SEVERITY_DISTRIBUTION",
      title: "Distribucion por severidad (agregada)",
      metricCodes: ["case_severity"],
      visualization: "histogram",
      valueLabel: casesScalar.suppressed ? "reservado por privacidad" : `${cases.length} casos`,
      quality: cases.length === 0 ? 0 : 95,
      updatedAt: generatedAt,
      privacySuppressedCells: severitySuppression.suppressedCount,
      series: severitySuppression.cells.map((cell) => ({ label: cell.label, value: cell.value }))
    }
  ];

  return { generatedAt, minimumCellCount: PUBLIC_MINIMUM_CELL_COUNT, kpis, charts };
}
