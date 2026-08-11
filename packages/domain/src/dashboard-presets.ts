import type { Actor, CaseFile, HelpReport, MetricWidget, PlatformModuleId, Role } from "./types";
import { reportConversionRate, slaCompliance } from "./metrics";

// EP-17 / Sistema de Dashboards: un solo template compuesto por rol y alcance.
// Este módulo es PURO: define, por rol, qué KPIs, qué widgets certificados, qué
// paneles operativos y qué accesos rápidos se muestran, y resuelve los valores a
// partir de datos ya filtrados por permiso (ABAC). No inventa datos: si una
// métrica no tiene fuente disponible todavía, se muestra "—".

export type DashboardKpiKey =
  | "casos_activos"
  | "casos_criticos"
  | "sla_por_vencer"
  | "sla_cumplimiento"
  | "inre"
  | "intervenciones_activas"
  | "reportes_mes"
  | "casos_asignados"
  | "mis_criticos"
  | "carga_trabajo"
  | "escuelas_alcance"
  | "municipios"
  | "estados"
  | "escuelas_evaluadas"
  | "emir_disponibles"
  | "despachos"
  | "en_traslado"
  | "en_atencion"
  | "disponibilidad"
  | "redes_activas"
  | "cobertura"
  | "auditorias_activas"
  | "cumplimiento"
  | "hallazgos";

export type OperationalPanelKey =
  | "criticos"
  | "sla"
  | "alertas"
  | "seguimientos"
  | "cola"
  | "escuelas_criticas"
  | "escalamientos"
  | "emir_operacion"
  | "despachos"
  | "auditorias"
  | "hallazgos_lista";

export type DashboardPreset = {
  role: Role | "DEFAULT";
  label: string;
  scopeHint: string;
  kpis: DashboardKpiKey[];
  widgetIds: string[];
  panels: OperationalPanelKey[];
  quickActions: PlatformModuleId[];
};

const FULL_ACTIONS: PlatformModuleId[] = [
  "reports",
  "cases",
  "protocols",
  "interventions",
  "training",
  "community",
  "informes",
  "configuration"
];

