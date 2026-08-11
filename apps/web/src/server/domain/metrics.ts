import type { CaseFile, HelpReport, MetricWidget, Severity } from "./types";

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

function severityWeight(severity: Severity) {
  if (severity === "critica") return 100;
  if (severity === "grave") return 75;
  if (severity === "moderada") return 50;
  return 25;
}

function bySeverity(cases: CaseFile[]) {
  const counts: Record<Severity, number> = { leve: 0, moderada: 0, grave: 0, critica: 0 };
  for (const item of cases) counts[item.severity] += 1;
  return Object.entries(counts).map(([label, value]) => ({ label, value }));
}

function zeroWidget(id: string, title: string, metricCodes: string[], updatedAt: string): MetricWidget {
  return {
    id,
    title,
    metricCodes,
    visualization: "line",
    valueLabel: "0",
    quality: 0,
    updatedAt,
    privacySuppressedCells: 0,
    series: []
  };
}

export function buildCertifiedWidgets(reports: HelpReport[], cases: CaseFile[]): MetricWidget[] {
  const updatedAt = new Date().toISOString();
  const averageFirstResponse =
    cases.length === 0 ? 0 : Math.round(cases.reduce((sum, item) => sum + item.firstResponseMinutes, 0) / cases.length);
  const sla = slaCompliance(cases);
  const territorialRisk = Math.max(0, Math.min(100, Math.round(reportConversionRate(reports, cases))));
  const quality = reports.length + cases.length === 0 ? 0 : 95;
  const openCases = cases.filter((item) => item.state !== "cerrado");
  const criticalCases = cases.filter((item) => item.severity === "critica").length;

  const widgets: MetricWidget[] = [
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
      id: "G02_REPORTS_VS_CONFIRMED",
      title: "Reportes vs. casos confirmados",
      metricCodes: ["reports_received", "cases_confirmed"],
      visualization: "histogram",
      valueLabel: `${reports.length}/${cases.length}`,
      quality,
      updatedAt,
      privacySuppressedCells: 0,
      series: [
        { label: "Reportes", value: reports.length },
        { label: "Casos", value: cases.length }
      ]
    },
    {
      id: "G03_SEVERITY_DISTRIBUTION",
      title: "Distribucion por severidad",
      metricCodes: ["case_severity"],
      visualization: "histogram",
      valueLabel: `${criticalCases} criticos`,
      quality,
      updatedAt,
      privacySuppressedCells: 0,
      series: bySeverity(cases)
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
      id: "G06_ATTENTION_FUNNEL",
      title: "Embudo de atencion",
      metricCodes: ["report_to_case_conversion"],
      visualization: "histogram",
      valueLabel: `${reportConversionRate(reports, cases)}%`,
      quality,
      updatedAt,
      privacySuppressedCells: 0,
      series: [
        { label: "Reporte", value: reports.length },
        { label: "Triaje", value: reports.filter((item) => item.status !== "recibido").length },
        { label: "Caso", value: cases.length },
        { label: "Seguimiento", value: cases.filter((item) => item.state === "en_seguimiento").length },
        { label: "Cierre", value: cases.filter((item) => item.state === "cerrado").length }
      ]
    },
    {
      id: "G07_OPEN_CASE_AGE",
      title: "Antiguedad de casos abiertos",
      metricCodes: ["open_case_age"],
      visualization: "histogram",
      valueLabel: `${openCases.length} abiertos`,
      quality,
      updatedAt,
      privacySuppressedCells: 0,
      series: openCaseAgeBuckets(openCases)
    },
    zeroWidget("G08_RECURRENCE", "Reincidencia", ["case_recurrence"], updatedAt),
    zeroWidget("G09_VIOLENCE_CATEGORIES", "Categorias de violencia", ["violence_category_rate"], updatedAt),
    {
      id: "G10_TERRITORIAL_RISK",
      title: "Mapa territorial de riesgo",
      metricCodes: ["inre"],
      visualization: "map",
      valueLabel: `${territorialRisk}/100`,
      quality,
      updatedAt,
      privacySuppressedCells: reports.length > 0 && reports.length < 5 ? reports.length : 0,
      series: reports.map((item) => ({ label: item.municipality || item.state || item.organizationId, value: severityWeight(item.suggestedSeverity) }))
    },
    zeroWidget("G11_INRE_TREND", "Tendencia INRE", ["inre_trend"], updatedAt),
    zeroWidget("G12_INRE_FACTORS", "Factores del INRE", ["inre_factor_contribution"], updatedAt),
    zeroWidget("G13_RISK_CAPACITY_MATRIX", "Matriz riesgo-capacidad", ["risk_capacity"], updatedAt),
    zeroWidget("G14_AI_ALERTS", "Alertas IA", ["ai_alerts"], updatedAt),
    zeroWidget("G15_APVE_WORKLOAD", "Carga de trabajo APVE", ["apve_weighted_cases"], updatedAt),
    zeroWidget("G16_EMIR_CAPACITY", "Capacidad EMIR", ["emir_capacity"], updatedAt),
    zeroWidget("G17_ESCALATIONS", "Escalamientos", ["referral_flow"], updatedAt),
    zeroWidget("G18_EXTERNAL_RESPONSE_TIME", "Tiempo de respuesta externa", ["external_ack_minutes"], updatedAt),
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
    },
    zeroWidget("G20_TRAINING_PROGRESS", "Progreso de formacion", ["training_progress"], updatedAt),
    zeroWidget("G21_RECERTIFICATIONS", "Proximas recertificaciones", ["recertification_due"], updatedAt),
    zeroWidget("G22_AUDIT_COMPLIANCE", "Cumplimiento de auditoria", ["audit_closed_ratio"], updatedAt),
    zeroWidget("G23_DATA_QUALITY", "Calidad de datos", ["data_quality"], updatedAt),
    zeroWidget("G24_SAFETY_PERCEPTION", "Percepcion de seguridad", ["ipse"], updatedAt),
    zeroWidget("G25_ADJUSTED_INCIDENCE", "Incidencia ajustada", ["adjusted_incidence"], updatedAt),
    zeroWidget("G26_NEURODIVERGENT_INCLUSION", "Inclusion neurodivergente", ["reasonable_adjustments"], updatedAt),
    zeroWidget("G27_SCHOOL_RETENTION", "Permanencia escolar", ["school_retention"], updatedAt),
    zeroWidget("G28_DID_IMPACT", "Impacto DiD", ["difference_in_differences"], updatedAt),
    zeroWidget("G29_TERRITORIAL_COVERAGE", "Cobertura territorial", ["active_schools"], updatedAt),
    zeroWidget("G30_BUDGET_EXECUTION", "Ejecucion presupuestal", ["budget_execution"], updatedAt),
    zeroWidget("G31_CAMPAIGNS", "Campanas", ["campaign_reach"], updatedAt),
    zeroWidget("G32_SATISFACTION_TRUST", "Satisfaccion y confianza", ["trust_score"], updatedAt)
  ];

  return widgets;
}

export function reportConversionRate(reports: HelpReport[], cases: CaseFile[]) {
  if (reports.length === 0) return 0;
  return Math.round((cases.length / reports.length) * 100);
}
