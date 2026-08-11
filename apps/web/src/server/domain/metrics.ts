import type { CaseFile, HelpReport, MetricWidget } from "./types";

export function firstResponseMinutes(caseFile: Pick<CaseFile, "firstResponseMinutes">) {
  return caseFile.firstResponseMinutes;
}

export function slaCompliance(cases: Array<Pick<CaseFile, "firstResponseMinutes" | "slaMinutes">>) {
  if (cases.length === 0) return 0;
  const compliant = cases.filter((item) => item.firstResponseMinutes <= item.slaMinutes).length;
  return Math.round((compliant / cases.length) * 100);
}

export function openCaseAgeBuckets(cases: CaseFile[], now = new Date()) {
  const buckets = [
    { label: "0-7 dias", value: 0 },
    { label: "8-30 dias", value: 0 },
    { label: "31+ dias", value: 0 }
  ];

  for (const item of cases) {
    const created = new Date(item.timeline[0]?.at ?? now);
    const days = Math.floor((now.getTime() - created.getTime()) / 86_400_000);
    if (days <= 7) buckets[0].value += 1;
    else if (days <= 30) buckets[1].value += 1;
    else buckets[2].value += 1;
  }

  return buckets;
}

export function buildCertifiedWidgets(reports: HelpReport[], cases: CaseFile[]): MetricWidget[] {
  const updatedAt = new Date().toISOString();
  const averageFirstResponse =
    cases.length === 0 ? 0 : Math.round(cases.reduce((sum, item) => sum + item.firstResponseMinutes, 0) / cases.length);
  const sla = slaCompliance(cases);
  const territorialRisk = Math.max(0, Math.min(100, Math.round(reportConversionRate(reports, cases))));
  const quality = reports.length + cases.length === 0 ? 0 : 95;

  return [
    {
      id: "G01_CASES_OVER_TIME",
      title: "Casos por periodo",
      metricCodes: ["cases_created"],
      visualization: "line",
      valueLabel: `${cases.length} casos`,
      quality,
      updatedAt,
      privacySuppressedCells: 0,
      series: cases.map((item) => ({ label: item.folio, value: 1 }))
    },
    {
      id: "G04_FIRST_RESPONSE",
      title: "Tiempo de primera respuesta",
      metricCodes: ["first_response_minutes"],
      visualization: "histogram",
      valueLabel: `${averageFirstResponse} min promedio`,
      quality,
      updatedAt,
      privacySuppressedCells: 0,
      series: cases.map((item) => ({ label: item.folio, value: item.firstResponseMinutes, target: item.slaMinutes }))
    },
    {
      id: "G05_SLA_COMPLIANCE",
      title: "Cumplimiento de SLA",
      metricCodes: ["sla_compliance"],
      visualization: "bullet",
      valueLabel: `${sla}%`,
      quality,
      updatedAt,
      privacySuppressedCells: 0,
      series: cases.length === 0 ? [] : [{ label: "SLA", value: sla, target: 90 }]
    },
    {
      id: "G07_OPEN_CASE_AGE",
      title: "Antiguedad de casos abiertos",
      metricCodes: ["open_case_age"],
      visualization: "histogram",
      valueLabel: `${cases.filter((item) => item.state !== "cerrado").length} abiertos`,
      quality,
      updatedAt,
      privacySuppressedCells: 0,
      series: openCaseAgeBuckets(cases)
    },
    {
      id: "G10_TERRITORIAL_RISK",
      title: "Mapa territorial de riesgo",
      metricCodes: ["inre"],
      visualization: "map",
      valueLabel: `${territorialRisk}/100`,
      quality,
      updatedAt,
      privacySuppressedCells: reports.length < 5 ? reports.length : 0,
      series: reports.map((item) => ({
        label: item.municipality || item.state || item.organizationId,
        value:
          item.suggestedSeverity === "critica"
            ? 100
            : item.suggestedSeverity === "grave"
              ? 75
              : item.suggestedSeverity === "moderada"
                ? 50
                : 25
      }))
    },
    {
      id: "G19_CERTIFICATION_COVERAGE",
      title: "Cobertura de certificacion",
      metricCodes: ["certification_coverage"],
      visualization: "gauge",
      valueLabel: "0%",
      quality: 0,
      updatedAt,
      privacySuppressedCells: 0,
      series: []
    }
  ];
}

export function reportConversionRate(reports: HelpReport[], cases: CaseFile[]) {
  if (reports.length === 0) return 0;
  return Math.round((cases.length / reports.length) * 100);
}