export const dashboardPresets: Record<Role | "DEFAULT", DashboardPreset> = {
  SCHOOL_DIRECTOR: {
    role: "SCHOOL_DIRECTOR",
    label: "Plantel / Dirección",
    scopeHint: "Vista de su escuela",
    kpis: ["casos_activos", "casos_criticos", "sla_por_vencer", "inre", "intervenciones_activas", "reportes_mes"],
    widgetIds: ["G03_SEVERITY_DISTRIBUTION", "G01_CASES_OVER_TIME", "G05_SLA_COMPLIANCE", "G10_TERRITORIAL_RISK"],
    panels: ["criticos", "sla", "alertas", "seguimientos"],
    quickActions: FULL_ACTIONS
  },
  APVE: {
    role: "APVE",
    label: "APVE",
    scopeHint: "Casos asignados y plantel",
    kpis: ["casos_asignados", "mis_criticos", "sla_por_vencer", "carga_trabajo"],
    widgetIds: ["G03_SEVERITY_DISTRIBUTION", "G04_FIRST_RESPONSE", "G05_SLA_COMPLIANCE", "G01_CASES_OVER_TIME"],
    panels: ["cola", "seguimientos"],
    quickActions: ["reports", "cases", "protocols", "interventions"]
  },
  UEPE: {
    role: "UEPE",
    label: "Estatal / UEPE",
    scopeHint: "Estado completo",
    kpis: ["municipios", "casos_activos", "inre", "emir_disponibles"],
    widgetIds: ["G01_CASES_OVER_TIME", "G05_SLA_COMPLIANCE", "G10_TERRITORIAL_RISK", "G17_ESCALATIONS"],
    panels: ["escuelas_criticas", "emir_operacion", "sla"],
    quickActions: ["reports", "cases", "analytics", "escalations", "institutions", "informes"]
  },
  FEDERAL: {
    role: "FEDERAL",
    label: "Federal / UNPVE",
    scopeHint: "Vista nacional",
    kpis: ["estados", "casos_activos", "inre", "cobertura"],
    widgetIds: ["G01_CASES_OVER_TIME", "G05_SLA_COMPLIANCE", "G10_TERRITORIAL_RISK", "G22_AUDIT_COMPLIANCE"],
    panels: ["escuelas_criticas", "escalamientos"],
    quickActions: ["analytics", "audit", "informes", "institutions", "adaptations", "training", "community"]
  },
  EMIR: {
    role: "EMIR",
    label: "EMIR",
    scopeHint: "Despachos y disponibilidad",
    kpis: ["despachos", "en_traslado", "en_atencion", "disponibilidad"],
    widgetIds: ["G16_EMIR_CAPACITY", "G18_EXTERNAL_RESPONSE_TIME"],
    panels: ["despachos", "emir_operacion"],
    quickActions: ["cases", "escalations", "notifications"]
  },
  AUDITOR: {
    role: "AUDITOR",
    label: "Auditoría / Evaluación",
    scopeHint: "Monitoreo y cumplimiento",
    kpis: ["auditorias_activas", "escuelas_evaluadas", "cumplimiento", "hallazgos"],
    widgetIds: ["G22_AUDIT_COMPLIANCE", "G23_DATA_QUALITY", "G19_CERTIFICATION_COVERAGE", "G05_SLA_COMPLIANCE"],
    panels: ["auditorias", "hallazgos_lista", "sla"],
    quickActions: ["audit", "analytics", "informes", "institutions"]
  },
  PRIVACY_OFFICER: {
    role: "PRIVACY_OFFICER",
    label: "Privacidad",
    scopeHint: "Cumplimiento y accesos",
    kpis: ["casos_activos", "casos_criticos"],
    widgetIds: ["G23_DATA_QUALITY", "G05_SLA_COMPLIANCE"],
    panels: ["alertas"],
    quickActions: ["audit", "privacy", "configuration"]
  },
  TECH_ADMIN: {
    role: "TECH_ADMIN",
    label: "Administración técnica",
    scopeHint: "Operación de la plataforma",
    kpis: ["casos_activos", "reportes_mes"],
    widgetIds: ["G23_DATA_QUALITY", "G01_CASES_OVER_TIME"],
    panels: ["alertas"],
    quickActions: ["configuration", "integrations", "informes"]
  },
  SUPER_ADMIN: {
    role: "SUPER_ADMIN",
    label: "Superadministración",
    scopeHint: "Acceso total sin restricción",
    kpis: ["estados", "casos_activos", "casos_criticos", "inre", "reportes_mes", "cobertura"],
    widgetIds: ["G01_CASES_OVER_TIME", "G03_SEVERITY_DISTRIBUTION", "G05_SLA_COMPLIANCE", "G10_TERRITORIAL_RISK"],
    panels: ["criticos", "sla", "alertas", "escuelas_criticas"],
    quickActions: FULL_ACTIONS
  },
  // Perfiles sin panel operativo dedicado (público, estudiante, familia, personal).
  PUBLIC: minimalPreset("PUBLIC"),
  STUDENT: minimalPreset("STUDENT"),
  FAMILY: minimalPreset("FAMILY"),
  SCHOOL_STAFF: minimalPreset("SCHOOL_STAFF"),
  DEFAULT: {
    role: "DEFAULT",
    label: "Panel",
    scopeHint: "Según tu permiso",
    kpis: ["casos_activos", "casos_criticos", "reportes_mes"],
    widgetIds: ["G01_CASES_OVER_TIME", "G03_SEVERITY_DISTRIBUTION", "G05_SLA_COMPLIANCE"],
    panels: ["criticos"],
    quickActions: ["reports", "cases", "analytics"]
  }
};

function minimalPreset(role: Role): DashboardPreset {
  return {
    role,
    label: "Panel",
    scopeHint: "Según tu permiso",
    kpis: ["reportes_mes"],
    widgetIds: ["G01_CASES_OVER_TIME"],
    panels: [],
    quickActions: ["reports"]
  };
}

// Prioridad para elegir el panel primario de un actor con varios roles.
const PRESET_PRIORITY: Array<Role> = [
  "SUPER_ADMIN",
  "FEDERAL",
  "UEPE",
  "AUDITOR",
  "EMIR",
  "SCHOOL_DIRECTOR",
  "APVE",
  "PRIVACY_OFFICER",
  "TECH_ADMIN"
];

export function presetForRoles(roles: Role[]): DashboardPreset {
  for (const role of PRESET_PRIORITY) {
    if (roles.includes(role)) return dashboardPresets[role];
  }
  const first = roles.find((role) => dashboardPresets[role]);
  return first ? dashboardPresets[first] : dashboardPresets.DEFAULT;
}

// ---------------------------------------------------------------------------
// Resolución de KPIs a partir de datos ya filtrados por permiso.
// ---------------------------------------------------------------------------

