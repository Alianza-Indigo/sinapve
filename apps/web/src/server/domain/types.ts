export type Role =
  | "PUBLIC"
  | "STUDENT"
  | "FAMILY"
  | "SCHOOL_STAFF"
  | "APVE"
  | "SCHOOL_DIRECTOR"
  | "UEPE"
  | "EMIR"
  | "FEDERAL"
  | "AUDITOR"
  | "PRIVACY_OFFICER"
  | "TECH_ADMIN";

export type Severity = "leve" | "moderada" | "grave" | "critica";
export type ReportMode = "anonimo" | "confidencial" | "identificado";
export type CaseState =
  | "nuevo"
  | "en_triaje"
  | "activo"
  | "escalado"
  | "en_seguimiento"
  | "listo_para_cierre"
  | "cerrado"
  | "reabierto";

export type Sensitivity = "publico" | "interno" | "confidencial" | "altamente_sensible" | "restringido_legal";

export type Scope = {
  organizationId?: string;
  stateCode?: string;
  municipalityCode?: string;
  schoolId?: string;
  assignedCaseIds?: string[];
};

export type Actor = {
  id: string;
  name: string;
  roles: Role[];
  scope: Scope;
  mfaVerified: boolean;
};

export type Organization = {
  id: string;
  name: string;
  type: "federal" | "state" | "municipality" | "zone" | "school";
  parentId?: string;
  stateCode?: string;
  municipalityCode?: string;
};

export type HelpReport = {
  id: string;
  folio: string;
  mode: ReportMode;
  reporterType: "estudiante" | "familia" | "personal" | "comunidad";
  organizationId: string;
  schoolName: string;
  municipality: string;
  state: string;
  description: string;
  safetyNow: "segura" | "riesgo" | "emergencia";
  createdAt: string;
  status: "recibido" | "en_triaje" | "convertido_caso" | "cerrado";
  suggestedSeverity: Severity;
  aiConfidence?: number;
};

export type CaseTimelineEvent = {
  id: string;
  at: string;
  actor: string;
  title: string;
  detail: string;
  audit: boolean;
};

export type CaseFile = {
  id: string;
  folio: string;
  reportId: string;
  organizationId: string;
  title: string;
  state: CaseState;
  parallelStates: string[];
  severity: Severity;
  assignedTo: string;
  firstResponseMinutes: number;
  slaMinutes: number;
  protectionSummary: string;
  timeline: CaseTimelineEvent[];
};

export type ProtocolStep = {
  id: string;
  title: string;
  dueMinute: number;
  requiredEvidence: boolean;
  status: "pendiente" | "en_progreso" | "completado" | "bloqueado";
};

export type ProtocolRun = {
  id: string;
  caseId: string;
  protocolCode: string;
  version: number;
  startedAt: string;
  humanOwner: string;
  steps: ProtocolStep[];
};

export type MetricWidget = {
  id: string;
  title: string;
  metricCodes: string[];
  visualization: "line" | "bullet" | "histogram" | "map" | "gauge";
  valueLabel: string;
  quality: number;
  updatedAt: string;
  privacySuppressedCells: number;
  series: Array<{ label: string; value: number; target?: number }>;
};

export type PlatformModuleId =
  | "reports"
  | "cases"
  | "protocols"
  | "risk"
  | "map"
  | "interventions"
  | "escalations"
  | "institutions"
  | "directory"
  | "training"
  | "community"
  | "communications"
  | "audit"
  | "analytics"
  | "informes"
  | "privacy"
  | "adaptations"
  | "configuration"
  | "public-portal"
  | "notifications"
  | "integrations";

export type PlatformModuleSummary = {
  id: PlatformModuleId;
  title: string;
  description: string;
  href: string;
  count: number;
  statusLabel: string;
};

export type PlatformRecord = {
  id: string;
  title: string;
  status: string;
  owner: string;
  updatedAt: string;
  detail: string;
};