export type KpiTone = "default" | "critical" | "warn" | "safe";
export type KpiDelta = { pct: number; direction: "up" | "down" };
export type ResolvedKpi = { key: DashboardKpiKey; label: string; display: string; hint?: string; tone: KpiTone; delta?: KpiDelta };

// Agregados provenientes de tablas especializadas (EMIR, intervenciones,
// auditoría, comunidad, organizaciones). Se calculan en el repositorio con SQL
// y se inyectan aquí; si faltan, los KPIs correspondientes muestran "—".
export type DashboardAggregates = {
  interventionsActive?: number;
  emirAvailable?: number;
  emirDispatched?: number;
  emirOnSite?: number;
  emirActive?: number;
  emirAvailabilityPct?: number | null;
  communityActive?: number;
  findingsOpen?: number;
  auditsActive?: number;
  auditCompliancePct?: number | null;
  schoolsTotal?: number;
  municipalitiesTotal?: number;
  statesTotal?: number;
};

export type DashboardContext = {
  actor: Actor;
  cases: CaseFile[];
  reports: HelpReport[];
  widgets: MetricWidget[];
  aggregates?: DashboardAggregates;
};

const KPI_LABELS: Record<DashboardKpiKey, string> = {
  casos_activos: "Casos activos",
  casos_criticos: "Casos críticos",
  sla_por_vencer: "SLA por vencer",
  sla_cumplimiento: "SLA cumplimiento",
  inre: "INRE",
  intervenciones_activas: "Intervenciones activas",
  reportes_mes: "Reportes este mes",
  casos_asignados: "Casos asignados",
  mis_criticos: "Mis casos críticos",
  carga_trabajo: "Carga de trabajo",
  escuelas_alcance: "Escuelas en alcance",
  municipios: "Municipios",
  estados: "Estados",
  escuelas_evaluadas: "Escuelas evaluadas",
  emir_disponibles: "EMIR disponibles",
  despachos: "Despachos",
  en_traslado: "En traslado",
  en_atencion: "En atención",
  disponibilidad: "Disponibilidad",
  redes_activas: "Redes activas",
  cobertura: "Cobertura SINAPVE",
  auditorias_activas: "Auditorías activas",
  cumplimiento: "Cumplimiento",
  hallazgos: "Hallazgos abiertos"
};

const activeCases = (cases: CaseFile[]) => cases.filter((c) => c.state !== "cerrado");
const criticalCases = (cases: CaseFile[]) => cases.filter((c) => c.severity === "critica");
const slaAtRisk = (cases: CaseFile[]) => activeCases(cases).filter((c) => c.firstResponseMinutes >= c.slaMinutes);

function reportsInMonth(reports: HelpReport[], year: number, month: number) {
  return reports.filter((r) => {
    const d = new Date(r.createdAt);
    return d.getUTCFullYear() === year && d.getUTCMonth() === month;
  }).length;
}

function reportsThisMonth(reports: HelpReport[]) {
  const now = new Date();
  return reportsInMonth(reports, now.getUTCFullYear(), now.getUTCMonth());
}

// Delta mes-contra-mes REAL de reportes (única serie temporal disponible sin
// histórico adicional). No se inventan deltas para otros KPIs.
function reportsMonthDelta(reports: HelpReport[]): KpiDelta | undefined {
  const now = new Date();
  const current = reportsInMonth(reports, now.getUTCFullYear(), now.getUTCMonth());
  const prev = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const previous = reportsInMonth(reports, prev.getUTCFullYear(), prev.getUTCMonth());
  if (previous === 0) return undefined;
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return undefined;
  return { pct: Math.abs(pct), direction: pct >= 0 ? "up" : "down" };
}

function inreIndex(ctx: DashboardContext) {
  return Math.max(0, Math.min(100, reportConversionRate(ctx.reports, ctx.cases)));
}

function inreTone(value: number): KpiTone {
  if (value >= 66) return "critical";
  if (value >= 33) return "warn";
  return "safe";
}

function distinctCount<T>(items: T[], key: (item: T) => string | undefined) {
  const set = new Set<string>();
  for (const item of items) {
    const value = key(item);
    if (value) set.add(value);
  }
  return set.size;
}

const na = (key: DashboardKpiKey, hint = "Sin fuente conectada"): ResolvedKpi => ({
  key,
  label: KPI_LABELS[key],
  display: "—",
  hint,
  tone: "default"
});

export function resolveKpi(key: DashboardKpiKey, ctx: DashboardContext): ResolvedKpi {
  const label = KPI_LABELS[key];
  switch (key) {
    case "casos_activos":
      return { key, label, display: String(activeCases(ctx.cases).length), tone: "default" };
    case "casos_criticos":
    case "mis_criticos": {
      const n = criticalCases(ctx.cases).length;
      return { key, label, display: String(n), tone: n > 0 ? "critical" : "safe" };
    }
    case "casos_asignados": {
      const assigned = ctx.actor.scope.assignedCaseIds?.length ?? activeCases(ctx.cases).length;
      return { key, label, display: String(assigned), tone: "default" };
    }
    case "sla_por_vencer": {
      const n = slaAtRisk(ctx.cases).length;
      return { key, label, display: String(n), hint: n > 0 ? "En riesgo de incumplir" : undefined, tone: n > 0 ? "warn" : "safe" };
    }
    case "sla_cumplimiento": {
      if (ctx.cases.length === 0) return { key, label, display: "—", tone: "default" };
      return { key, label, display: `${slaCompliance(ctx.cases)}%`, tone: "default" };
    }
    case "inre": {
      const v = inreIndex(ctx);
      const level = v >= 66 ? "Riesgo Alto" : v >= 33 ? "Riesgo Medio" : "Riesgo Bajo";
      return { key, label, display: String(v), hint: level, tone: inreTone(v) };
    }
    case "reportes_mes":
      return { key, label, display: String(reportsThisMonth(ctx.reports)), tone: "default", delta: reportsMonthDelta(ctx.reports) };
    case "escuelas_alcance":
    case "escuelas_evaluadas": {
      const total = ctx.aggregates?.schoolsTotal;
      const value = total ?? distinctCount([...ctx.cases, ...ctx.reports], (item) => item.organizationId);
      return { key, label, display: String(value), tone: "default" };
    }
    case "municipios": {
      const value = ctx.aggregates?.municipalitiesTotal ?? distinctCount(ctx.reports, (r) => r.municipality);
      return { key, label, display: value > 0 ? String(value) : "—", tone: "default" };
    }
    case "estados": {
      const value = ctx.aggregates?.statesTotal ?? distinctCount(ctx.reports, (r) => r.state);
      return { key, label, display: value > 0 ? String(value) : "—", tone: "default" };
    }
    case "carga_trabajo": {
      // Carga real = casos activos visibles del actor (sin capacidad configurada,
      // no se expresa como % inventado).
      const value = activeCases(ctx.cases).length;
      return { key, label, display: String(value), hint: "casos activos", tone: "default" };
    }
    case "intervenciones_activas":
      return numberOrDash(key, label, ctx.aggregates?.interventionsActive);
    case "emir_disponibles":
      return numberOrDash(key, label, ctx.aggregates?.emirAvailable, "safe");
    case "despachos":
      return numberOrDash(key, label, ctx.aggregates?.emirActive);
    case "en_traslado":
      return numberOrDash(key, label, ctx.aggregates?.emirDispatched, "warn");
    case "en_atencion":
      return numberOrDash(key, label, ctx.aggregates?.emirOnSite);
    case "disponibilidad":
      return percentOrDash(key, label, ctx.aggregates?.emirAvailabilityPct);
    case "redes_activas":
      return numberOrDash(key, label, ctx.aggregates?.communityActive);
    case "auditorias_activas":
      return numberOrDash(key, label, ctx.aggregates?.auditsActive);
    case "cumplimiento":
      return percentOrDash(key, label, ctx.aggregates?.auditCompliancePct);
    case "hallazgos": {
      const value = ctx.aggregates?.findingsOpen;
      if (value == null) return na(key);
      return { key, label, display: String(value), tone: value > 0 ? "warn" : "safe" };
    }
    case "cobertura": {
      const total = ctx.aggregates?.schoolsTotal;
      if (!total) return na(key);
      const active = distinctCount([...ctx.cases, ...ctx.reports], (item) => item.organizationId);
      return { key, label, display: `${Math.min(100, Math.round((active / total) * 100))}%`, tone: "default" };
    }
    default:
      return na(key);
  }
}

function numberOrDash(key: DashboardKpiKey, label: string, value: number | undefined, tone: KpiTone = "default"): ResolvedKpi {
  if (value == null) return na(key);
  return { key, label, display: String(value), tone: value > 0 || tone === "default" ? tone : "safe" };
}

function percentOrDash(key: DashboardKpiKey, label: string, value: number | null | undefined): ResolvedKpi {
  if (value == null) return { key, label, display: "—", hint: "Sin fuente conectada", tone: "default" };
  return { key, label, display: `${value}%`, tone: "default" };
}

// ---------------------------------------------------------------------------
// Paneles operativos.
// ---------------------------------------------------------------------------

export type PanelItem = { id: string; primary: string; secondary?: string; meta?: string; tone?: KpiTone };
export type DashboardPanel = { key: OperationalPanelKey; title: string; items: PanelItem[]; href?: string; emptyText: string };

const PANEL_TITLES: Record<OperationalPanelKey, string> = {
  criticos: "Casos críticos",
  sla: "SLA próximos a vencer",
  alertas: "Alertas activas",
  seguimientos: "Seguimientos activos",
  cola: "Mi cola de trabajo",
  escuelas_criticas: "Escuelas con casos críticos",
  escalamientos: "Escalamientos",
  emir_operacion: "EMIR en operación",
  despachos: "Despachos",
  auditorias: "Auditorías",
  hallazgos_lista: "Hallazgos"
};

export function buildPanel(key: OperationalPanelKey, ctx: DashboardContext): DashboardPanel {
  const title = PANEL_TITLES[key];
  switch (key) {
    case "criticos": {
      const items = criticalCases(ctx.cases)
        .slice(0, 4)
        .map((c) => ({ id: c.id, primary: c.folio, secondary: c.title, meta: c.severity, tone: "critical" as KpiTone }));
      return { key, title, items, href: "/backoffice/cases", emptyText: "Sin casos críticos activos." };
    }
    case "sla": {
      const items = slaAtRisk(ctx.cases)
        .sort((a, b) => a.slaMinutes - a.firstResponseMinutes - (b.slaMinutes - b.firstResponseMinutes))
        .slice(0, 4)
        .map((c) => ({ id: c.id, primary: c.folio, secondary: c.title, meta: `${Math.max(0, c.slaMinutes - c.firstResponseMinutes)} min`, tone: "warn" as KpiTone }));
      return { key, title, items, href: "/backoffice/cases", emptyText: "Ningún SLA en riesgo inmediato." };
    }
    case "seguimientos": {
      const items = activeCases(ctx.cases)
        .slice(0, 4)
        .map((c) => ({ id: c.id, primary: c.folio, secondary: c.assignedTo, meta: c.state }));
      return { key, title, items, href: "/backoffice/cases", emptyText: "Sin seguimientos activos." };
    }
    case "cola": {
      const items = ctx.reports
        .filter((r) => r.status === "recibido" || r.status === "en_triaje")
        .slice(0, 4)
        .map((r) => ({ id: r.id, primary: r.folio, secondary: r.schoolName, meta: r.status }));
      return { key, title, items, href: "/backoffice/reports", emptyText: "Cola de reportes vacía." };
    }
    case "escuelas_criticas": {
      const orgs = new Map<string, number>();
      for (const c of criticalCases(ctx.cases)) orgs.set(c.organizationId, (orgs.get(c.organizationId) ?? 0) + 1);
      const items = [...orgs.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([org, n]) => ({ id: org, primary: org, meta: `${n} críticos`, tone: "critical" as KpiTone }));
      return { key, title, items, href: "/backoffice/institutions", emptyText: "Sin escuelas con casos críticos." };
    }
    case "alertas": {
      const items: PanelItem[] = [];
      const crit = criticalCases(ctx.cases).length;
      const risk = slaAtRisk(ctx.cases).length;
      const untriaged = ctx.reports.filter((r) => r.status === "recibido").length;
      if (crit > 0) items.push({ id: "a-crit", primary: `${crit} caso(s) crítico(s) activo(s)`, tone: "critical" });
      if (risk > 0) items.push({ id: "a-sla", primary: `${risk} SLA en riesgo de incumplir`, tone: "warn" });
      if (untriaged > 0) items.push({ id: "a-triage", primary: `${untriaged} reporte(s) sin triaje`, tone: "warn" });
      return { key, title, items, href: "/backoffice/reports", emptyText: "Sin alertas del sistema." };
    }
    // Paneles cuya fuente se conecta en una fase posterior.
    case "escalamientos":
    case "emir_operacion":
    case "despachos":
    case "auditorias":
    case "hallazgos_lista":
    default:
      return { key, title, items: [], emptyText: "Disponible al conectar su fuente de datos." };
  }
}

export function buildDashboardPanels(preset: DashboardPreset, ctx: DashboardContext): DashboardPanel[] {
  return preset.panels.map((key) => buildPanel(key, ctx));
}

export function resolveKpis(preset: DashboardPreset, ctx: DashboardContext): ResolvedKpi[] {
  return preset.kpis.map((key) => resolveKpi(key, ctx));
}
