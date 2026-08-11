import { nanoid } from "nanoid";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { DatabaseNotConfiguredError, getDb, isDatabaseConfigured } from "../db";
import { decryptSensitiveText, encryptSensitiveText, sha256Digest } from "../security/field-crypto";
import {
  auditEvents,
  auditFindings,
  aiFeedback,
  aiDecisionLogs,
  aiModelRegistry,
  approvedDocuments,
  breakGlassGrants,
  caseAssignments,
  caseEvidenceFiles,
  caseEvents,
  caseFieldVersions,
  caseParticipants,
  cases,
  clinicalCompartments,
  communityInitiatives,
  communityProposals,
  communicationCampaigns,
  consentRecords,
  contextualAdaptations,
  contentPosts,
  dashboardLayouts,
  emirDispatches,
  generatedReports,
  interventionPlans,
  institutionalBodies,
  institutionalBodyMembers,
  institutionalSessions,
  integrationEvents,
  mediationReviews,
  metricDefinitions,
  metricExports,
  notificationTemplates,
  notifications,
  organizations,
  privacyProcessingRecords,
  privacyRequests,
  protocolApprovals,
  protocolMigrations,
  protocolStepEvents,
  protocolRuns,
  protocolSimulations,
  protocolVersions,
  protectionMeasures,
  publicResources,
  referrals,
  reportMessages,
  reportIntakeChecks,
  serviceDirectoryEntries,
  reports,
  retentionPolicies,
  systemConfigurations,
  territorialPoints,
  riskScores,
  surveyResponses,
  enrollmentFigures,
  schoolRetention,
  impactMeasurements,
  budgetLines,
  trainingAssessments,
  trainingCohorts,
  trainingEnrollments,
  trainingPrograms,
  userSessions,
  userAssignments,
  users
} from "../db/schema";
import { suggestSeverity } from "../domain/protocols";
import {
  compileProtocolGraph,
  deriveProtocolRunState,
  graphFromSteps,
  normalizeStoredSteps,
  validateBranchChoice,
  validateProtocolGraph,
  type ProtocolGraph,
  type ProtocolRunEvent,
  type ProtocolRunState
} from "../domain/protocol-graph";
import { evaluateMediation } from "../domain/mediation";
import { isReferralOverdue } from "../domain/sla";
import { validateDashboardWidgets } from "../domain/dashboards";
import { buildCertifiedWidgets } from "../domain/metrics";
import { buildPublicIndicators } from "../domain/public-indicators";
import { canReadCase, canReadReport } from "../domain/access";
import { presetForRoles, resolveKpis, buildDashboardPanels } from "../domain/dashboard-presets";
import { claimDueJobs, completeJob, failJob } from "./jobs";
import { enqueueDurable } from "../jobs/adapter";
import { rankDocuments, extractiveSnippet } from "../ai/rag";
import { callAiGateway, isAiConfigured } from "../ai/gateway";
import { containsSensitiveDetail, shouldDeliver, type NotificationPriority } from "../notifications/policy";
import { dispatchToChannel, type NotificationChannel } from "../notifications/dispatch";
import type { Actor, CaseFile, CaseState, CaseTimelineEvent, HelpReport, PlatformModuleId, PlatformModuleSummary, PlatformRecord, ReportMode, Severity } from "../domain/types";

export type LiveDataStatus = {
  databaseConfigured: boolean;
  reports: number;
  cases: number;
};

const moduleCopy: Record<PlatformModuleId, Omit<PlatformModuleSummary, "count" | "statusLabel">> = {
  reports: { id: "reports", title: "Reportes", description: "Solicitudes de ayuda, senales preventivas y triaje inicial.", href: "/backoffice/reports" },
  cases: { id: "cases", title: "Casos", description: "Expedientes de convivencia, lineas de tiempo y seguimiento.", href: "/backoffice/cases" },
  protocols: { id: "protocols", title: "Protocolos", description: "Versiones, hitos SLA, rutas de actuacion y ejecuciones.", href: "/backoffice/protocols" },
  risk: { id: "risk", title: "Alertas y riesgo", description: "Definiciones metricas, INRE, mapas y supresion de celdas pequenas.", href: "/backoffice/risk" },
  map: { id: "map", title: "Mapa", description: "Mapa territorial de riesgo, cobertura y capacidad con privacidad aplicada.", href: "/backoffice/map" },
  interventions: { id: "interventions", title: "Intervenciones", description: "Planes individuales, ajustes razonables y revisiones.", href: "/backoffice/interventions" },
  escalations: { id: "escalations", title: "Escalamiento", description: "Referencias, acuses, circuito cerrado y equipos externos.", href: "/backoffice/escalations" },
  institutions: { id: "institutions", title: "Instituciones", description: "CEC, UAT, UEPE, CMCE, EMIR, sesiones, acuerdos y guardias.", href: "/backoffice/institutions" },
  directory: { id: "directory", title: "Directorio externo", description: "Servicios territoriales, competencias, contacto seguro e interoperabilidad.", href: "/backoffice/directory" },
  training: { id: "training", title: "Formacion", description: "Programas, inscripciones, certificacion y recertificacion.", href: "/backoffice/training" },
  community: { id: "community", title: "Comunidad", description: "Brigadas, campanas, familias y participacion con salvaguardas.", href: "/backoffice/community" },
  communications: { id: "communications", title: "Comunicacion", description: "Campanas, calendario editorial, aprobacion legal y metricas de alcance.", href: "/backoffice/communications" },
  audit: { id: "audit", title: "Auditoria", description: "Eventos, hallazgos, planes correctivos y cumplimiento.", href: "/backoffice/audit" },
  analytics: { id: "analytics", title: "Analitica", description: "Indicadores certificados, calidad de datos y tableros.", href: "/backoffice/analytics" },
  informes: { id: "informes", title: "Informes", description: "Narrativas ejecutivas, aprobaciones y paquetes de evidencia.", href: "/backoffice/informes" },
  privacy: { id: "privacy", title: "Privacidad", description: "Derechos de titulares, retencion, bloqueo legal y gobierno de datos.", href: "/backoffice/privacy" },
  adaptations: { id: "adaptations", title: "Adaptaciones", description: "Solicitudes UEPE, revision tecnica/legal/accesible y repositorio publico.", href: "/backoffice/adaptations" },
  configuration: { id: "configuration", title: "Configuracion", description: "Matriz de severidad, retencion, territorio y versiones operativas.", href: "/backoffice/configuration" },
  "public-portal": { id: "public-portal", title: "Portal publico", description: "Recursos publicados, transparencia agregada y materiales accesibles.", href: "/backoffice/public-portal" },
  notifications: { id: "notifications", title: "Notificaciones", description: "Avisos seguros, acuses, prioridades y canales permitidos.", href: "/backoffice/notifications" },
  integrations: { id: "integrations", title: "Integraciones", description: "Eventos externos, idempotencia, webhooks firmados y trazabilidad.", href: "/backoffice/integrations" }
};

const moduleOrder = Object.keys(moduleCopy) as PlatformModuleId[];

function toIso(value: Date | string | null | undefined) {
  if (!value) return new Date(0).toISOString();
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function readMetadataString(metadata: Record<string, unknown>, key: string, fallback = "") {
  const value = metadata[key];
  return typeof value === "string" ? value : fallback;
}

async function findCaseRow(caseId: string) {
  const db = getDb();
  const [caseRow] = await db
    .select({ id: cases.id, publicId: cases.publicId, folio: cases.folio, organizationId: cases.organizationId, severity: cases.severity })
    .from(cases)
    .where(or(eq(cases.publicId, caseId), eq(cases.folio, caseId)))
    .limit(1);
  return caseRow ?? null;
}

async function findOrganizationRow(organizationPublicId: string) {
  const db = getDb();
  const [organization] = await db.select().from(organizations).where(eq(organizations.publicId, organizationPublicId)).limit(1);
  return organization ?? null;
}

async function findReportRow(reportId: string) {
  const db = getDb();
  const [report] = await db
    .select({
      id: reports.id,
      publicId: reports.publicId,
      folio: reports.folio,
      organizationId: reports.organizationId,
      suggestedSeverity: reports.suggestedSeverity
    })
    .from(reports)
    .where(or(eq(reports.publicId, reportId), eq(reports.folio, reportId)))
    .limit(1);
  return report ?? null;
}

async function findUserRow(externalSubject: string) {
  const db = getDb();
  const [user] = await db
    .select({ id: users.id, externalSubject: users.externalSubject, displayName: users.displayName })
    .from(users)
    .where(eq(users.externalSubject, externalSubject))
    .limit(1);
  return user ?? null;
}

export async function listReports() {
  if (!isDatabaseConfigured()) return [];

  const db = getDb();
  const rows = await db
    .select({
      id: reports.publicId,
      folio: reports.folio,
      mode: reports.mode,
      reporterType: reports.reporterType,
      organizationId: organizations.publicId,
      schoolName: organizations.name,
      municipality: organizations.municipalityCode,
      state: organizations.stateCode,
      description: reports.descriptionCiphertext,
      safetyNow: reports.safetyNow,
      createdAt: reports.createdAt,
      status: reports.status,
      suggestedSeverity: reports.suggestedSeverity,
      metadata: reports.metadata
    })
    .from(reports)
    .leftJoin(organizations, eq(reports.organizationId, organizations.id))
    .orderBy(desc(reports.createdAt))
    .limit(100);

  return rows.map((row): HelpReport => {
    const metadata = row.metadata ?? {};
    return {
      id: row.id,
      folio: row.folio,
      mode: row.mode,
      reporterType: row.reporterType as HelpReport["reporterType"],
      organizationId: row.organizationId ?? "unknown",
      schoolName: row.schoolName ?? readMetadataString(metadata, "schoolName", "Plantel sin catalogo"),
      municipality: row.municipality ?? readMetadataString(metadata, "municipality", ""),
      state: row.state ?? readMetadataString(metadata, "state", ""),
      description: decryptSensitiveText(row.description),
      safetyNow: row.safetyNow as HelpReport["safetyNow"],
      createdAt: toIso(row.createdAt),
      status: row.status,
      suggestedSeverity: row.suggestedSeverity,
      aiConfidence: undefined
    };
  });
}

export async function listCases() {
  if (!isDatabaseConfigured()) return [];

  const db = getDb();
  const rows = await db
    .select({
      id: cases.publicId,
      folio: cases.folio,
      reportPublicId: reports.publicId,
      organizationPublicId: organizations.publicId,
      title: cases.title,
      state: cases.state,
      severity: cases.severity,
      protectionSummary: cases.protectionSummaryCiphertext,
      firstResponseMinutes: cases.firstResponseMinutes,
      slaMinutes: cases.slaMinutes,
      createdAt: cases.createdAt
    })
    .from(cases)
    .leftJoin(reports, eq(cases.reportId, reports.id))
    .leftJoin(organizations, eq(cases.organizationId, organizations.id))
    .orderBy(desc(cases.createdAt))
    .limit(100);

  return rows.map((row): CaseFile => ({
    id: row.id,
    folio: row.folio,
    reportId: row.reportPublicId ?? "",
    organizationId: row.organizationPublicId ?? "",
    title: row.title,
    state: row.state,
    parallelStates: [],
    severity: row.severity,
    assignedTo: "Pendiente de asignacion",
    firstResponseMinutes: row.firstResponseMinutes ?? 0,
    slaMinutes: row.slaMinutes,
    protectionSummary: decryptSensitiveText(row.protectionSummary) || "Sin resumen de proteccion registrado.",
    timeline: [
      {
        id: `${row.id}-created`,
        at: toIso(row.createdAt),
        actor: "SINAPVE",
        title: "Expediente creado",
        detail: "Registro transaccional cargado desde la base vinculada.",
        audit: true
      }
    ]
  }));
}

export async function getReportStatus(reportId: string) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const [report] = await db
    .select({
      folio: reports.folio,
      status: reports.status,
      createdAt: reports.createdAt
    })
    .from(reports)
    .where(or(eq(reports.publicId, reportId), eq(reports.folio, reportId)))
    .limit(1);

  if (!report) return null;
  return {
    folio: report.folio,
    status: report.status,
    createdAt: report.createdAt,
    safeMessage: "Tu solicitud esta registrada. Usa el folio para dar seguimiento sin revelar datos sensibles."
  };
}

export async function getCase(caseId: string) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const [caseRow] = await db
    .select({
      id: cases.id,
      publicId: cases.publicId,
      folio: cases.folio,
      reportPublicId: reports.publicId,
      organizationPublicId: organizations.publicId,
      title: cases.title,
      state: cases.state,
      severity: cases.severity,
      protectionSummary: cases.protectionSummaryCiphertext,
      firstResponseMinutes: cases.firstResponseMinutes,
      slaMinutes: cases.slaMinutes,
      createdAt: cases.createdAt
    })
    .from(cases)
    .leftJoin(reports, eq(cases.reportId, reports.id))
    .leftJoin(organizations, eq(cases.organizationId, organizations.id))
    .where(or(eq(cases.publicId, caseId), eq(cases.folio, caseId)))
    .limit(1);

  if (!caseRow) return null;

  const events = await db
    .select({
      id: caseEvents.id,
      title: caseEvents.title,
      body: caseEvents.bodyCiphertext,
      type: caseEvents.eventType,
      createdAt: caseEvents.createdAt
    })
    .from(caseEvents)
    .where(eq(caseEvents.caseId, caseRow.id))
    .orderBy(caseEvents.createdAt);

  const timeline: CaseTimelineEvent[] =
    events.length > 0
      ? events.map((event) => ({
          id: event.id,
          at: toIso(event.createdAt),
          actor: event.type,
          title: event.title,
          detail: decryptSensitiveText(event.body),
          audit: true
        }))
      : [
          {
            id: `${caseRow.publicId}-created`,
            at: toIso(caseRow.createdAt),
            actor: "SINAPVE",
            title: "Expediente creado",
            detail: "Registro transaccional cargado desde la base vinculada.",
            audit: true
          }
        ];

  return {
    id: caseRow.publicId,
    folio: caseRow.folio,
    reportId: caseRow.reportPublicId ?? "",
    organizationId: caseRow.organizationPublicId ?? "",
    title: caseRow.title,
    state: caseRow.state,
    parallelStates: [],
    severity: caseRow.severity,
    assignedTo: "Pendiente de asignacion",
    firstResponseMinutes: caseRow.firstResponseMinutes ?? 0,
    slaMinutes: caseRow.slaMinutes,
    protectionSummary: decryptSensitiveText(caseRow.protectionSummary) || "Sin resumen de proteccion registrado.",
    timeline
  } satisfies CaseFile;
}

export async function createReport(input: {
  mode: ReportMode;
  reporterType: HelpReport["reporterType"];
  organizationPublicId: string;
  schoolName: string;
  description: string;
  safetyNow: HelpReport["safetyNow"];
  captchaToken?: string;
  clientRequestId?: string;
  affectedPeople?: Array<Record<string, unknown>>;
  contactPreference?: Record<string, unknown>;
  consents?: Record<string, unknown>;
  categoriesConfirmed?: string[];
  evidenceIntent?: Record<string, unknown>;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const [organization] = await db
    .select()
    .from(organizations)
    .where(and(eq(organizations.publicId, input.organizationPublicId), eq(organizations.type, "school")))
    .limit(1);

  if (!organization) {
    throw new Error("ORGANIZATION_NOT_FOUND");
  }

  const id = `rep_${nanoid(10)}`;
  const folio = `SNPV-${nanoid(4).toUpperCase()}-${nanoid(4).toUpperCase()}`;
  const suggestedSeverity = suggestSeverity(input.description, input.safetyNow);
  const [report] = await db
    .insert(reports)
    .values({
      publicId: id,
      folio,
      mode: input.mode,
      reporterType: input.reporterType,
      organizationId: organization.id,
      descriptionCiphertext: encryptSensitiveText(input.description),
      safetyNow: input.safetyNow,
      suggestedSeverity,
      metadata: {
        schoolName: input.schoolName,
        source: "public_help_request",
        piiHandling: input.mode,
        clientRequestId: input.clientRequestId,
        affectedPeople: input.affectedPeople ?? [],
        contactPreference: input.contactPreference ?? {},
        consents: input.consents ?? {},
        categoriesConfirmed: input.categoriesConfirmed ?? [],
        evidenceIntent: input.evidenceIntent ?? {}
      }
    })
    .returning({
      id: reports.id,
      publicId: reports.publicId,
      createdAt: reports.createdAt,
      status: reports.status
    });

  const duplicateScore = input.clientRequestId ? 0 : input.description.length < 80 ? 40 : 15;
  await db.insert(reportIntakeChecks).values([
    {
      publicId: `chk_${nanoid(10)}`,
      reportId: report.id,
      checkType: "captcha",
      status: input.captchaToken ? "captured" : "not_required",
      score: input.captchaToken ? 100 : null,
      evidence: { mode: "server_recorded_token_presence", tokenStored: false }
    },
    {
      publicId: `chk_${nanoid(10)}`,
      reportId: report.id,
      checkType: "duplicate_suggestion",
      status: duplicateScore >= 40 ? "review" : "clear",
      score: duplicateScore,
      evidence: { clientRequestId: input.clientRequestId ?? null, organizationPublicId: organization.publicId }
    },
    {
      publicId: `chk_${nanoid(10)}`,
      reportId: report.id,
      checkType: "consent_and_category",
      status: "captured",
      score: null,
      evidence: { consents: input.consents ?? {}, categoriesConfirmed: input.categoriesConfirmed ?? [] }
    }
  ]);

  await db.insert(auditEvents).values({
    action: "report.create",
    resourceType: "report",
    resourceId: report.publicId,
    reason: "public_help_request",
    metadata: { mode: input.mode, safetyNow: input.safetyNow }
  });

  return {
    id: report.publicId,
    folio,
    mode: input.mode,
    reporterType: input.reporterType,
    organizationId: organization.publicId,
    schoolName: organization.name,
    municipality: organization.municipalityCode ?? "",
    state: organization.stateCode ?? "",
    description: input.description,
    safetyNow: input.safetyNow,
    createdAt: toIso(report.createdAt),
    status: report.status,
    suggestedSeverity,
    aiConfidence: undefined
  };
}

export async function createReportMessage(input: {
  reportId: string;
  senderType: "reporter" | "institution";
  body: string;
  actor?: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const report = await findReportRow(input.reportId);
  if (!report) throw new Error("REPORT_NOT_FOUND");

  const publicId = `msg_${nanoid(10)}`;
  const [message] = await db
    .insert(reportMessages)
    .values({
      publicId,
      reportId: report.id,
      senderType: input.senderType,
      bodyCiphertext: encryptSensitiveText(input.body)
    })
    .returning({ publicId: reportMessages.publicId, status: reportMessages.status, createdAt: reportMessages.createdAt });

  await db.insert(auditEvents).values({
    action: "report_message.create",
    resourceType: "report",
    resourceId: report.publicId,
    reason: "safe_report_follow_up",
    metadata: { actorId: input.actor?.id ?? "public", senderType: input.senderType }
  });

  return { id: message.publicId, status: message.status, createdAt: toIso(message.createdAt) };
}

export async function getLiveDataStatus(): Promise<LiveDataStatus> {
  if (!isDatabaseConfigured()) {
    return { databaseConfigured: false, reports: 0, cases: 0 };
  }

  const [currentReports, currentCases] = await Promise.all([listReports(), listCases()]);
  return { databaseConfigured: true, reports: currentReports.length, cases: currentCases.length };
}

function platformRecord(row: {
  id: string;
  title?: string | null;
  status?: string | null;
  owner?: string | number | null;
  updatedAt?: Date | string | null;
  detail?: string | null;
}): PlatformRecord {
  return {
    id: row.id,
    title: row.title ?? "Sin titulo",
    status: row.status ?? "sin_estado",
    owner: row.owner === undefined || row.owner === null ? "Sin responsable asignado" : String(row.owner),
    updatedAt: toIso(row.updatedAt),
    detail: row.detail ?? ""
  };
}

export async function listPlatformModules(): Promise<PlatformModuleSummary[]> {
  if (!isDatabaseConfigured()) {
    return moduleOrder.map((id) => ({ ...moduleCopy[id], count: 0, statusLabel: "Sin conexion de datos" }));
  }

  const entries = await Promise.all(moduleOrder.map(async (id) => ({ id, rows: await listModuleRecords(id) })));
  const counts = new Map(entries.map((entry) => [entry.id, entry.rows.length]));
  return moduleOrder.map((id) => {
    const count = counts.get(id) ?? 0;
    return { ...moduleCopy[id], count, statusLabel: count === 0 ? "Sin registros" : `${count} registros` };
  });
}

export async function listModuleRecords(moduleId: PlatformModuleId): Promise<PlatformRecord[]> {
  if (!isDatabaseConfigured()) return [];

  const db = getDb();

  if (moduleId === "reports") {
    return (await listReports()).map((report) =>
      platformRecord({
        id: report.id,
        title: report.folio,
        status: report.status,
        owner: report.schoolName,
        updatedAt: report.createdAt,
        detail: report.description
      })
    );
  }

  if (moduleId === "cases") {
    return (await listCases()).map((caseFile) =>
      platformRecord({
        id: caseFile.id,
        title: caseFile.folio,
        status: caseFile.state,
        owner: caseFile.assignedTo,
        updatedAt: caseFile.timeline[0]?.at,
        detail: caseFile.title
      })
    );
  }

  if (moduleId === "protocols") {
    const versions = await db
      .select({
        id: protocolVersions.code,
        title: protocolVersions.title,
        active: protocolVersions.active,
        version: protocolVersions.version,
        updatedAt: protocolVersions.createdAt
      })
      .from(protocolVersions)
      .orderBy(desc(protocolVersions.createdAt))
      .limit(100);
    const runs = await db
      .select({
        id: protocolRuns.workflowRunId,
        status: protocolRuns.status,
        updatedAt: protocolRuns.startedAt
      })
      .from(protocolRuns)
      .orderBy(desc(protocolRuns.startedAt))
      .limit(100);
    const approvals = await db
      .select({
        id: protocolApprovals.publicId,
        title: protocolApprovals.approvalType,
        status: protocolApprovals.status,
        updatedAt: protocolApprovals.createdAt
      })
      .from(protocolApprovals)
      .orderBy(desc(protocolApprovals.createdAt))
      .limit(50);
    const migrations = await db
      .select({
        id: protocolMigrations.publicId,
        title: protocolMigrations.reason,
        status: protocolMigrations.status,
        updatedAt: protocolMigrations.createdAt
      })
      .from(protocolMigrations)
      .orderBy(desc(protocolMigrations.createdAt))
      .limit(50);
    return [
      ...versions.map((row) =>
        platformRecord({
          id: row.id,
          title: row.title,
          status: row.active ? "activo" : "inactivo",
          owner: `Version ${row.version}`,
          updatedAt: row.updatedAt,
          detail: "Version de protocolo"
        })
      ),
      ...runs.map((row) =>
        platformRecord({
          id: row.id ?? "workflow_pendiente",
          title: "Ejecucion de protocolo",
          status: row.status,
          updatedAt: row.updatedAt,
          detail: "Ruta iniciada desde expediente"
        })
      ),
      ...approvals.map((row) => platformRecord({ ...row, owner: "Aprobacion", detail: "Control de version y firma institucional" })),
      ...migrations.map((row) => platformRecord({ ...row, owner: "Migracion", detail: "Migracion controlada de protocolo en expediente" }))
    ];
  }

  if (moduleId === "risk" || moduleId === "analytics" || moduleId === "map") {
    const rows = await db
      .select({
        id: metricDefinitions.code,
        owner: metricDefinitions.owner,
        version: metricDefinitions.version,
        detail: metricDefinitions.formula
      })
      .from(metricDefinitions)
      .limit(100);
    const metricRows = rows.map((row) =>
      platformRecord({ id: row.id, title: row.id, status: `v${row.version}`, owner: row.owner, detail: moduleId === "map" ? "Capa territorial certificada" : row.detail })
    );
    if (moduleId !== "analytics") return metricRows;
    const dashboards = await db
      .select({ id: dashboardLayouts.publicId, title: dashboardLayouts.title, status: dashboardLayouts.status, owner: dashboardLayouts.audience, updatedAt: dashboardLayouts.createdAt })
      .from(dashboardLayouts)
      .orderBy(desc(dashboardLayouts.createdAt))
      .limit(50);
    const models = await db
      .select({ id: aiModelRegistry.publicId, title: aiModelRegistry.model, status: aiModelRegistry.status, owner: aiModelRegistry.purpose, updatedAt: aiModelRegistry.createdAt })
      .from(aiModelRegistry)
      .orderBy(desc(aiModelRegistry.createdAt))
      .limit(50);
    const exports = await db
      .select({ id: metricExports.publicId, title: metricExports.metricCode, status: metricExports.exportType, owner: metricExports.purpose, updatedAt: metricExports.createdAt })
      .from(metricExports)
      .orderBy(desc(metricExports.createdAt))
      .limit(50);
    return [
      ...metricRows,
      ...dashboards.map((row) => platformRecord({ ...row, detail: "Layout de tablero versionado" })),
      ...models.map((row) => platformRecord({ ...row, detail: "Modelo IA supervisado y evaluado" })),
      ...exports.map((row) => platformRecord({ ...row, detail: "Exportacion con proposito declarado" }))
    ];
  }

  if (moduleId === "interventions") {
    const rows = await db
      .select({
        id: interventionPlans.publicId,
        title: interventionPlans.title,
        status: interventionPlans.status,
        updatedAt: interventionPlans.updatedAt,
        nextReviewAt: interventionPlans.nextReviewAt
      })
      .from(interventionPlans)
      .orderBy(desc(interventionPlans.updatedAt))
      .limit(100);
    return rows.map((row) =>
      platformRecord({ ...row, detail: row.nextReviewAt ? `Revision ${toIso(row.nextReviewAt)}` : "Sin revision programada" })
    );
  }

  if (moduleId === "escalations") {
    const rows = await db
      .select({
        id: referrals.publicId,
        title: referrals.destinationName,
        status: referrals.status,
        owner: referrals.destinationType,
        updatedAt: referrals.createdAt,
        requiredAckBy: referrals.requiredAckBy
      })
      .from(referrals)
      .orderBy(desc(referrals.createdAt))
      .limit(100);
    return rows.map((row) =>
      platformRecord({ ...row, detail: row.requiredAckBy ? `Acuse requerido ${toIso(row.requiredAckBy)}` : "Sin acuse pendiente" })
    );
  }

  if (moduleId === "directory") {
    const rows = await db
      .select({
        id: serviceDirectoryEntries.publicId,
        title: serviceDirectoryEntries.name,
        status: serviceDirectoryEntries.status,
        owner: serviceDirectoryEntries.serviceType,
        updatedAt: serviceDirectoryEntries.createdAt
      })
      .from(serviceDirectoryEntries)
      .orderBy(desc(serviceDirectoryEntries.createdAt))
      .limit(100);
    return rows.map((row) => platformRecord({ ...row, detail: "Directorio territorial de servicios" }));
  }

  if (moduleId === "institutions") {
    const bodies = await db
      .select({
        id: institutionalBodies.publicId,
        title: institutionalBodies.name,
        status: institutionalBodies.status,
        owner: institutionalBodies.bodyType,
        updatedAt: institutionalBodies.createdAt
      })
      .from(institutionalBodies)
      .orderBy(desc(institutionalBodies.createdAt))
      .limit(50);
    const dispatches = await db
      .select({
        id: emirDispatches.publicId,
        title: emirDispatches.teamName,
        status: emirDispatches.status,
        updatedAt: emirDispatches.createdAt
      })
      .from(emirDispatches)
      .orderBy(desc(emirDispatches.createdAt))
      .limit(50);
    const sessions = await db
      .select({
        id: institutionalSessions.publicId,
        title: institutionalSessions.status,
        status: institutionalSessions.status,
        updatedAt: institutionalSessions.createdAt
      })
      .from(institutionalSessions)
      .orderBy(desc(institutionalSessions.createdAt))
      .limit(50);
    return [
      ...bodies.map((row) => platformRecord({ ...row, detail: "Cuerpo institucional con quorum y plan anual" })),
      ...dispatches.map((row) => platformRecord({ ...row, owner: "EMIR", detail: "Guardia, cobertura y disponibilidad" })),
      ...sessions.map((row) => platformRecord({ ...row, owner: "Sesion", detail: "Agenda, quorum, acuerdos y tareas" }))
    ];
  }

  if (moduleId === "training") {
    const rows = await db
      .select({
        id: trainingPrograms.publicId,
        title: trainingPrograms.title,
        status: trainingPrograms.status,
        owner: trainingPrograms.audienceRole,
        updatedAt: trainingPrograms.createdAt,
        required: trainingPrograms.requiredForCertification
      })
      .from(trainingPrograms)
      .orderBy(desc(trainingPrograms.createdAt))
      .limit(100);
    const enrollments = await db.select({ id: trainingEnrollments.id }).from(trainingEnrollments).limit(1);
    const cohorts = await db
      .select({ id: trainingCohorts.publicId, title: trainingCohorts.modality, status: trainingCohorts.status, updatedAt: trainingCohorts.startsAt })
      .from(trainingCohorts)
      .orderBy(desc(trainingCohorts.startsAt))
      .limit(50);
    return [
      ...rows.map((row) =>
      platformRecord({ ...row, detail: row.required ? "Requerido para certificacion" : enrollments.length ? "Con inscripciones" : "Sin inscripciones" })
      ),
      ...cohorts.map((row) => platformRecord({ ...row, owner: "Cohorte", detail: "Cohorte formativa con evidencias de accesibilidad" }))
    ];
  }

  if (moduleId === "community") {
    const rows = await db
      .select({
        id: communityInitiatives.publicId,
        title: communityInitiatives.title,
        status: communityInitiatives.status,
        owner: communityInitiatives.initiativeType,
        updatedAt: communityInitiatives.createdAt
      })
      .from(communityInitiatives)
      .orderBy(desc(communityInitiatives.createdAt))
      .limit(100);
    const proposals = await db
      .select({
        id: communityProposals.publicId,
        title: communityProposals.title,
        status: communityProposals.status,
        updatedAt: communityProposals.createdAt
      })
      .from(communityProposals)
      .orderBy(desc(communityProposals.createdAt))
      .limit(50);
    return [
      ...rows.map((row) => platformRecord({ ...row, detail: "Iniciativa comunitaria con salvaguardas" })),
      ...proposals.map((row) => platformRecord({ ...row, owner: "Propuesta", detail: "Participacion comunitaria protegida" }))
    ];
  }

  if (moduleId === "communications") {
    const rows = await db
      .select({
        id: communicationCampaigns.publicId,
        title: communicationCampaigns.title,
        status: communicationCampaigns.status,
        owner: communicationCampaigns.audience,
        updatedAt: communicationCampaigns.createdAt,
        detail: communicationCampaigns.language
      })
      .from(communicationCampaigns)
      .orderBy(desc(communicationCampaigns.createdAt))
      .limit(100);
    return rows.map((row) => platformRecord({ ...row, detail: `Idioma ${row.detail}` }));
  }

  if (moduleId === "audit") {
    const events = await db
      .select({
        id: auditEvents.id,
        title: auditEvents.action,
        status: auditEvents.resourceType,
        owner: auditEvents.actorUserId,
        updatedAt: auditEvents.createdAt,
        detail: auditEvents.reason
      })
      .from(auditEvents)
      .orderBy(desc(auditEvents.createdAt))
      .limit(50);
    const findings = await db
      .select({
        id: auditFindings.publicId,
        title: auditFindings.title,
        status: auditFindings.status,
        owner: auditFindings.severity,
        updatedAt: auditFindings.createdAt,
        detail: auditFindings.resourceType
      })
      .from(auditFindings)
      .orderBy(desc(auditFindings.createdAt))
      .limit(50);
    return [...events.map(platformRecord), ...findings.map(platformRecord)];
  }

  if (moduleId === "informes") {
    const rows = await db
      .select({
        id: generatedReports.publicId,
        title: generatedReports.title,
        status: generatedReports.status,
        owner: generatedReports.reportType,
        updatedAt: generatedReports.createdAt
      })
      .from(generatedReports)
      .orderBy(desc(generatedReports.createdAt))
      .limit(100);
    return rows.map((row) => platformRecord({ ...row, detail: "Informe pendiente de aprobacion humana" }));
  }

  if (moduleId === "configuration") {
    const rows = await db
      .select({
        id: systemConfigurations.publicId,
        title: systemConfigurations.configKey,
        status: systemConfigurations.status,
        owner: systemConfigurations.version,
        updatedAt: systemConfigurations.updatedAt
      })
      .from(systemConfigurations)
      .orderBy(desc(systemConfigurations.updatedAt))
      .limit(100);
    return rows.map((row) => platformRecord({ ...row, owner: `Version ${row.owner}`, detail: "Configuracion versionada" }));
  }

  if (moduleId === "privacy") {
    const requests = await listPrivacyRequests();
    const processing = await db
      .select({
        id: privacyProcessingRecords.publicId,
        title: privacyProcessingRecords.purpose,
        status: privacyProcessingRecords.status,
        owner: privacyProcessingRecords.audience,
        updatedAt: privacyProcessingRecords.createdAt,
        detail: privacyProcessingRecords.legalBasis
      })
      .from(privacyProcessingRecords)
      .orderBy(desc(privacyProcessingRecords.createdAt))
      .limit(50);
    const retention = await db
      .select({
        id: retentionPolicies.publicId,
        title: retentionPolicies.category,
        status: retentionPolicies.status,
        owner: retentionPolicies.jurisdiction,
        updatedAt: retentionPolicies.createdAt,
        detail: retentionPolicies.retentionDays
      })
      .from(retentionPolicies)
      .orderBy(desc(retentionPolicies.createdAt))
      .limit(50);
    return [
      ...requests,
      ...processing.map(platformRecord),
      ...retention.map((row) => platformRecord({ ...row, detail: `${row.detail} dias de retencion` }))
    ];
  }

  if (moduleId === "adaptations") {
    const rows = await db
      .select({
        id: contextualAdaptations.publicId,
        title: contextualAdaptations.title,
        status: contextualAdaptations.approvalStatus,
        owner: contextualAdaptations.population,
        updatedAt: contextualAdaptations.createdAt,
        detail: contextualAdaptations.reviewStatus
      })
      .from(contextualAdaptations)
      .orderBy(desc(contextualAdaptations.createdAt))
      .limit(100);
    return rows.map((row) => platformRecord({ ...row, detail: `Revision ${row.detail}` }));
  }

  if (moduleId === "public-portal") {
    const rows = await db
      .select({
        id: publicResources.publicId,
        title: publicResources.title,
        status: publicResources.status,
        owner: publicResources.audience,
        updatedAt: publicResources.createdAt,
        detail: publicResources.resourceType
      })
      .from(publicResources)
      .orderBy(desc(publicResources.createdAt))
      .limit(100);
    return rows.map(platformRecord);
  }

  if (moduleId === "notifications") {
    const rows = await db
      .select({
        id: notifications.publicId,
        title: notifications.safeSummary,
        status: notifications.status,
        owner: notifications.channel,
        updatedAt: notifications.createdAt,
        detail: notifications.priority
      })
      .from(notifications)
      .orderBy(desc(notifications.createdAt))
      .limit(100);
    const templates = await db
      .select({
        id: notificationTemplates.publicId,
        title: notificationTemplates.name,
        status: notificationTemplates.status,
        owner: notificationTemplates.channel,
        updatedAt: notificationTemplates.createdAt,
        detail: notificationTemplates.priority
      })
      .from(notificationTemplates)
      .orderBy(desc(notificationTemplates.createdAt))
      .limit(100);
    return [...rows.map(platformRecord), ...templates.map(platformRecord)];
  }

  if (moduleId === "integrations") {
    const rows = await db
      .select({
        id: integrationEvents.publicId,
        title: integrationEvents.eventType,
        status: integrationEvents.status,
        owner: integrationEvents.source,
        updatedAt: integrationEvents.createdAt,
        detail: integrationEvents.idempotencyKey
      })
      .from(integrationEvents)
      .orderBy(desc(integrationEvents.createdAt))
      .limit(100);
    return rows.map(platformRecord);
  }

  return [];
}

export async function listPublishedResources(): Promise<PlatformRecord[]> {
  if (!isDatabaseConfigured()) return [];

  const db = getDb();
  const rows = await db
    .select({
      id: publicResources.publicId,
      title: publicResources.title,
      status: publicResources.status,
      owner: publicResources.audience,
      updatedAt: publicResources.publishedAt,
      detail: publicResources.resourceType
    })
    .from(publicResources)
    .where(eq(publicResources.status, "publicado"))
    .orderBy(desc(publicResources.publishedAt))
    .limit(100);

  return rows.map(platformRecord);
}

export async function createCaseFromReport(input: {
  reportId: string;
  title: string;
  slaMinutes: number;
  protectionSummary?: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const report = await findReportRow(input.reportId);
  if (!report) throw new Error("REPORT_NOT_FOUND");

  const publicId = `case_${nanoid(10)}`;
  const folio = `CASO-${nanoid(5).toUpperCase()}-${nanoid(4).toUpperCase()}`;
  const [caseRow] = await db
    .insert(cases)
    .values({
      publicId,
      folio,
      reportId: report.id,
      organizationId: report.organizationId,
      title: input.title,
      state: "en_triaje",
      severity: report.suggestedSeverity,
      protectionSummaryCiphertext: encryptSensitiveText(input.protectionSummary ?? "Pendiente de resumen de proteccion."),
      firstResponseMinutes: 0,
      slaMinutes: input.slaMinutes
    })
    .returning({ id: cases.id, publicId: cases.publicId, folio: cases.folio });

  await db.update(reports).set({ status: "convertido_caso" }).where(eq(reports.id, report.id));
  await db.insert(caseEvents).values({
    caseId: caseRow.id,
    title: "Expediente abierto",
    bodyCiphertext: encryptSensitiveText(input.protectionSummary ?? "Expediente creado desde reporte."),
    eventType: "case.open"
  });
  await db.insert(auditEvents).values({
    action: "case.create_from_report",
    resourceType: "case",
    resourceId: caseRow.publicId,
    reason: "human_triage",
    metadata: { actorId: input.actor.id, reportId: report.publicId }
  });

  return { id: caseRow.publicId, folio: caseRow.folio };
}

export async function updateCaseState(input: {
  caseId: string;
  state: CaseState;
  protectionSummary?: string;
  actor: Actor;
  reason: string;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const caseRow = await findCaseRow(input.caseId);
  if (!caseRow) throw new Error("CASE_NOT_FOUND");

  const updateValues: { state: CaseState; protectionSummaryCiphertext?: string; closedAt: Date | null } = {
    state: input.state,
    closedAt: input.state === "cerrado" ? new Date() : null
  };
  if (input.protectionSummary) {
    updateValues.protectionSummaryCiphertext = encryptSensitiveText(input.protectionSummary);
  }

  await db
    .update(cases)
    .set(updateValues)
    .where(eq(cases.id, caseRow.id));

  await db.insert(caseEvents).values({
    caseId: caseRow.id,
    title: `Estado actualizado a ${input.state}`,
    bodyCiphertext: encryptSensitiveText(input.reason),
    eventType: "case.state_change"
  });
  await db.insert(auditEvents).values({
    action: "case.update_state",
    resourceType: "case",
    resourceId: caseRow.publicId,
    reason: input.reason,
    metadata: { actorId: input.actor.id, state: input.state }
  });

  return getCase(caseRow.publicId);
}

export async function assignCase(input: {
  caseId: string;
  assigneeExternalSubject: string;
  role?: string;
  reason: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const caseRow = await findCaseRow(input.caseId);
  if (!caseRow) throw new Error("CASE_NOT_FOUND");
  const user = await findUserRow(input.assigneeExternalSubject);
  if (!user) throw new Error("USER_NOT_FOUND");

  const publicId = `assign_${nanoid(10)}`;
  const [assignment] = await db
    .insert(caseAssignments)
    .values({
      publicId,
      caseId: caseRow.id,
      userId: user.id,
      role: input.role ?? "responsable",
      reason: input.reason
    })
    .returning({ publicId: caseAssignments.publicId, role: caseAssignments.role, createdAt: caseAssignments.createdAt });

  await db.update(cases).set({ assignedUserId: user.id }).where(eq(cases.id, caseRow.id));
  await db.insert(caseEvents).values({
    caseId: caseRow.id,
    actorUserId: user.id,
    title: "Responsable asignado",
    bodyCiphertext: encryptSensitiveText(input.reason),
    eventType: "case.assignment"
  });
  await db.insert(auditEvents).values({
    action: "case.assign",
    resourceType: "case",
    resourceId: caseRow.publicId,
    reason: input.reason,
    metadata: { actorId: input.actor.id, assigneeExternalSubject: input.assigneeExternalSubject, assignmentId: assignment.publicId }
  });

  return { id: assignment.publicId, caseId: caseRow.publicId, assignee: user.externalSubject, role: assignment.role, createdAt: toIso(assignment.createdAt) };
}

export async function addCaseTimelineEvent(input: {
  caseId: string;
  title: string;
  detail: string;
  eventType: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const caseRow = await findCaseRow(input.caseId);
  if (!caseRow) throw new Error("CASE_NOT_FOUND");

  const [event] = await db
    .insert(caseEvents)
    .values({
      caseId: caseRow.id,
      title: input.title,
      bodyCiphertext: encryptSensitiveText(input.detail),
      eventType: input.eventType
    })
    .returning({ id: caseEvents.id, createdAt: caseEvents.createdAt });

  await db.insert(auditEvents).values({
    action: "case_event.create",
    resourceType: "case",
    resourceId: caseRow.publicId,
    reason: input.eventType,
    metadata: { actorId: input.actor.id, eventId: event.id }
  });

  return { id: event.id, at: toIso(event.createdAt), title: input.title };
}

export async function createInterventionPlan(input: {
  caseId: string;
  title: string;
  goals?: Array<Record<string, unknown>>;
  adjustments?: Record<string, unknown>;
  nextReviewAt?: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const caseRow = await findCaseRow(input.caseId);
  if (!caseRow) throw new Error("CASE_NOT_FOUND");

  const publicId = `plan_${nanoid(10)}`;
  const [plan] = await db
    .insert(interventionPlans)
    .values({
      publicId,
      caseId: caseRow.id,
      title: input.title,
      goals: input.goals ?? [],
      adjustments: input.adjustments ?? {},
      nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : null
    })
    .returning({ publicId: interventionPlans.publicId, title: interventionPlans.title, status: interventionPlans.status });

  await db.insert(caseEvents).values({
    caseId: caseRow.id,
    title: "Plan de intervencion creado",
    bodyCiphertext: encryptSensitiveText(input.title),
    eventType: "intervention.create"
  });
  await db.insert(auditEvents).values({
    action: "intervention_plan.create",
    resourceType: "case",
    resourceId: caseRow.publicId,
    reason: "human_intervention_plan",
    metadata: { actorId: input.actor.id, planId: plan.publicId }
  });

  return plan;
}

export async function createReferral(input: {
  caseId: string;
  destinationType: string;
  destinationName: string;
  requiredAckBy?: string;
  metadata?: Record<string, unknown>;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const caseRow = await findCaseRow(input.caseId);
  if (!caseRow) throw new Error("CASE_NOT_FOUND");

  const publicId = `ref_${nanoid(10)}`;
  const [referral] = await db
    .insert(referrals)
    .values({
      publicId,
      caseId: caseRow.id,
      destinationType: input.destinationType,
      destinationName: input.destinationName,
      requiredAckBy: input.requiredAckBy ? new Date(input.requiredAckBy) : null,
      metadata: input.metadata ?? {}
    })
    .returning({ publicId: referrals.publicId, status: referrals.status });

  await db.update(cases).set({ state: "escalado" }).where(eq(cases.id, caseRow.id));

  // Programa el vencimiento de acuse como trabajo durable (circuito cerrado). Si
  // no hay fecha de acuse, no se programa. Idempotente por referencia.
  if (input.requiredAckBy) {
    await enqueueDurable({
      jobType: "referral_ack_timeout",
      idempotencyKey: `referral_ack_timeout:${referral.publicId}`,
      payload: { referralPublicId: referral.publicId },
      runAt: new Date(input.requiredAckBy)
    });
  }

  await db.insert(caseEvents).values({
    caseId: caseRow.id,
    title: "Escalamiento creado",
    bodyCiphertext: encryptSensitiveText(input.destinationName),
    eventType: "referral.create"
  });
  await db.insert(auditEvents).values({
    action: "referral.create",
    resourceType: "case",
    resourceId: caseRow.publicId,
    reason: "closed_loop_referral",
    metadata: { actorId: input.actor.id, referralId: referral.publicId }
  });

  return referral;
}

async function ensureProtocolVersion(severity: Severity) {
  const db = getDb();
  const code = severity === "critica" ? "critical_response_v1" : "school_protection_v1";
  const [existing] = await db
    .select({ id: protocolVersions.id, code: protocolVersions.code, version: protocolVersions.version })
    .from(protocolVersions)
    .where(and(eq(protocolVersions.code, code), eq(protocolVersions.active, true)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(protocolVersions)
    .values({
      code,
      version: 1,
      title: severity === "critica" ? "Respuesta critica escolar" : "Proteccion escolar",
      active: true,
      steps: [
        { id: "safety", title: "Confirmar seguridad inmediata", dueMinute: 5, requiredEvidence: true },
        { id: "notify-direction", title: "Notificar direccion y responsable APVE", dueMinute: 10, requiredEvidence: true },
        { id: "safe-contact", title: "Definir contacto seguro", dueMinute: 15, requiredEvidence: false },
        { id: "open-case", title: "Preservar registros", dueMinute: 20, requiredEvidence: true },
        { id: "decision", title: "Documentar decision y escalamiento", dueMinute: 30, requiredEvidence: true }
      ]
    })
    .returning({ id: protocolVersions.id, code: protocolVersions.code, version: protocolVersions.version });
  return created;
}

async function findProtocolVersionRow(code: string) {
  const db = getDb();
  const [version] = await db
    .select({ id: protocolVersions.id, code: protocolVersions.code, version: protocolVersions.version })
    .from(protocolVersions)
    .where(eq(protocolVersions.code, code))
    .orderBy(desc(protocolVersions.createdAt))
    .limit(1);
  return version ?? null;
}

export async function startPersistedProtocolRun(input: { caseId: string; actor: Actor }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const caseRow = await findCaseRow(input.caseId);
  if (!caseRow) throw new Error("CASE_NOT_FOUND");

  const version = await ensureProtocolVersion(caseRow.severity);
  const workflowRunId = `workflow_pending_${nanoid(10)}`;
  const [run] = await db
    .insert(protocolRuns)
    .values({
      caseId: caseRow.id,
      protocolVersionId: version.id,
      workflowRunId,
      status: "activo"
    })
    .returning({ id: protocolRuns.id, startedAt: protocolRuns.startedAt, status: protocolRuns.status, workflowRunId: protocolRuns.workflowRunId });

  await db.insert(caseEvents).values({
    caseId: caseRow.id,
    title: "Protocolo iniciado",
    bodyCiphertext: encryptSensitiveText(version.code),
    eventType: "protocol.start"
  });
  await db.insert(auditEvents).values({
    action: "protocol_run.start",
    resourceType: "case",
    resourceId: caseRow.publicId,
    reason: "human_confirmed_protocol",
    metadata: { actorId: input.actor.id, protocolCode: version.code, workflowRunId }
  });

  // Recordatorio durable de revision de SLA del protocolo (11.6).
  await enqueueDurable({
    jobType: "protocol_sla_check",
    idempotencyKey: `protocol_sla_check:${run.id}`,
    payload: { casePublicId: caseRow.publicId, runId: run.id },
    runAt: new Date(Date.now() + 30 * 60_000)
  });

  return {
    id: run.id,
    caseId: caseRow.publicId,
    protocolCode: version.code,
    version: version.version,
    startedAt: toIso(run.startedAt),
    status: run.status,
    workflowRunId: run.workflowRunId
  };
}

// EP-04 / 7.x: al completar una decision, la rama elegida debe ser una
// transicion legal del paso; de lo contrario la corrida no puede avanzar.
export class ProtocolBranchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProtocolBranchError";
  }
}

// Carga la corrida, sus pasos compilados (desde la version) y sus eventos en
// orden cronologico, listos para el reductor del motor de corridas.
async function loadRunContext(runId: string) {
  const db = getDb();
  const [run] = await db
    .select({ id: protocolRuns.id, caseId: protocolRuns.caseId, status: protocolRuns.status, protocolVersionId: protocolRuns.protocolVersionId })
    .from(protocolRuns)
    .where(eq(protocolRuns.id, runId))
    .limit(1);
  if (!run) return null;

  const [version] = await db
    .select({ code: protocolVersions.code, version: protocolVersions.version, title: protocolVersions.title, steps: protocolVersions.steps })
    .from(protocolVersions)
    .where(eq(protocolVersions.id, run.protocolVersionId))
    .limit(1);
  const steps = normalizeStoredSteps(version && Array.isArray(version.steps) ? version.steps : []);

  const eventRows = await db
    .select({ stepId: protocolStepEvents.stepId, status: protocolStepEvents.status, chosenNext: protocolStepEvents.chosenNext, createdAt: protocolStepEvents.createdAt })
    .from(protocolStepEvents)
    .where(eq(protocolStepEvents.protocolRunId, run.id))
    .orderBy(protocolStepEvents.createdAt);
  const events: ProtocolRunEvent[] = eventRows.map((row) => ({
    stepId: row.stepId,
    status: row.status === "bloqueado" ? "bloqueado" : "completado",
    chosenNext: row.chosenNext
  }));

  return { run, version, steps, events };
}

// Estado navegable de una corrida (para consola y API).
export async function getProtocolRunState(runId: string): Promise<
  | (ProtocolRunState & { runId: string; caseId: string; protocolCode: string | null; protocolVersion: number | null; protocolTitle: string | null })
  | null
> {
  if (!isDatabaseConfigured()) return null;
  const context = await loadRunContext(runId);
  if (!context) return null;
  const state = deriveProtocolRunState(context.steps, context.events);
  return {
    ...state,
    runId: context.run.id,
    caseId: context.run.caseId,
    protocolCode: context.version?.code ?? null,
    protocolVersion: context.version?.version ?? null,
    protocolTitle: context.version?.title ?? null
  };
}

// Ultima corrida de un expediente con su estado calculado (o null si no hay).
export async function getActiveProtocolRunForCase(caseId: string) {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const caseRow = await findCaseRow(caseId);
  if (!caseRow) return null;
  const [run] = await db
    .select({ id: protocolRuns.id })
    .from(protocolRuns)
    .where(eq(protocolRuns.caseId, caseRow.id))
    .orderBy(desc(protocolRuns.startedAt))
    .limit(1);
  if (!run) return null;
  return getProtocolRunState(run.id);
}

export async function completeProtocolStep(input: {
  runId: string;
  stepId: string;
  status?: "completado" | "bloqueado";
  chosenNext?: string;
  evidencePathname?: string;
  notes?: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const context = await loadRunContext(input.runId);
  if (!context) throw new Error("PROTOCOL_RUN_NOT_FOUND");
  const { run, steps } = context;

  const status = input.status ?? "completado";
  const definition = steps.find((step) => step.id === input.stepId);

  // Validar la eleccion de rama solo al completar (no al bloquear).
  if (status === "completado" && definition) {
    const check = validateBranchChoice(definition, input.chosenNext);
    if (!check.ok) throw new ProtocolBranchError(check.error ?? "Rama invalida");
  }
  const storedChoice = status === "completado" && definition && definition.next.length > 1 ? input.chosenNext ?? null : null;

  const publicId = `step_${nanoid(10)}`;
  const [event] = await db
    .insert(protocolStepEvents)
    .values({
      publicId,
      protocolRunId: run.id,
      stepId: input.stepId,
      status,
      chosenNext: storedChoice,
      evidencePathname: input.evidencePathname,
      notesCiphertext: input.notes ? encryptSensitiveText(input.notes) : undefined
    })
    .returning({ publicId: protocolStepEvents.publicId, stepId: protocolStepEvents.stepId, status: protocolStepEvents.status, createdAt: protocolStepEvents.createdAt });

  // Recalcular el estado con el nuevo evento y reflejarlo en la corrida.
  const nextState = deriveProtocolRunState(steps, [...context.events, { stepId: input.stepId, status, chosenNext: storedChoice }]);
  if (nextState.status !== "activo" && run.status === "activo") {
    await db.update(protocolRuns).set({ status: nextState.status === "completado" ? "cerrado" : "bloqueado" }).where(eq(protocolRuns.id, run.id));
  }

  await db.insert(caseEvents).values({
    caseId: run.caseId,
    title: "Paso de protocolo actualizado",
    bodyCiphertext: encryptSensitiveText(`${event.stepId}:${event.status}${storedChoice ? `->${storedChoice}` : ""}`),
    eventType: "protocol.step"
  });
  await db.insert(auditEvents).values({
    action: "protocol_step.complete",
    resourceType: "protocol_run",
    resourceId: input.runId,
    reason: "human_confirmed_protocol_step",
    metadata: { actorId: input.actor.id, stepId: input.stepId, status: event.status, chosenNext: storedChoice, runStatus: nextState.status }
  });

  return {
    id: event.publicId,
    runId: input.runId,
    stepId: event.stepId,
    status: event.status,
    createdAt: toIso(event.createdAt),
    state: nextState
  };
}

export async function createCaseControlRecord(input:
  | { controlType: "participant"; caseId: string; relationship: string; displayLabel: string; details?: string; actor: Actor }
  | { controlType: "protection_measure"; caseId: string; measureType: string; summary: string; status?: string; actor: Actor }
  | { controlType: "consent"; caseId: string; subjectLabel: string; consentType: string; legalBasis?: string; status?: string; evidence?: string; actor: Actor }
  | { controlType: "clinical_compartment"; caseId: string; authorizedRole: string; summary: string; status?: string; actor: Actor }
  | { controlType: "adendum"; caseId: string; fieldName: string; value: string; reason: string; actor: Actor }
  | { controlType: "mediation_review"; caseId: string; eligible?: boolean; blockedReasons?: string[]; narrative?: string; categories?: string[]; voluntary?: boolean; powerAsymmetry?: boolean; actor: Actor }
) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const caseRow = await findCaseRow(input.caseId);
  if (!caseRow) throw new Error("CASE_NOT_FOUND");

  let result: { id: string; type: string; status: string };
  if (input.controlType === "participant") {
    const publicId = `part_${nanoid(10)}`;
    const [row] = await db
      .insert(caseParticipants)
      .values({
        publicId,
        caseId: caseRow.id,
        relationship: input.relationship,
        displayLabel: input.displayLabel,
        detailsCiphertext: input.details ? encryptSensitiveText(input.details) : null
      })
      .returning({ id: caseParticipants.publicId, status: caseParticipants.relationship });
    result = { id: row.id, type: input.controlType, status: row.status };
  } else if (input.controlType === "protection_measure") {
    const publicId = `measure_${nanoid(10)}`;
    const [row] = await db
      .insert(protectionMeasures)
      .values({
        publicId,
        caseId: caseRow.id,
        measureType: input.measureType,
        summaryCiphertext: encryptSensitiveText(input.summary),
        status: input.status ?? "activa"
      })
      .returning({ id: protectionMeasures.publicId, status: protectionMeasures.status });
    result = { id: row.id, type: input.controlType, status: row.status };
  } else if (input.controlType === "consent") {
    const publicId = `consent_${nanoid(10)}`;
    const [row] = await db
      .insert(consentRecords)
      .values({
        publicId,
        caseId: caseRow.id,
        subjectLabel: input.subjectLabel,
        consentType: input.consentType,
        legalBasis: input.legalBasis,
        status: input.status ?? "registrado",
        evidenceCiphertext: input.evidence ? encryptSensitiveText(input.evidence) : null
      })
      .returning({ id: consentRecords.publicId, status: consentRecords.status });
    result = { id: row.id, type: input.controlType, status: row.status };
  } else if (input.controlType === "clinical_compartment") {
    const publicId = `clin_${nanoid(10)}`;
    const [row] = await db
      .insert(clinicalCompartments)
      .values({
        publicId,
        caseId: caseRow.id,
        authorizedRole: input.authorizedRole,
        summaryCiphertext: encryptSensitiveText(input.summary),
        status: input.status ?? "restringido"
      })
      .returning({ id: clinicalCompartments.publicId, status: clinicalCompartments.status });
    result = { id: row.id, type: input.controlType, status: row.status };
  } else if (input.controlType === "adendum") {
    const [row] = await db
      .insert(caseFieldVersions)
      .values({
        caseId: caseRow.id,
        fieldName: input.fieldName,
        valueCiphertext: encryptSensitiveText(input.value),
        reason: input.reason
      })
      .returning({ id: caseFieldVersions.id, status: caseFieldVersions.fieldName });
    result = { id: row.id, type: input.controlType, status: row.status };
  } else {
    // Auto-evaluacion determinista de bloqueo (6.10) a partir de la severidad
    // del expediente y las senales aportadas. Si quien opera afirma explicitamente
    // eligible=false, se respeta el bloqueo manual y se suman sus motivos.
    const evaluation = evaluateMediation({
      severity: caseRow.severity,
      narrative: input.narrative,
      categories: input.categories,
      voluntary: input.voluntary,
      powerAsymmetry: input.powerAsymmetry
    });
    const manualBlockReasons = input.eligible === false ? ["bloqueo_manual_revisor"] : [];
    const blockedReasons = [...new Set([...evaluation.blockedReasons, ...(input.blockedReasons ?? []), ...manualBlockReasons])];
    const eligible = evaluation.eligible && input.eligible !== false;
    const publicId = `med_${nanoid(10)}`;
    const [row] = await db
      .insert(mediationReviews)
      .values({
        publicId,
        caseId: caseRow.id,
        eligible,
        blockedReasons
      })
      .returning({ id: mediationReviews.publicId, eligible: mediationReviews.eligible });
    result = { id: row.id, type: input.controlType, status: row.eligible ? "elegible" : "bloqueada" };
  }

  await db.insert(caseEvents).values({
    caseId: caseRow.id,
    title: `Control registrado: ${input.controlType}`,
    bodyCiphertext: encryptSensitiveText(result.status),
    eventType: `case.control.${input.controlType}`
  });
  await db.insert(auditEvents).values({
    action: `case_control.${input.controlType}.create`,
    resourceType: "case",
    resourceId: caseRow.publicId,
    reason: "sensitive_case_control",
    metadata: { actorId: input.actor.id, controlId: result.id }
  });

  return result;
}

export async function recordCaseEvidence(input: {
  caseId: string;
  pathname: string;
  contentType: string;
  size: number;
  sha256: string;
  scanStatus: string;
  exifPolicy: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const caseRow = await findCaseRow(input.caseId);
  if (!caseRow) throw new Error("CASE_NOT_FOUND");
  const actorRow = await findUserRow(input.actor.id);
  const publicId = `evid_${nanoid(10)}`;
  const [evidence] = await db
    .insert(caseEvidenceFiles)
    .values({
      publicId,
      caseId: caseRow.id,
      pathname: input.pathname,
      contentType: input.contentType,
      size: input.size,
      sha256: input.sha256,
      scanStatus: input.scanStatus,
      exifPolicy: input.exifPolicy,
      custodianUserId: actorRow?.id
    })
    .returning({ publicId: caseEvidenceFiles.publicId, pathname: caseEvidenceFiles.pathname });

  await db.insert(caseEvents).values({
    caseId: caseRow.id,
    title: "Evidencia privada registrada",
    bodyCiphertext: encryptSensitiveText(input.sha256),
    eventType: "evidence.register"
  });
  await db.insert(auditEvents).values({
    action: "evidence.register",
    resourceType: "case",
    resourceId: caseRow.publicId,
    reason: "chain_of_custody",
    metadata: { actorId: input.actor.id, evidenceId: evidence.publicId, pathname: evidence.pathname }
  });

  return { id: evidence.publicId, pathname: evidence.pathname };
}

export async function createAccessSession(input: { actor: Actor; sessionToken: string; source?: string; expiresAt?: string }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const user = await findUserRow(input.actor.id);
  if (!user) throw new Error("USER_NOT_FOUND");
  const publicId = `sess_${nanoid(10)}`;
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : new Date(Date.now() + 8 * 60 * 60 * 1000);
  const [session] = await db
    .insert(userSessions)
    .values({
      publicId,
      userId: user.id,
      sessionDigest: sha256Digest(input.sessionToken),
      source: input.source ?? "web",
      expiresAt
    })
    .returning({ publicId: userSessions.publicId, expiresAt: userSessions.expiresAt });
  await db.insert(auditEvents).values({
    action: "session.create",
    resourceType: "user",
    resourceId: user.externalSubject,
    reason: "identity_session",
    metadata: { actorId: input.actor.id, sessionId: session.publicId, source: input.source ?? "web" }
  });
  return { id: session.publicId, expiresAt: toIso(session.expiresAt) };
}

export async function revokeAccessSession(input: { sessionId: string; actor: Actor }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [session] = await db.update(userSessions).set({ revokedAt: new Date() }).where(eq(userSessions.publicId, input.sessionId)).returning({ publicId: userSessions.publicId });
  if (!session) throw new Error("SESSION_NOT_FOUND");
  await db.insert(auditEvents).values({
    action: "session.revoke",
    resourceType: "session",
    resourceId: session.publicId,
    reason: "manual_revocation",
    metadata: { actorId: input.actor.id }
  });
  return { id: session.publicId, status: "revoked" };
}

export async function createBreakGlassGrant(input: { actor: Actor; resourceType: string; resourceId: string; reason: string; durationMinutes?: number }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const actorRow = await findUserRow(input.actor.id);
  const publicId = `bg_${nanoid(10)}`;
  const expiresAt = new Date(Date.now() + Math.min(Math.max(input.durationMinutes ?? 30, 5), 240) * 60 * 1000);
  const [grant] = await db
    .insert(breakGlassGrants)
    .values({
      publicId,
      actorUserId: actorRow?.id,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      reason: input.reason,
      privacyAlertSentAt: new Date(),
      expiresAt
    })
    .returning({ publicId: breakGlassGrants.publicId, expiresAt: breakGlassGrants.expiresAt });
  await db.insert(auditEvents).values({
    action: "break_glass.create",
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    reason: input.reason,
    metadata: { actorId: input.actor.id, grantId: grant.publicId, privacyAlertSentAt: new Date().toISOString() }
  });
  return { id: grant.publicId, expiresAt: toIso(grant.expiresAt), privacyAlert: "sent" };
}

export async function createProtocolGovernanceRecord(input:
  | { recordType: "approval"; protocolCode: string; approvalType: string; status?: string; actor: Actor }
  | { recordType: "simulation"; protocolCode: string; scenario?: Record<string, unknown>; result?: Record<string, unknown>; actor: Actor }
  | { recordType: "migration"; caseId: string; fromProtocolCode?: string; toProtocolCode: string; reason: string; actor: Actor }
) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const publicId = `proto_${nanoid(10)}`;

  if (input.recordType === "approval") {
    const version = await findProtocolVersionRow(input.protocolCode);
    if (!version) throw new Error("PROTOCOL_VERSION_NOT_FOUND");
    const approver = await findUserRow(input.actor.id);
    const [row] = await db
      .insert(protocolApprovals)
      .values({
        publicId,
        protocolVersionId: version.id,
        approverUserId: approver?.id,
        approvalType: input.approvalType,
        status: input.status ?? "pendiente",
        signedAt: input.status === "aprobado" ? new Date() : null
      })
      .returning({ id: protocolApprovals.publicId, status: protocolApprovals.status });
    return row;
  }

  if (input.recordType === "simulation") {
    const version = await findProtocolVersionRow(input.protocolCode);
    if (!version) throw new Error("PROTOCOL_VERSION_NOT_FOUND");
    const [row] = await db
      .insert(protocolSimulations)
      .values({ publicId, protocolVersionId: version.id, scenario: input.scenario ?? {}, result: input.result ?? {} })
      .returning({ id: protocolSimulations.publicId, status: protocolSimulations.status });
    return row;
  }

  const caseRow = await findCaseRow(input.caseId);
  if (!caseRow) throw new Error("CASE_NOT_FOUND");
  const toVersion = await findProtocolVersionRow(input.toProtocolCode);
  if (!toVersion) throw new Error("PROTOCOL_VERSION_NOT_FOUND");
  const fromVersion = input.fromProtocolCode ? await findProtocolVersionRow(input.fromProtocolCode) : null;
  const [row] = await db
    .insert(protocolMigrations)
    .values({
      publicId,
      caseId: caseRow.id,
      fromProtocolVersionId: fromVersion?.id,
      toProtocolVersionId: toVersion.id,
      reason: input.reason
    })
    .returning({ id: protocolMigrations.publicId, status: protocolMigrations.status });
  return row;
}

// EP-04 / 7.x: el constructor visual de protocolos rechaza en servidor cualquier
// grafo que no pase las mismas reglas que el editor aplica en cliente.
export class ProtocolGraphInvalidError extends Error {
  readonly errors: string[];
  constructor(errors: string[]) {
    super("PROTOCOL_GRAPH_INVALID");
    this.name = "ProtocolGraphInvalidError";
    this.errors = errors;
  }
}

// Lista la ultima version publicada de cada codigo de protocolo, para poblar el
// selector "abrir protocolo existente" del constructor.
export async function listAuthoredProtocolVersions() {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const rows = await db
    .select({
      code: protocolVersions.code,
      title: protocolVersions.title,
      version: protocolVersions.version,
      active: protocolVersions.active,
      steps: protocolVersions.steps,
      updatedAt: protocolVersions.createdAt
    })
    .from(protocolVersions)
    .orderBy(desc(protocolVersions.createdAt))
    .limit(200);
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    const current = latest.get(row.code);
    if (!current || row.version > current.version) latest.set(row.code, row);
  }
  return [...latest.values()]
    .map((row) => ({
      code: row.code,
      title: row.title,
      version: row.version,
      active: row.active,
      stepCount: Array.isArray(row.steps) ? row.steps.length : 0,
      updatedAt: toIso(row.updatedAt)
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}

// Reconstruye el grafo editable de la ultima version de un codigo.
export async function getProtocolGraph(code: string): Promise<ProtocolGraph | null> {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const [row] = await db
    .select({ code: protocolVersions.code, title: protocolVersions.title, steps: protocolVersions.steps })
    .from(protocolVersions)
    .where(eq(protocolVersions.code, code))
    .orderBy(desc(protocolVersions.version))
    .limit(1);
  if (!row) return null;
  return graphFromSteps(row.code, row.title, Array.isArray(row.steps) ? row.steps : []);
}

// Publica una nueva version de protocolo a partir de un grafo del constructor.
// Valida, compila a la lista lineal `steps[]`, incrementa la version del codigo,
// desactiva las anteriores si se marca activa y deja rastro de auditoria.
export async function saveProtocolVersionFromGraph(input: { graph: ProtocolGraph; actor: Actor; activate?: boolean }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const validation = validateProtocolGraph(input.graph);
  if (!validation.ok) throw new ProtocolGraphInvalidError(validation.errors);

  const db = getDb();
  const compiled = compileProtocolGraph(input.graph);
  const activate = input.activate ?? true;

  const previous = await db
    .select({ version: protocolVersions.version })
    .from(protocolVersions)
    .where(eq(protocolVersions.code, input.graph.code))
    .orderBy(desc(protocolVersions.version))
    .limit(1);
  const nextVersion = (previous[0]?.version ?? 0) + 1;

  if (activate) {
    await db
      .update(protocolVersions)
      .set({ active: false })
      .where(eq(protocolVersions.code, input.graph.code));
  }

  const [created] = await db
    .insert(protocolVersions)
    .values({
      code: input.graph.code,
      version: nextVersion,
      title: input.graph.title,
      active: activate,
      steps: compiled as Array<Record<string, unknown>>
    })
    .returning({
      id: protocolVersions.id,
      code: protocolVersions.code,
      version: protocolVersions.version,
      title: protocolVersions.title,
      active: protocolVersions.active
    });

  await db.insert(auditEvents).values({
    action: "protocol_version.publish",
    resourceType: "protocol_version",
    resourceId: created.code,
    reason: "protocol_builder",
    metadata: {
      actorId: input.actor.id,
      version: created.version,
      stepCount: compiled.length,
      warnings: validation.warnings
    }
  });

  return {
    code: created.code,
    version: created.version,
    title: created.title,
    active: created.active,
    stepCount: compiled.length,
    warnings: validation.warnings
  };
}

export async function createTrainingProgram(input: {
  title: string;
  audienceRole: string;
  requiredForCertification?: boolean;
  metadata?: Record<string, unknown>;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const publicId = `train_${nanoid(10)}`;
  const [program] = await db
    .insert(trainingPrograms)
    .values({
      publicId,
      title: input.title,
      audienceRole: input.audienceRole,
      requiredForCertification: input.requiredForCertification ?? false,
      metadata: input.metadata ?? {}
    })
    .returning({ publicId: trainingPrograms.publicId, title: trainingPrograms.title, status: trainingPrograms.status });

  await db.insert(auditEvents).values({
    action: "training_program.create",
    resourceType: "training_program",
    resourceId: program.publicId,
    reason: "training_catalog_update",
    metadata: { actorId: input.actor.id }
  });

  return program;
}

export async function createTrainingOperationsRecord(input:
  | { recordType: "cohort"; programPublicId: string; modality: string; startsAt?: string; endsAt?: string; accessibilityEvidence?: Record<string, unknown>; actor: Actor }
  | { recordType: "assessment"; enrollmentId: string; assessmentType: string; score?: number; status?: string; anomalyFlags?: string[]; actor: Actor }
) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  if (input.recordType === "cohort") {
    const [program] = await db.select({ id: trainingPrograms.id, publicId: trainingPrograms.publicId }).from(trainingPrograms).where(eq(trainingPrograms.publicId, input.programPublicId)).limit(1);
    if (!program) throw new Error("TRAINING_PROGRAM_NOT_FOUND");
    const publicId = `cohort_${nanoid(10)}`;
    const [cohort] = await db
      .insert(trainingCohorts)
      .values({
        publicId,
        programId: program.id,
        modality: input.modality,
        startsAt: input.startsAt ? new Date(input.startsAt) : null,
        endsAt: input.endsAt ? new Date(input.endsAt) : null,
        accessibilityEvidence: input.accessibilityEvidence ?? {}
      })
      .returning({ id: trainingCohorts.publicId, status: trainingCohorts.status });
    return cohort;
  }

  const [assessment] = await db
    .insert(trainingAssessments)
    .values({
      publicId: `assess_${nanoid(10)}`,
      enrollmentId: input.enrollmentId,
      assessmentType: input.assessmentType,
      score: input.score,
      status: input.status ?? "revision_humana",
      anomalyFlags: input.anomalyFlags ?? []
    })
    .returning({ id: trainingAssessments.publicId, status: trainingAssessments.status });
  return assessment;
}

export async function createCommunityInitiative(input: {
  organizationPublicId?: string;
  title: string;
  initiativeType: string;
  safeguards?: Record<string, unknown>;
  startsAt?: string;
  endsAt?: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const organization = input.organizationPublicId ? await findOrganizationRow(input.organizationPublicId) : null;
  if (input.organizationPublicId && !organization) throw new Error("ORGANIZATION_NOT_FOUND");

  const publicId = `comm_${nanoid(10)}`;
  const [initiative] = await db
    .insert(communityInitiatives)
    .values({
      publicId,
      organizationId: organization?.id,
      title: input.title,
      initiativeType: input.initiativeType,
      safeguards: input.safeguards ?? {},
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null
    })
    .returning({ publicId: communityInitiatives.publicId, title: communityInitiatives.title, status: communityInitiatives.status });

  await db.insert(auditEvents).values({
    action: "community_initiative.create",
    resourceType: "community_initiative",
    resourceId: initiative.publicId,
    reason: "community_participation",
    metadata: { actorId: input.actor.id }
  });

  return initiative;
}

export async function createCommunityProposal(input: {
  title: string;
  body: string;
  organizationPublicId?: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const organization = input.organizationPublicId ? await findOrganizationRow(input.organizationPublicId) : null;
  if (input.organizationPublicId && !organization) throw new Error("ORGANIZATION_NOT_FOUND");
  const publicId = `proposal_${nanoid(10)}`;
  const [proposal] = await db
    .insert(communityProposals)
    .values({
      publicId,
      organizationId: organization?.id,
      title: input.title,
      bodyCiphertext: encryptSensitiveText(input.body)
    })
    .returning({ id: communityProposals.publicId, title: communityProposals.title, status: communityProposals.status });
  await db.insert(auditEvents).values({
    action: "community_proposal.create",
    resourceType: "community_proposal",
    resourceId: proposal.id,
    reason: "protected_community_participation",
    metadata: { actorId: input.actor.id }
  });
  return proposal;
}

export async function createGovernanceRecord(
  moduleId: PlatformModuleId,
  input: { title: string; status?: string; metadata?: Record<string, unknown>; actor: Actor; [key: string]: unknown }
) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const publicId = `${moduleId.replace("-", "_")}_${nanoid(10)}`;

  if (moduleId === "audit") {
    const [finding] = await db
      .insert(auditFindings)
      .values({
        publicId,
        title: input.title,
        resourceType: String(input.resourceType ?? "platform"),
        resourceId: String(input.resourceId ?? "general"),
        severity: String(input.severity ?? "media"),
        correctivePlan: input.metadata ?? {}
      })
      .returning({ publicId: auditFindings.publicId, title: auditFindings.title, status: auditFindings.status });
    return finding;
  }

  if (moduleId === "informes") {
    const [report] = await db
      .insert(generatedReports)
      .values({
        publicId,
        title: input.title,
        reportType: String(input.reportType ?? "ejecutivo"),
        scope: input.metadata ?? {},
        narrativeCiphertext: typeof input.narrative === "string" ? encryptSensitiveText(input.narrative) : null
      })
      .returning({ publicId: generatedReports.publicId, title: generatedReports.title, status: generatedReports.status });
    return report;
  }

  if (moduleId === "configuration") {
    const [config] = await db
      .insert(systemConfigurations)
      .values({
        publicId,
        configKey: input.title,
        scope: input.metadata ?? {},
        value: typeof input.value === "object" && input.value !== null ? (input.value as Record<string, unknown>) : {}
      })
      .returning({ publicId: systemConfigurations.publicId, title: systemConfigurations.configKey, status: systemConfigurations.status });
    return config;
  }

  if (moduleId === "public-portal") {
    const [resource] = await db
      .insert(publicResources)
      .values({
        publicId,
        title: input.title,
        resourceType: String(input.resourceType ?? "material"),
        audience: String(input.audience ?? "publico"),
        metadata: input.metadata ?? {},
        status: input.status ?? "borrador",
        publishedAt: input.status === "publicado" ? new Date() : null
      })
      .returning({ publicId: publicResources.publicId, title: publicResources.title, status: publicResources.status });
    return resource;
  }

  if (moduleId === "notifications") {
    const [notification] = await db
      .insert(notifications)
      .values({
        publicId,
        priority: String(input.priority ?? "informativa"),
        channel: String(input.channel ?? "in_app"),
        safeSummary: input.title
      })
      .returning({ publicId: notifications.publicId, title: notifications.safeSummary, status: notifications.status });
    return notification;
  }

  throw new Error("UNSUPPORTED_MODULE_OPERATION");
}

export async function createAnalyticsGovernanceRecord(input:
  | { recordType: "dashboard"; title: string; audience: string; widgets?: Array<Record<string, unknown>>; filters?: Record<string, unknown>; actor: Actor }
  | { recordType: "metric_export"; metricCode: string; exportType: string; filters?: Record<string, unknown>; purpose: string; actor: Actor }
) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const actorRow = await findUserRow(input.actor.id);
  if (input.recordType === "dashboard") {
    const [row] = await db
      .insert(dashboardLayouts)
      .values({
        publicId: `dash_${nanoid(10)}`,
        ownerUserId: actorRow?.id,
        title: input.title,
        audience: input.audience,
        widgets: input.widgets ?? [],
        filters: input.filters ?? {}
      })
      .returning({ id: dashboardLayouts.publicId, title: dashboardLayouts.title, status: dashboardLayouts.status });
    return row;
  }

  const [row] = await db
    .insert(metricExports)
    .values({
      publicId: `mexp_${nanoid(10)}`,
      actorUserId: actorRow?.id,
      metricCode: input.metricCode,
      exportType: input.exportType,
      filters: input.filters ?? {},
      purpose: input.purpose
    })
    .returning({ id: metricExports.publicId, title: metricExports.metricCode, status: metricExports.exportType });
  return row;
}

export async function createAiGovernanceRecord(input:
  | { recordType: "model"; provider: string; model: string; purpose: string; owner: string; status?: string; evaluation?: Record<string, unknown>; actor: Actor }
  | { recordType: "decision"; modelPublicId?: string; resourceType: string; resourceId: string; prompt: string; response: string; humanDecision?: string; actor: Actor }
) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  if (input.recordType === "model") {
    const [row] = await db
      .insert(aiModelRegistry)
      .values({
        publicId: `aim_${nanoid(10)}`,
        provider: input.provider,
        model: input.model,
        purpose: input.purpose,
        owner: input.owner,
        status: input.status ?? "apagado",
        evaluation: input.evaluation ?? {}
      })
      .returning({ id: aiModelRegistry.publicId, title: aiModelRegistry.model, status: aiModelRegistry.status });
    return row;
  }

  const modelRow = input.modelPublicId
    ? (await db.select({ id: aiModelRegistry.id }).from(aiModelRegistry).where(eq(aiModelRegistry.publicId, input.modelPublicId)).limit(1))[0]
    : null;
  const [row] = await db
    .insert(aiDecisionLogs)
    .values({
      publicId: `aid_${nanoid(10)}`,
      modelRegistryId: modelRow?.id,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      promptDigest: sha256Digest(input.prompt),
      responseDigest: sha256Digest(input.response),
      humanDecision: input.humanDecision
    })
    .returning({ id: aiDecisionLogs.publicId, title: aiDecisionLogs.resourceType, status: aiDecisionLogs.humanDecision });
  return { ...row, status: row.status ?? "pendiente_revision" };
}

export async function createPrivacyGovernanceRecord(input:
  | { recordType: "processing"; purpose: string; audience: string; dataCategories?: string[]; legalBasis: string; retentionRule: string; actor: Actor }
  | { recordType: "retention"; category: string; jurisdiction: string; retentionDays: number; legalHold?: boolean; actor: Actor }
) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  if (input.recordType === "processing") {
    const [row] = await db
      .insert(privacyProcessingRecords)
      .values({
        publicId: `proc_${nanoid(10)}`,
        purpose: input.purpose,
        audience: input.audience,
        dataCategories: input.dataCategories ?? [],
        legalBasis: input.legalBasis,
        retentionRule: input.retentionRule
      })
      .returning({ id: privacyProcessingRecords.publicId, title: privacyProcessingRecords.purpose, status: privacyProcessingRecords.status });
    return row;
  }

  const [row] = await db
    .insert(retentionPolicies)
    .values({
      publicId: `ret_${nanoid(10)}`,
      category: input.category,
      jurisdiction: input.jurisdiction,
      retentionDays: input.retentionDays,
      legalHold: input.legalHold ?? false
    })
    .returning({ id: retentionPolicies.publicId, title: retentionPolicies.category, status: retentionPolicies.status });
  return row;
}

export async function createInstitutionalBody(input: {
  organizationPublicId: string;
  bodyType: string;
  name: string;
  quorumRules?: Record<string, unknown>;
  annualPlan?: Record<string, unknown>;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const organization = await findOrganizationRow(input.organizationPublicId);
  if (!organization) throw new Error("ORGANIZATION_NOT_FOUND");
  const publicId = `body_${nanoid(10)}`;
  const [body] = await db
    .insert(institutionalBodies)
    .values({
      publicId,
      organizationId: organization.id,
      bodyType: input.bodyType,
      name: input.name,
      quorumRules: input.quorumRules ?? {},
      annualPlan: input.annualPlan ?? {}
    })
    .returning({ publicId: institutionalBodies.publicId, name: institutionalBodies.name, status: institutionalBodies.status });
  await db.insert(auditEvents).values({
    action: "institutional_body.create",
    resourceType: "institutional_body",
    resourceId: body.publicId,
    reason: "institutional_governance",
    metadata: { actorId: input.actor.id, bodyType: input.bodyType }
  });
  return body;
}

export async function createServiceDirectoryEntry(input: {
  organizationPublicId?: string;
  serviceType: string;
  name: string;
  territory?: Record<string, unknown>;
  contactPolicy?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const organization = input.organizationPublicId ? await findOrganizationRow(input.organizationPublicId) : null;
  if (input.organizationPublicId && !organization) throw new Error("ORGANIZATION_NOT_FOUND");
  const publicId = `svc_${nanoid(10)}`;
  const [entry] = await db
    .insert(serviceDirectoryEntries)
    .values({
      publicId,
      organizationId: organization?.id,
      serviceType: input.serviceType,
      name: input.name,
      territory: input.territory ?? {},
      contactPolicy: input.contactPolicy ?? {},
      metadata: input.metadata ?? {}
    })
    .returning({ publicId: serviceDirectoryEntries.publicId, name: serviceDirectoryEntries.name, status: serviceDirectoryEntries.status });
  await db.insert(auditEvents).values({
    action: "service_directory_entry.create",
    resourceType: "service_directory_entry",
    resourceId: entry.publicId,
    reason: "external_interoperability_directory",
    metadata: { actorId: input.actor.id, serviceType: input.serviceType }
  });
  return entry;
}

export async function createEmirDispatch(input: {
  organizationPublicId?: string;
  caseId?: string;
  teamName: string;
  coverageArea?: Record<string, unknown>;
  approximateLocation?: Record<string, unknown>;
  capacitySnapshot?: Record<string, unknown>;
  status?: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const organization = input.organizationPublicId ? await findOrganizationRow(input.organizationPublicId) : null;
  if (input.organizationPublicId && !organization) throw new Error("ORGANIZATION_NOT_FOUND");
  const caseRow = input.caseId ? await findCaseRow(input.caseId) : null;
  if (input.caseId && !caseRow) throw new Error("CASE_NOT_FOUND");
  const publicId = `emir_${nanoid(10)}`;
  const [dispatch] = await db
    .insert(emirDispatches)
    .values({
      publicId,
      organizationId: organization?.id,
      caseId: caseRow?.id,
      teamName: input.teamName,
      coverageArea: input.coverageArea ?? {},
      approximateLocation: input.approximateLocation ?? {},
      capacitySnapshot: input.capacitySnapshot ?? {},
      status: input.status ?? "disponible",
      dispatchedAt: input.status === "despachado" ? new Date() : null
    })
    .returning({ publicId: emirDispatches.publicId, teamName: emirDispatches.teamName, status: emirDispatches.status });
  await db.insert(auditEvents).values({
    action: "emir_dispatch.create",
    resourceType: "emir_dispatch",
    resourceId: dispatch.publicId,
    reason: "emir_availability_and_dispatch",
    metadata: { actorId: input.actor.id, caseId: caseRow?.publicId }
  });
  return dispatch;
}

export async function createCommunicationCampaign(input: {
  title: string;
  audience: string;
  territory?: Record<string, unknown>;
  language?: string;
  channelPlan?: Record<string, unknown>;
  contentPolicy?: Record<string, unknown>;
  startsAt?: string;
  endsAt?: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const publicId = `camp_${nanoid(10)}`;
  const [campaign] = await db
    .insert(communicationCampaigns)
    .values({
      publicId,
      title: input.title,
      audience: input.audience,
      territory: input.territory ?? {},
      language: input.language ?? "es",
      channelPlan: input.channelPlan ?? {},
      contentPolicy: input.contentPolicy ?? {},
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      endsAt: input.endsAt ? new Date(input.endsAt) : null
    })
    .returning({ publicId: communicationCampaigns.publicId, title: communicationCampaigns.title, status: communicationCampaigns.status });
  await db.insert(auditEvents).values({
    action: "communication_campaign.create",
    resourceType: "communication_campaign",
    resourceId: campaign.publicId,
    reason: "accessible_campaign_governance",
    metadata: { actorId: input.actor.id, audience: input.audience }
  });
  return campaign;
}

export async function createContextualAdaptation(input: {
  title: string;
  organizationPublicId?: string;
  territory?: Record<string, unknown>;
  population: string;
  justification: string;
  risks?: Record<string, unknown>;
  evidence?: Record<string, unknown>;
  publicSummary?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const organization = input.organizationPublicId ? await findOrganizationRow(input.organizationPublicId) : null;
  if (input.organizationPublicId && !organization) throw new Error("ORGANIZATION_NOT_FOUND");
  const publicId = `adapt_${nanoid(10)}`;
  const [adaptation] = await db
    .insert(contextualAdaptations)
    .values({
      publicId,
      title: input.title,
      requestingOrganizationId: organization?.id,
      territory: input.territory ?? {},
      population: input.population,
      justification: input.justification,
      risks: input.risks ?? {},
      evidence: input.evidence ?? {},
      publicSummary: input.publicSummary,
      effectiveFrom: input.effectiveFrom ? new Date(input.effectiveFrom) : null,
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null
    })
    .returning({ publicId: contextualAdaptations.publicId, title: contextualAdaptations.title, status: contextualAdaptations.approvalStatus });
  await db.insert(auditEvents).values({
    action: "contextual_adaptation.create",
    resourceType: "contextual_adaptation",
    resourceId: adaptation.publicId,
    reason: "uepe_contextual_adaptation_request",
    metadata: { actorId: input.actor.id, organizationPublicId: input.organizationPublicId }
  });
  return adaptation;
}

export async function createNotificationTemplate(input: {
  name: string;
  channel: string;
  priority: string;
  locale?: string;
  safeBody: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const publicId = `ntpl_${nanoid(10)}`;
  const [template] = await db
    .insert(notificationTemplates)
    .values({
      publicId,
      name: input.name,
      channel: input.channel,
      priority: input.priority,
      locale: input.locale ?? "es-MX",
      safeBody: input.safeBody
    })
    .returning({ publicId: notificationTemplates.publicId, name: notificationTemplates.name, status: notificationTemplates.status });
  await db.insert(auditEvents).values({
    action: "notification_template.create",
    resourceType: "notification_template",
    resourceId: template.publicId,
    reason: "safe_notification_template",
    metadata: { actorId: input.actor.id, channel: input.channel, priority: input.priority }
  });
  return template;
}

export async function acknowledgeNotification(input: { notificationId: string; actor: Actor }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [notification] = await db
    .update(notifications)
    .set({ status: "acuse", acknowledgedAt: new Date() })
    .where(eq(notifications.publicId, input.notificationId))
    .returning({ publicId: notifications.publicId, status: notifications.status, acknowledgedAt: notifications.acknowledgedAt });
  if (!notification) throw new Error("NOTIFICATION_NOT_FOUND");
  await db.insert(auditEvents).values({
    action: "notification.acknowledge",
    resourceType: "notification",
    resourceId: notification.publicId,
    reason: "critical_notification_ack",
    metadata: { actorId: input.actor.id }
  });
  return { id: notification.publicId, status: notification.status, acknowledgedAt: notification.acknowledgedAt ? toIso(notification.acknowledgedAt) : null };
}

export async function acknowledgeReferral(input: { referralId: string; actor: Actor; externalStatus?: string }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [referral] = await db
    .update(referrals)
    .set({ status: input.externalStatus ?? "acuse_recibido" })
    .where(eq(referrals.publicId, input.referralId))
    .returning({ publicId: referrals.publicId, status: referrals.status });
  if (!referral) throw new Error("REFERRAL_NOT_FOUND");
  await db.insert(auditEvents).values({
    action: "referral.acknowledge",
    resourceType: "referral",
    resourceId: referral.publicId,
    reason: "closed_loop_external_ack",
    metadata: { actorId: input.actor.id, externalStatus: input.externalStatus }
  });
  return { id: referral.publicId, status: referral.status };
}

export async function createIntegrationEvent(input: {
  idempotencyKey: string;
  source: string;
  eventType: string;
  signatureDigest?: string;
  payload?: Record<string, unknown>;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const publicId = `evt_${nanoid(10)}`;
  const [event] = await db
    .insert(integrationEvents)
    .values({
      publicId,
      idempotencyKey: input.idempotencyKey,
      source: input.source,
      eventType: input.eventType,
      signatureDigest: input.signatureDigest,
      payload: input.payload ?? {}
    })
    .returning({ publicId: integrationEvents.publicId, status: integrationEvents.status, createdAt: integrationEvents.createdAt });
  await db.insert(auditEvents).values({
    action: "integration_event.receive",
    resourceType: "integration_event",
    resourceId: event.publicId,
    reason: "signed_external_event",
    metadata: { actorId: input.actor.id, source: input.source, eventType: input.eventType, idempotencyKey: input.idempotencyKey }
  });
  return { id: event.publicId, status: event.status, createdAt: toIso(event.createdAt) };
}

export async function recordAiFeedback(input: {
  resourceType: string;
  resourceId: string;
  rating: "util" | "incorrecta" | "riesgosa";
  notes?: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const publicId = `aifb_${nanoid(10)}`;
  const [feedback] = await db
    .insert(aiFeedback)
    .values({
      publicId,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      rating: input.rating,
      notesCiphertext: input.notes ? encryptSensitiveText(input.notes) : undefined
    })
    .returning({ publicId: aiFeedback.publicId, rating: aiFeedback.rating, createdAt: aiFeedback.createdAt });

  await db.insert(auditEvents).values({
    action: "ai_feedback.create",
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    reason: "human_model_governance_feedback",
    metadata: { actorId: input.actor.id, feedbackId: feedback.publicId, rating: feedback.rating }
  });

  return { id: feedback.publicId, rating: feedback.rating, createdAt: toIso(feedback.createdAt) };
}

export async function verifyCertification(publicCode: string) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const [certificate] = await db
    .select({
      publicCode: trainingEnrollments.certificatePublicCode,
      status: trainingEnrollments.status,
      progressPercent: trainingEnrollments.progressPercent,
      certifiedAt: trainingEnrollments.certifiedAt,
      expiresAt: trainingEnrollments.expiresAt,
      person: users.displayName,
      program: trainingPrograms.title
    })
    .from(trainingEnrollments)
    .innerJoin(users, eq(trainingEnrollments.userId, users.id))
    .innerJoin(trainingPrograms, eq(trainingEnrollments.programId, trainingPrograms.id))
    .where(eq(trainingEnrollments.certificatePublicCode, publicCode))
    .limit(1);

  if (!certificate) return null;
  return {
    publicCode: certificate.publicCode,
    status: certificate.status,
    progressPercent: certificate.progressPercent,
    certifiedAt: certificate.certifiedAt ? toIso(certificate.certifiedAt) : null,
    expiresAt: certificate.expiresAt ? toIso(certificate.expiresAt) : null,
    person: certificate.person,
    program: certificate.program
  };
}

export async function listOrganizations() {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  return db
    .select({
      id: organizations.publicId,
      name: organizations.name,
      type: organizations.type,
      stateCode: organizations.stateCode,
      municipalityCode: organizations.municipalityCode,
      createdAt: organizations.createdAt
    })
    .from(organizations)
    .orderBy(desc(organizations.createdAt))
    .limit(250);
}

export async function createOrganization(input: {
  publicId?: string;
  name: string;
  type: "federal" | "state" | "municipality" | "zone" | "school";
  stateCode?: string;
  municipalityCode?: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const publicId = input.publicId || `org_${nanoid(10)}`;
  const [organization] = await db
    .insert(organizations)
    .values({
      publicId,
      name: input.name,
      type: input.type,
      stateCode: input.stateCode,
      municipalityCode: input.municipalityCode
    })
    .returning({ publicId: organizations.publicId, name: organizations.name, type: organizations.type });

  await db.insert(auditEvents).values({
    action: "organization.create",
    resourceType: "organization",
    resourceId: organization.publicId,
    reason: "institutional_catalog_update",
    metadata: { actorId: input.actor.id }
  });

  return organization;
}

export async function createUserWithAssignment(input: {
  externalSubject: string;
  displayName: string;
  email?: string;
  organizationPublicId: string;
  role: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const organization = await findOrganizationRow(input.organizationPublicId);
  if (!organization) throw new Error("ORGANIZATION_NOT_FOUND");

  const [user] = await db
    .insert(users)
    .values({
      externalSubject: input.externalSubject,
      displayName: input.displayName,
      email: input.email
    })
    .returning({ id: users.id, externalSubject: users.externalSubject, displayName: users.displayName });

  await db.insert(userAssignments).values({
    userId: user.id,
    organizationId: organization.id,
    role: input.role
  });
  await db.insert(auditEvents).values({
    action: "user_assignment.create",
    resourceType: "user",
    resourceId: user.externalSubject,
    reason: "identity_access_update",
    metadata: { actorId: input.actor.id, role: input.role, organizationPublicId: organization.publicId }
  });

  return { id: user.externalSubject, displayName: user.displayName, role: input.role, organizationId: organization.publicId };
}

export async function createPrivacyRequest(input: {
  requestType: string;
  requesterContact: string;
  scope?: Record<string, unknown>;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const publicId = `priv_${nanoid(10)}`;
  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 20);
  const [request] = await db
    .insert(privacyRequests)
    .values({
      publicId,
      requestType: input.requestType,
      requesterContactCiphertext: encryptSensitiveText(input.requesterContact),
      scope: input.scope ?? {},
      dueAt
    })
    .returning({ publicId: privacyRequests.publicId, status: privacyRequests.status, dueAt: privacyRequests.dueAt });

  await db.insert(auditEvents).values({
    action: "privacy_request.create",
    resourceType: "privacy_request",
    resourceId: request.publicId,
    reason: "data_subject_rights",
    metadata: { requestType: input.requestType }
  });

  return { id: request.publicId, status: request.status, dueAt: toIso(request.dueAt) };
}

export async function listPrivacyRequests() {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const rows = await db
    .select({
      id: privacyRequests.publicId,
      title: privacyRequests.requestType,
      status: privacyRequests.status,
      updatedAt: privacyRequests.createdAt,
      detail: privacyRequests.dueAt
    })
    .from(privacyRequests)
    .orderBy(desc(privacyRequests.createdAt))
    .limit(100);
  return rows.map((row) => platformRecord({ ...row, detail: row.detail ? `Vence ${toIso(row.detail)}` : "" }));
}

// EP-13: metricas certificadas ya filtradas por el alcance efectivo del actor,
// para render autenticado (tarjetas y graficas accesibles).
// Sistema de Dashboards (Fase 1): compone el panel del actor a partir de su
// preset (rol) con datos reales ya filtrados por permiso. No inventa cifras.
export async function getDashboardModel(actor: Actor) {
  const preset = presetForRoles(actor.roles);
  const [allReports, allCases] = isDatabaseConfigured() ? await Promise.all([listReports(), listCases()]) : [[], []];
  const reports = allReports.filter((report) => canReadReport(actor, report));
  const cases = allCases.filter((caseFile) => canReadCase(actor, caseFile));
  const widgets = buildCertifiedWidgets(reports, cases);
  const ctx = { actor, cases, reports, widgets };
  const selected = preset.widgetIds
    .map((id) => widgets.find((widget) => widget.id === id))
    .filter((widget): widget is (typeof widgets)[number] => Boolean(widget));
  const scopeLabel = actor.scope.organizationId ?? actor.scope.stateCode ?? "Alcance completo";
  return {
    preset,
    kpis: resolveKpis(preset, ctx),
    panels: buildDashboardPanels(preset, ctx),
    widgets: selected,
    updatedAt: toIso(new Date()),
    databaseConfigured: isDatabaseConfigured(),
    scopeLabel
  };
}

export async function getCertifiedWidgetsForActor(actor: Actor) {
  if (!isDatabaseConfigured()) return buildCertifiedWidgets([], []);
  const [allReports, allCases] = await Promise.all([listReports(), listCases()]);
  const reports_ = allReports.filter((report) => canReadReport(actor, report));
  const cases_ = allCases.filter((caseFile) => canReadCase(actor, caseFile));
  return buildCertifiedWidgets(reports_, cases_);
}

// EP-18: indicadores agregados para el portal publico (con supresion de celdas
// pequenas). No expone folios ni registros individuales.
export async function getPublicIndicators() {
  if (!isDatabaseConfigured()) {
    return buildPublicIndicators([], []);
  }
  const [reports_, cases_] = await Promise.all([listReports(), listCases()]);
  return buildPublicIndicators(reports_, cases_);
}

// ---------------------------------------------------------------------------
// Portal publico: modulo de publicaciones (comunicados / noticias / recursos).
// ---------------------------------------------------------------------------

export type PublicPost = {
  id: string;
  kind: string;
  title: string;
  slug: string;
  summary: string;
  tag: string | null;
  coverImagePath: string | null;
  externalUrl: string | null;
  publishedAt: string | null;
};

const CONTENT_KINDS = new Set(["comunicado", "noticia", "recurso"]);

function slugify(value: string) {
  const base = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base || "publicacion"}-${nanoid(6).toLowerCase()}`;
}

function toPublicPost(row: {
  publicId: string;
  kind: string;
  title: string;
  slug: string;
  summary: string;
  tag: string | null;
  coverImagePath: string | null;
  externalUrl: string | null;
  publishedAt: Date | null;
}): PublicPost {
  return {
    id: row.publicId,
    kind: row.kind,
    title: row.title,
    slug: row.slug,
    summary: row.summary,
    tag: row.tag,
    coverImagePath: row.coverImagePath,
    externalUrl: row.externalUrl,
    publishedAt: row.publishedAt ? toIso(row.publishedAt) : null
  };
}

// Publicaciones visibles en el portal, mas recientes primero.
export async function listPublishedPosts(limit = 12): Promise<PublicPost[]> {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const rows = await db
    .select({
      publicId: contentPosts.publicId,
      kind: contentPosts.kind,
      title: contentPosts.title,
      slug: contentPosts.slug,
      summary: contentPosts.summary,
      tag: contentPosts.tag,
      coverImagePath: contentPosts.coverImagePath,
      externalUrl: contentPosts.externalUrl,
      publishedAt: contentPosts.publishedAt
    })
    .from(contentPosts)
    .where(eq(contentPosts.status, "publicado"))
    .orderBy(desc(contentPosts.publishedAt))
    .limit(limit);
  return rows.map(toPublicPost);
}

// Detalle de una publicacion publicada por slug (incluye cuerpo).
export async function getPublishedPostBySlug(slug: string) {
  if (!isDatabaseConfigured()) return null;
  const db = getDb();
  const [row] = await db
    .select()
    .from(contentPosts)
    .where(and(eq(contentPosts.slug, slug), eq(contentPosts.status, "publicado")))
    .limit(1);
  if (!row) return null;
  return { ...toPublicPost(row), body: row.body };
}

// Todas las publicaciones (borradores incluidos) para el backoffice.
export async function listContentPostsForAdmin(limit = 100) {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const rows = await db
    .select({
      publicId: contentPosts.publicId,
      kind: contentPosts.kind,
      title: contentPosts.title,
      slug: contentPosts.slug,
      status: contentPosts.status,
      tag: contentPosts.tag,
      publishedAt: contentPosts.publishedAt,
      updatedAt: contentPosts.updatedAt
    })
    .from(contentPosts)
    .orderBy(desc(contentPosts.updatedAt))
    .limit(limit);
  return rows.map((row) => ({
    id: row.publicId,
    kind: row.kind,
    title: row.title,
    slug: row.slug,
    status: row.status,
    tag: row.tag,
    publishedAt: row.publishedAt ? toIso(row.publishedAt) : null,
    updatedAt: toIso(row.updatedAt)
  }));
}

export async function createContentPost(input: {
  kind: string;
  title: string;
  summary: string;
  body?: string;
  tag?: string;
  coverImagePath?: string;
  externalUrl?: string;
  publish?: boolean;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  if (!CONTENT_KINDS.has(input.kind)) throw new Error("INVALID_CONTENT_KIND");

  const db = getDb();
  const author = await findUserRow(input.actor.id);
  const publish = input.publish ?? false;
  const publicId = `post_${nanoid(10)}`;
  const [row] = await db
    .insert(contentPosts)
    .values({
      publicId,
      kind: input.kind,
      title: input.title,
      slug: slugify(input.title),
      summary: input.summary,
      body: input.body ?? "",
      tag: input.tag,
      coverImagePath: input.coverImagePath,
      externalUrl: input.externalUrl,
      status: publish ? "publicado" : "borrador",
      publishedAt: publish ? new Date() : null,
      authorUserId: author?.id
    })
    .returning({ publicId: contentPosts.publicId, slug: contentPosts.slug, status: contentPosts.status });

  await db.insert(auditEvents).values({
    action: "content_post.create",
    resourceType: "content_post",
    resourceId: row.publicId,
    reason: "content_publication",
    metadata: { actorId: input.actor.id, kind: input.kind, status: row.status }
  });

  return { id: row.publicId, slug: row.slug, status: row.status };
}

export async function setContentPostStatus(input: { postId: string; status: "publicado" | "borrador"; actor: Actor }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [row] = await db
    .update(contentPosts)
    .set({ status: input.status, publishedAt: input.status === "publicado" ? new Date() : null, updatedAt: new Date() })
    .where(eq(contentPosts.publicId, input.postId))
    .returning({ publicId: contentPosts.publicId, status: contentPosts.status });
  if (!row) throw new Error("CONTENT_POST_NOT_FOUND");

  await db.insert(auditEvents).values({
    action: "content_post.status",
    resourceType: "content_post",
    resourceId: row.publicId,
    reason: "content_publication",
    metadata: { actorId: input.actor.id, status: row.status }
  });
  return { id: row.publicId, status: row.status };
}

// Elimina una publicación del portal (borrado permanente) con rastro de auditoría.
export async function deleteContentPost(input: { postId: string; actor: Actor }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [row] = await db
    .delete(contentPosts)
    .where(eq(contentPosts.publicId, input.postId))
    .returning({ publicId: contentPosts.publicId });
  if (!row) throw new Error("CONTENT_POST_NOT_FOUND");

  await db.insert(auditEvents).values({
    action: "content_post.delete",
    resourceType: "content_post",
    resourceId: row.publicId,
    reason: "content_publication",
    metadata: { actorId: input.actor.id }
  });
  return { id: row.publicId };
}

// EP-01: baja de cuenta. Desactiva al usuario y revoca TODAS sus sesiones para
// que ninguna cuenta desactivada conserve sesiones validas (6.1).
export async function deactivateUser(input: { externalSubject: string; reason: string; actor: Actor }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const user = await findUserRow(input.externalSubject);
  if (!user) throw new Error("USER_NOT_FOUND");

  const now = new Date();
  await db.update(users).set({ disabledAt: now }).where(eq(users.id, user.id));
  const revoked = await db
    .update(userSessions)
    .set({ revokedAt: now })
    .where(and(eq(userSessions.userId, user.id), isNull(userSessions.revokedAt)))
    .returning({ publicId: userSessions.publicId });
  await db
    .update(userAssignments)
    .set({ endsAt: now })
    .where(and(eq(userAssignments.userId, user.id), isNull(userAssignments.endsAt)));

  await db.insert(auditEvents).values({
    action: "user.deactivate",
    resourceType: "user",
    resourceId: user.externalSubject,
    reason: input.reason,
    metadata: { actorId: input.actor.id, revokedSessions: revoked.length }
  });
  return { id: user.externalSubject, status: "desactivado", revokedSessions: revoked.length };
}

// EP-01: fin de adscripcion. Cierra la asignacion vigente y revoca sesiones para
// que un cambio de adscripcion retire accesos anteriores de inmediato (6.1).
export async function revokeUserAssignment(input: { externalSubject: string; organizationPublicId: string; reason: string; actor: Actor }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const user = await findUserRow(input.externalSubject);
  if (!user) throw new Error("USER_NOT_FOUND");
  const organization = await findOrganizationRow(input.organizationPublicId);
  if (!organization) throw new Error("ORGANIZATION_NOT_FOUND");

  const now = new Date();
  const ended = await db
    .update(userAssignments)
    .set({ endsAt: now })
    .where(and(eq(userAssignments.userId, user.id), eq(userAssignments.organizationId, organization.id), isNull(userAssignments.endsAt)))
    .returning({ id: userAssignments.id });
  const revoked = await db
    .update(userSessions)
    .set({ revokedAt: now })
    .where(and(eq(userSessions.userId, user.id), isNull(userSessions.revokedAt)))
    .returning({ publicId: userSessions.publicId });

  await db.insert(auditEvents).values({
    action: "user_assignment.revoke",
    resourceType: "user",
    resourceId: user.externalSubject,
    reason: input.reason,
    metadata: { actorId: input.actor.id, organizationPublicId: organization.publicId, endedAssignments: ended.length, revokedSessions: revoked.length }
  });
  return { id: user.externalSubject, endedAssignments: ended.length, revokedSessions: revoked.length };
}

// ---------------------------------------------------------------------------
// Transiciones de ciclo de vida (EP-04, EP-05, EP-06, EP-07, EP-10, EP-13,
// EP-14, EP-15, EP-17). Reutilizan el modelo de datos existente y registran
// evento de auditoria append-only por cada mutacion sensible.
// ---------------------------------------------------------------------------

// EP-07: ciclo de vida de despacho EMIR (disponible -> despachado -> en_sitio ->
// liberado) con sellos de tiempo de llegada e intervencion.
const emirTransitions: Record<string, { next: string[]; stamp?: "dispatchedAt" | "arrivedAt" | "releasedAt" }> = {
  disponible: { next: ["despachado"] },
  despachado: { next: ["en_sitio"], stamp: "dispatchedAt" },
  en_sitio: { next: ["liberado"], stamp: "arrivedAt" },
  liberado: { next: [], stamp: "releasedAt" }
};

export async function advanceEmirDispatch(input: { dispatchId: string; toStatus: string; capacitySnapshot?: Record<string, unknown>; actor: Actor }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [dispatch] = await db
    .select({ id: emirDispatches.id, publicId: emirDispatches.publicId, status: emirDispatches.status })
    .from(emirDispatches)
    .where(eq(emirDispatches.publicId, input.dispatchId))
    .limit(1);
  if (!dispatch) throw new Error("EMIR_DISPATCH_NOT_FOUND");

  const allowed = emirTransitions[dispatch.status]?.next ?? [];
  if (!allowed.includes(input.toStatus)) throw new Error("INVALID_DISPATCH_TRANSITION");

  const stampField = emirTransitions[input.toStatus]?.stamp;
  const updateValues: Record<string, unknown> = { status: input.toStatus };
  if (stampField) updateValues[stampField] = new Date();
  if (input.capacitySnapshot) updateValues.capacitySnapshot = input.capacitySnapshot;

  const [updated] = await db
    .update(emirDispatches)
    .set(updateValues)
    .where(eq(emirDispatches.id, dispatch.id))
    .returning({ publicId: emirDispatches.publicId, status: emirDispatches.status });

  await db.insert(auditEvents).values({
    action: "emir_dispatch.advance",
    resourceType: "emir_dispatch",
    resourceId: updated.publicId,
    reason: "emir_lifecycle_transition",
    metadata: { actorId: input.actor.id, from: dispatch.status, to: input.toStatus }
  });
  return { id: updated.publicId, status: updated.status };
}

// EP-07: sesiones de cuerpos colegiados con quorum, acuerdos y tareas.
export async function createInstitutionalSession(input: {
  bodyPublicId: string;
  scheduledAt: string;
  agenda?: Array<Record<string, unknown>>;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [body] = await db
    .select({ id: institutionalBodies.id, publicId: institutionalBodies.publicId })
    .from(institutionalBodies)
    .where(eq(institutionalBodies.publicId, input.bodyPublicId))
    .limit(1);
  if (!body) throw new Error("INSTITUTIONAL_BODY_NOT_FOUND");

  const publicId = `isession_${nanoid(10)}`;
  const [session] = await db
    .insert(institutionalSessions)
    .values({
      publicId,
      bodyId: body.id,
      scheduledAt: new Date(input.scheduledAt),
      agenda: input.agenda ?? []
    })
    .returning({ publicId: institutionalSessions.publicId, status: institutionalSessions.status });

  await db.insert(auditEvents).values({
    action: "institutional_session.create",
    resourceType: "institutional_session",
    resourceId: session.publicId,
    reason: "collegiate_governance",
    metadata: { actorId: input.actor.id, bodyPublicId: body.publicId }
  });
  return { id: session.publicId, status: session.status };
}

export async function recordInstitutionalSessionOutcome(input: {
  sessionId: string;
  presentMembers: number;
  agreements?: Array<Record<string, unknown>>;
  tasks?: Array<Record<string, unknown>>;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [session] = await db
    .select({ id: institutionalSessions.id, publicId: institutionalSessions.publicId, bodyId: institutionalSessions.bodyId })
    .from(institutionalSessions)
    .where(eq(institutionalSessions.publicId, input.sessionId))
    .limit(1);
  if (!session) throw new Error("INSTITUTIONAL_SESSION_NOT_FOUND");

  // Quorum: mayoria simple de integrantes vigentes del cuerpo, salvo regla
  // configurada. La regla fina vive en institutionalBodies.quorumRules.
  const members = await db
    .select({ id: institutionalBodyMembers.id })
    .from(institutionalBodyMembers)
    .where(eq(institutionalBodyMembers.bodyId, session.bodyId));
  const required = Math.floor(members.length / 2) + 1;
  const quorumMet = members.length > 0 && input.presentMembers >= required;

  const [updated] = await db
    .update(institutionalSessions)
    .set({
      quorumMet,
      agreements: input.agreements ?? [],
      tasks: input.tasks ?? [],
      status: quorumMet ? "celebrada" : "sin_quorum"
    })
    .where(eq(institutionalSessions.id, session.id))
    .returning({ publicId: institutionalSessions.publicId, status: institutionalSessions.status, quorumMet: institutionalSessions.quorumMet });

  await db.insert(auditEvents).values({
    action: "institutional_session.outcome",
    resourceType: "institutional_session",
    resourceId: updated.publicId,
    reason: "collegiate_agreements",
    metadata: { actorId: input.actor.id, quorumMet, presentMembers: input.presentMembers, requiredForQuorum: required }
  });
  return { id: updated.publicId, status: updated.status, quorumMet: updated.quorumMet, requiredForQuorum: required };
}

// EP-10: inscripcion, emision de certificado verificable por QR y recertificacion.
export async function enrollInTraining(input: { programPublicId: string; userExternalSubject: string; actor: Actor }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [program] = await db.select({ id: trainingPrograms.id }).from(trainingPrograms).where(eq(trainingPrograms.publicId, input.programPublicId)).limit(1);
  if (!program) throw new Error("TRAINING_PROGRAM_NOT_FOUND");
  const user = await findUserRow(input.userExternalSubject);
  if (!user) throw new Error("USER_NOT_FOUND");

  const [enrollment] = await db
    .insert(trainingEnrollments)
    .values({ userId: user.id, programId: program.id })
    .returning({ id: trainingEnrollments.id, status: trainingEnrollments.status, progressPercent: trainingEnrollments.progressPercent });

  await db.insert(auditEvents).values({
    action: "training_enrollment.create",
    resourceType: "training_enrollment",
    resourceId: enrollment.id,
    reason: "certification_by_competency",
    metadata: { actorId: input.actor.id, programPublicId: input.programPublicId, userExternalSubject: input.userExternalSubject }
  });
  return { id: enrollment.id, status: enrollment.status, progressPercent: enrollment.progressPercent };
}

export async function issueCertification(input: { enrollmentId: string; validityMonths?: number; actor: Actor }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [enrollment] = await db
    .select({ id: trainingEnrollments.id, progressPercent: trainingEnrollments.progressPercent })
    .from(trainingEnrollments)
    .where(eq(trainingEnrollments.id, input.enrollmentId))
    .limit(1);
  if (!enrollment) throw new Error("TRAINING_ENROLLMENT_NOT_FOUND");
  if (enrollment.progressPercent < 100) throw new Error("TRAINING_INCOMPLETE");

  const validityMonths = Math.min(Math.max(input.validityMonths ?? 24, 1), 60);
  const certifiedAt = new Date();
  const expiresAt = new Date(certifiedAt);
  expiresAt.setMonth(expiresAt.getMonth() + validityMonths);
  const certificatePublicCode = `CERT-${nanoid(6).toUpperCase()}-${nanoid(6).toUpperCase()}`;

  const [updated] = await db
    .update(trainingEnrollments)
    .set({ status: "certificado", certificatePublicCode, certifiedAt, expiresAt, updatedAt: new Date() })
    .where(eq(trainingEnrollments.id, enrollment.id))
    .returning({ certificatePublicCode: trainingEnrollments.certificatePublicCode, expiresAt: trainingEnrollments.expiresAt });

  await db.insert(auditEvents).values({
    action: "training_certification.issue",
    resourceType: "training_enrollment",
    resourceId: input.enrollmentId,
    reason: "verifiable_certification",
    metadata: { actorId: input.actor.id, certificatePublicCode: updated.certificatePublicCode }
  });
  return {
    id: input.enrollmentId,
    certificatePublicCode: updated.certificatePublicCode,
    expiresAt: updated.expiresAt ? toIso(updated.expiresAt) : null,
    verifyPath: `/api/v1/certifications/verify/${updated.certificatePublicCode}`
  };
}

// EP-05: revision del plan de intervencion, evaluacion de resultados y ciclo de
// no repeticion (revision semanal/mensual/trimestral).
export async function reviewInterventionPlan(input: {
  planId: string;
  outcome: string;
  status?: string;
  nextReviewAt?: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [plan] = await db
    .select({ id: interventionPlans.id, publicId: interventionPlans.publicId, caseId: interventionPlans.caseId })
    .from(interventionPlans)
    .where(eq(interventionPlans.publicId, input.planId))
    .limit(1);
  if (!plan) throw new Error("INTERVENTION_PLAN_NOT_FOUND");

  const [updated] = await db
    .update(interventionPlans)
    .set({
      status: input.status ?? "en_revision",
      nextReviewAt: input.nextReviewAt ? new Date(input.nextReviewAt) : null,
      updatedAt: new Date()
    })
    .where(eq(interventionPlans.id, plan.id))
    .returning({ publicId: interventionPlans.publicId, status: interventionPlans.status, nextReviewAt: interventionPlans.nextReviewAt });

  await db.insert(caseEvents).values({
    caseId: plan.caseId,
    title: "Revision de plan de intervencion",
    bodyCiphertext: encryptSensitiveText(input.outcome),
    eventType: "intervention.review"
  });
  await db.insert(auditEvents).values({
    action: "intervention_plan.review",
    resourceType: "intervention_plan",
    resourceId: updated.publicId,
    reason: "intervention_followup",
    metadata: { actorId: input.actor.id, status: updated.status }
  });
  return { id: updated.publicId, status: updated.status, nextReviewAt: updated.nextReviewAt ? toIso(updated.nextReviewAt) : null };
}

// EP-06: escalamiento por falta de respuesta (circuito cerrado). Marca la
// referencia como sin_respuesta, incrementa el contador de reintentos en
// metadata y deja rastro auditable. Reutilizable por Cron y por accion manual.
export async function escalateReferral(input: { referralId: string; reason: string; actor: Actor }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [referral] = await db
    .select({ id: referrals.id, publicId: referrals.publicId, status: referrals.status, metadata: referrals.metadata, caseId: referrals.caseId })
    .from(referrals)
    .where(eq(referrals.publicId, input.referralId))
    .limit(1);
  if (!referral) throw new Error("REFERRAL_NOT_FOUND");

  const attempts = Number((referral.metadata as Record<string, unknown>)?.escalationAttempts ?? 0) + 1;
  const nextStatus = attempts >= 3 ? "escalado_superior" : "sin_respuesta";
  const [updated] = await db
    .update(referrals)
    .set({
      status: nextStatus,
      metadata: { ...(referral.metadata as Record<string, unknown>), escalationAttempts: attempts, lastEscalationReason: input.reason }
    })
    .where(eq(referrals.id, referral.id))
    .returning({ publicId: referrals.publicId, status: referrals.status });

  await db.insert(caseEvents).values({
    caseId: referral.caseId,
    title: "Escalamiento por falta de respuesta externa",
    bodyCiphertext: encryptSensitiveText(`${nextStatus}:${input.reason}`),
    eventType: "referral.escalate"
  });
  await db.insert(auditEvents).values({
    action: "referral.escalate",
    resourceType: "referral",
    resourceId: updated.publicId,
    reason: "closed_loop_no_response",
    metadata: { actorId: input.actor.id, attempts, status: nextStatus }
  });
  return { id: updated.publicId, status: updated.status, escalationAttempts: attempts };
}

// Barrido de referencias vencidas para el Cron diario de revision SLA.
export async function sweepOverdueReferrals(input: { actor: Actor; now?: Date }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const now = input.now ?? new Date();
  const pending = await db
    .select({ publicId: referrals.publicId, status: referrals.status, requiredAckBy: referrals.requiredAckBy })
    .from(referrals)
    .where(eq(referrals.status, "pendiente"))
    .limit(500);

  const overdue = pending.filter((referral) => isReferralOverdue(referral, now));
  const escalated: string[] = [];
  for (const referral of overdue) {
    await escalateReferral({ referralId: referral.publicId, reason: "sla_review_sin_acuse", actor: input.actor });
    escalated.push(referral.publicId);
  }
  return { reviewed: pending.length, escalated };
}

// EP-15: flujo editorial/legal de campanas y registro de metricas de alcance.
export async function advanceCampaign(input: {
  campaignId: string;
  editorialStatus?: string;
  legalStatus?: string;
  status?: string;
  metrics?: Record<string, unknown>;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [campaign] = await db
    .select({
      id: communicationCampaigns.id,
      publicId: communicationCampaigns.publicId,
      editorialStatus: communicationCampaigns.editorialStatus,
      legalStatus: communicationCampaigns.legalStatus,
      metrics: communicationCampaigns.metrics
    })
    .from(communicationCampaigns)
    .where(eq(communicationCampaigns.publicId, input.campaignId))
    .limit(1);
  if (!campaign) throw new Error("CAMPAIGN_NOT_FOUND");

  const editorialStatus = input.editorialStatus ?? campaign.editorialStatus;
  const legalStatus = input.legalStatus ?? campaign.legalStatus;
  // Solo se publica con doble aprobacion editorial y legal (6.12).
  let status = input.status ?? "borrador";
  if (status === "publicada" && !(editorialStatus === "aprobada" && legalStatus === "aprobada")) {
    throw new Error("CAMPAIGN_APPROVAL_INCOMPLETE");
  }

  const [updated] = await db
    .update(communicationCampaigns)
    .set({
      editorialStatus,
      legalStatus,
      status,
      metrics: input.metrics ?? (campaign.metrics as Record<string, unknown>)
    })
    .where(eq(communicationCampaigns.id, campaign.id))
    .returning({ publicId: communicationCampaigns.publicId, status: communicationCampaigns.status, editorialStatus: communicationCampaigns.editorialStatus, legalStatus: communicationCampaigns.legalStatus });

  await db.insert(auditEvents).values({
    action: "communication_campaign.advance",
    resourceType: "communication_campaign",
    resourceId: updated.publicId,
    reason: "editorial_legal_governance",
    metadata: { actorId: input.actor.id, editorialStatus, legalStatus, status }
  });
  return { id: updated.publicId, status: updated.status, editorialStatus: updated.editorialStatus, legalStatus: updated.legalStatus };
}

// EP-17 / EP-16: avance de revision y aprobacion de adaptaciones contextuales.
const adaptationReviewFlow = ["tecnica", "juridica", "accesibilidad", "privacidad", "completa"];

export async function advanceContextualAdaptation(input: {
  adaptationId: string;
  reviewStatus?: string;
  approvalStatus?: string;
  publicSummary?: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [adaptation] = await db
    .select({ id: contextualAdaptations.id, publicId: contextualAdaptations.publicId, reviewStatus: contextualAdaptations.reviewStatus })
    .from(contextualAdaptations)
    .where(eq(contextualAdaptations.publicId, input.adaptationId))
    .limit(1);
  if (!adaptation) throw new Error("CONTEXTUAL_ADAPTATION_NOT_FOUND");

  if (input.reviewStatus && !adaptationReviewFlow.includes(input.reviewStatus)) {
    throw new Error("INVALID_ADAPTATION_REVIEW");
  }
  // Solo se aprueba tras completar la revision multidisciplinaria (6.13).
  if (input.approvalStatus === "aprobada" && (input.reviewStatus ?? adaptation.reviewStatus) !== "completa") {
    throw new Error("ADAPTATION_REVIEW_INCOMPLETE");
  }

  const updateValues: Record<string, unknown> = { reviewStatus: input.reviewStatus ?? adaptation.reviewStatus };
  if (input.approvalStatus) updateValues.approvalStatus = input.approvalStatus;
  if (input.publicSummary !== undefined) updateValues.publicSummary = input.publicSummary;
  const [updated] = await db
    .update(contextualAdaptations)
    .set(updateValues)
    .where(eq(contextualAdaptations.id, adaptation.id))
    .returning({ publicId: contextualAdaptations.publicId, reviewStatus: contextualAdaptations.reviewStatus, approvalStatus: contextualAdaptations.approvalStatus });

  await db.insert(auditEvents).values({
    action: "contextual_adaptation.advance",
    resourceType: "contextual_adaptation",
    resourceId: updated.publicId,
    reason: "adaptation_review_flow",
    metadata: { actorId: input.actor.id, reviewStatus: updated.reviewStatus, approvalStatus: updated.approvalStatus }
  });
  return { id: updated.publicId, reviewStatus: updated.reviewStatus, approvalStatus: updated.approvalStatus };
}

// EP-14: aprobacion humana obligatoria de informes autogenerados.
export async function approveGeneratedReport(input: { reportId: string; actor: Actor }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const actorRow = await findUserRow(input.actor.id);
  const [report] = await db
    .select({ id: generatedReports.id, publicId: generatedReports.publicId, status: generatedReports.status })
    .from(generatedReports)
    .where(eq(generatedReports.publicId, input.reportId))
    .limit(1);
  if (!report) throw new Error("GENERATED_REPORT_NOT_FOUND");

  const [updated] = await db
    .update(generatedReports)
    .set({ status: "aprobado", approvedByUserId: actorRow?.id, approvedAt: new Date() })
    .where(eq(generatedReports.id, report.id))
    .returning({ publicId: generatedReports.publicId, status: generatedReports.status, approvedAt: generatedReports.approvedAt });

  await db.insert(auditEvents).values({
    action: "generated_report.approve",
    resourceType: "generated_report",
    resourceId: updated.publicId,
    reason: "human_approved_narrative",
    metadata: { actorId: input.actor.id }
  });
  return { id: updated.publicId, status: updated.status, approvedAt: updated.approvedAt ? toIso(updated.approvedAt) : null };
}

// EP-13 / EP-17: publicacion de tablero validando que solo use widgets
// certificados (sin SQL ni formulas libres).
export async function publishDashboard(input: { dashboardId: string; actor: Actor }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [dashboard] = await db
    .select({ id: dashboardLayouts.id, publicId: dashboardLayouts.publicId, widgets: dashboardLayouts.widgets, version: dashboardLayouts.version })
    .from(dashboardLayouts)
    .where(eq(dashboardLayouts.publicId, input.dashboardId))
    .limit(1);
  if (!dashboard) throw new Error("DASHBOARD_NOT_FOUND");

  const validation = validateDashboardWidgets((dashboard.widgets as Array<Record<string, unknown>>) ?? []);
  if (!validation.valid) {
    const error = new Error("DASHBOARD_VALIDATION_FAILED");
    (error as Error & { details?: string[] }).details = validation.errors;
    throw error;
  }

  const [updated] = await db
    .update(dashboardLayouts)
    .set({ status: "publicado", version: dashboard.version + 1 })
    .where(eq(dashboardLayouts.id, dashboard.id))
    .returning({ publicId: dashboardLayouts.publicId, status: dashboardLayouts.status, version: dashboardLayouts.version });

  await db.insert(auditEvents).values({
    action: "dashboard.publish",
    resourceType: "dashboard",
    resourceId: updated.publicId,
    reason: "certified_widgets_only",
    metadata: { actorId: input.actor.id, version: updated.version }
  });
  return { id: updated.publicId, status: updated.status, version: updated.version };
}

// EP-04: ejecucion de migracion de un protocolo activo a una nueva version.
export async function migrateProtocolRun(input: { runId: string; toProtocolCode: string; reason: string; actor: Actor }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [run] = await db
    .select({ id: protocolRuns.id, caseId: protocolRuns.caseId, protocolVersionId: protocolRuns.protocolVersionId })
    .from(protocolRuns)
    .where(eq(protocolRuns.id, input.runId))
    .limit(1);
  if (!run) throw new Error("PROTOCOL_RUN_NOT_FOUND");
  const toVersion = await findProtocolVersionRow(input.toProtocolCode);
  if (!toVersion) throw new Error("PROTOCOL_VERSION_NOT_FOUND");

  const caseRow = await db.select({ publicId: cases.publicId }).from(cases).where(eq(cases.id, run.caseId)).limit(1);

  await db.update(protocolRuns).set({ protocolVersionId: toVersion.id }).where(eq(protocolRuns.id, run.id));
  const [migration] = await db
    .insert(protocolMigrations)
    .values({
      publicId: `pmig_${nanoid(10)}`,
      caseId: run.caseId,
      fromProtocolVersionId: run.protocolVersionId,
      toProtocolVersionId: toVersion.id,
      reason: input.reason,
      status: "aplicada"
    })
    .returning({ publicId: protocolMigrations.publicId, status: protocolMigrations.status });

  await db.insert(caseEvents).values({
    caseId: run.caseId,
    title: "Migracion de protocolo aplicada",
    bodyCiphertext: encryptSensitiveText(`${input.toProtocolCode}:${input.reason}`),
    eventType: "protocol.migrate"
  });
  await db.insert(auditEvents).values({
    action: "protocol_run.migrate",
    resourceType: "protocol_run",
    resourceId: input.runId,
    reason: "explicit_version_migration",
    metadata: { actorId: input.actor.id, toProtocolCode: input.toProtocolCode, migrationId: migration.publicId, caseId: caseRow[0]?.publicId }
  });
  return { id: input.runId, migrationId: migration.publicId, status: migration.status, toProtocolCode: input.toProtocolCode };
}

// EP-14: borrador de informe a partir de metricas certificadas. La narrativa es
// solo un resumen deterministico; su publicacion exige aprobacion humana.
export async function generateReportDraft(input: {
  title: string;
  reportType: string;
  scope?: Record<string, unknown>;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const [reports_, cases_] = await Promise.all([listReports(), listCases()]);
  const widgets = buildCertifiedWidgets(reports_, cases_);
  const highlights = widgets
    .filter((widget) => widget.series.length > 0)
    .slice(0, 6)
    .map((widget) => `${widget.title}: ${widget.valueLabel}`)
    .join("; ");
  const narrative = `Borrador basado en metricas certificadas al ${new Date().toISOString()}. ${highlights || "Sin datos suficientes para el periodo."} Requiere validacion humana antes de publicar.`;

  return createGovernanceRecord("informes", {
    title: input.title,
    reportType: input.reportType,
    metadata: { ...(input.scope ?? {}), certified: true, reports: reports_.length, cases: cases_.length },
    narrative,
    actor: input.actor
  });
}

// EP / 14: crea y despacha una notificacion multicanal honrando la politica de
// prioridad, horario silencioso y override critico. Solo viaja el resumen
// seguro; se rechaza cualquier detalle sensible.
export async function createAndDispatchNotification(input: {
  safeSummary: string;
  priority: NotificationPriority;
  channels: NotificationChannel[];
  caseId?: string;
  userExternalSubject?: string;
  quietHours?: { start?: string; end?: string };
  nowMinutes?: number;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  if (containsSensitiveDetail(input.safeSummary)) throw new Error("SENSITIVE_DETAIL_IN_NOTIFICATION");

  const db = getDb();
  const caseRow = input.caseId ? await findCaseRow(input.caseId) : null;
  const user = input.userExternalSubject ? await findUserRow(input.userExternalSubject) : null;
  const now = new Date();
  const nowMinutes = input.nowMinutes ?? now.getHours() * 60 + now.getMinutes();

  const deliveries = [];
  for (const channel of input.channels) {
    const decision = shouldDeliver({ priority: input.priority, quietHours: input.quietHours, nowMinutes });
    if (!decision.deliver) {
      deliveries.push({ channel, status: "deferred", reason: decision.reason });
      continue;
    }
    const delivery = await dispatchToChannel(channel, { safeSummary: input.safeSummary, priority: input.priority });
    deliveries.push({ ...delivery, reason: decision.reason });
  }

  const [row] = await db
    .insert(notifications)
    .values({
      publicId: `ntf_${nanoid(10)}`,
      caseId: caseRow?.id,
      userId: user?.id,
      priority: input.priority,
      channel: input.channels.join(","),
      safeSummary: input.safeSummary,
      status: deliveries.some((d) => d.status === "delivered" || d.status === "queued_provider") ? "enviada" : "pendiente"
    })
    .returning({ publicId: notifications.publicId, status: notifications.status });

  await db.insert(auditEvents).values({
    action: "notification.dispatch",
    resourceType: "notification",
    resourceId: row.publicId,
    reason: "multichannel_dispatch",
    metadata: { actorId: input.actor.id, priority: input.priority, deliveries }
  });
  return { id: row.publicId, status: row.status, deliveries };
}

// EP / 11.6: conteos operativos en vivo para el canal de tiempo real (SSE).
// No expone datos sensibles: solo cifras agregadas de colas y pendientes.
export async function getRealtimeCounts(now = new Date()) {
  if (!isDatabaseConfigured()) {
    return { pendingNotifications: 0, overdueReferrals: 0, pendingJobs: 0, criticalCases: 0 };
  }
  const db = getDb();
  const rows = (await db.execute(sql`
    select
      (select count(*)::int from notifications where status = 'pendiente') as pending_notifications,
      (select count(*)::int from referrals where status = 'pendiente' and required_ack_by is not null and required_ack_by < ${now.toISOString()}) as overdue_referrals,
      (select count(*)::int from durable_jobs where status = 'pendiente') as pending_jobs,
      (select count(*)::int from cases where severity = 'critica' and state <> 'cerrado') as critical_cases
  `)) as unknown as { rows?: Array<Record<string, number>> } | Array<Record<string, number>>;
  const row = (Array.isArray(rows) ? rows[0] : rows.rows?.[0]) ?? {};
  return {
    pendingNotifications: Number(row.pending_notifications ?? 0),
    overdueReferrals: Number(row.overdue_referrals ?? 0),
    pendingJobs: Number(row.pending_jobs ?? 0),
    criticalCases: Number(row.critical_cases ?? 0)
  };
}

// EP-18 / 6.14: buscador público de Agente Preventivo y canales del plantel.
// Devuelve SOLO datos seguros (identidad del plantel + canales de ayuda públicos);
// nunca expone datos de riesgo, expedientes ni personas. Sin autenticación.
export async function findPublicSchoolChannels(query: string) {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const term = `%${query}%`;
  const schools = await db
    .select({
      id: organizations.id,
      publicId: organizations.publicId,
      name: organizations.name,
      stateCode: organizations.stateCode,
      municipalityCode: organizations.municipalityCode
    })
    .from(organizations)
    .where(and(eq(organizations.type, "school"), or(eq(organizations.publicId, query), ilike(organizations.name, term))))
    .limit(20);

  const results = [];
  for (const school of schools) {
    const entries = await db
      .select({
        name: serviceDirectoryEntries.name,
        serviceType: serviceDirectoryEntries.serviceType,
        contactPolicy: serviceDirectoryEntries.contactPolicy
      })
      .from(serviceDirectoryEntries)
      .where(and(eq(serviceDirectoryEntries.organizationId, school.id), eq(serviceDirectoryEntries.status, "activo")))
      .limit(20);

    // Solo se exponen canales marcados como públicos y su contacto público.
    const channels = entries
      .filter((entry) => (entry.contactPolicy as Record<string, unknown>)?.visibility === "publica")
      .map((entry) => ({
        name: entry.name,
        serviceType: entry.serviceType,
        publicContact: String((entry.contactPolicy as Record<string, unknown>)?.publicContact ?? "")
      }));

    results.push({
      school: { publicId: school.publicId, name: school.name, state: school.stateCode ?? "", municipality: school.municipalityCode ?? "" },
      channels,
      // Canales estándar siempre disponibles y seguros.
      help: { report: "/", followUp: "/seguimiento" }
    });
  }
  return results;
}

// Salud de la base para el endpoint HTTP de estado. No expone datos: solo
// conectividad, si el esquema (migraciones) esta aplicado y conteos agregados.
export async function getDatabaseHealth() {
  if (!isDatabaseConfigured()) {
    return { configured: false, reachable: false, migrationsApplied: false, appliedMigrations: 0, publicTables: 0 };
  }
  const db = getDb();
  let reachable = false;
  let migrationsApplied = false;
  let appliedMigrations = 0;
  let publicTables = 0;

  try {
    // Probar una tabla nucleo del esquema: si existe, el esquema esta aplicado.
    await db.select({ id: organizations.id }).from(organizations).limit(1);
    reachable = true;
    migrationsApplied = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    // La relacion no existe => conecta pero sin migraciones aplicadas.
    if (/relation .* does not exist|no existe la relaci/i.test(message)) {
      reachable = true;
      migrationsApplied = false;
    } else {
      reachable = false;
    }
  }

  if (reachable) {
    try {
      const res = (await db.execute(
        sql`select count(*)::int as c from information_schema.tables where table_schema = 'public'`
      )) as unknown as { rows?: Array<{ c: number }> } | Array<{ c: number }>;
      const rows = Array.isArray(res) ? res : res.rows ?? [];
      publicTables = Number(rows[0]?.c ?? 0);
    } catch {
      /* opcional */
    }
    try {
      const res = (await db.execute(
        sql`select count(*)::int as c from drizzle."__drizzle_migrations"`
      )) as unknown as { rows?: Array<{ c: number }> } | Array<{ c: number }>;
      const rows = Array.isArray(res) ? res : res.rows ?? [];
      appliedMigrations = Number(rows[0]?.c ?? 0);
    } catch {
      /* la tabla de migraciones puede no existir aun */
    }
  }

  return { configured: true, reachable, migrationsApplied, appliedMigrations, publicTables };
}

// EP-13: captura de insumos analiticos (INRE, encuestas, matricula, permanencia,
// impacto, presupuesto) que alimentan las graficas certificadas. Datos reales,
// nunca inventados: se registran por API/formulario y quedan auditados.
export async function createAnalyticsInput(input:
  | { kind: "risk_score"; organizationPublicId?: string; modelVersion?: number; score: number; quality?: number; factors?: Record<string, { value: number; contribution: number }>; actor: Actor }
  | { kind: "survey"; surveyType: string; score: number; period: string; organizationPublicId?: string; population?: string; actor: Actor }
  | { kind: "enrollment"; organizationPublicId?: string; period: string; students: number; actor: Actor }
  | { kind: "retention"; organizationPublicId?: string; cohortPeriod: string; continued: number; total: number; actor: Actor }
  | { kind: "impact"; indicator: string; groupType: string; phase: string; period: string; value: number; actor: Actor }
  | { kind: "budget"; period: string; component: string; level: string; devengado: number; ejercido: number; meta: number; actor: Actor }
) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const orgPublicId = "organizationPublicId" in input ? input.organizationPublicId : undefined;
  const organization = orgPublicId ? await findOrganizationRow(orgPublicId) : null;
  if (orgPublicId && !organization) throw new Error("ORGANIZATION_NOT_FOUND");

  let publicId: string;
  if (input.kind === "risk_score") {
    publicId = `risk_${nanoid(10)}`;
    await db.insert(riskScores).values({
      publicId,
      organizationId: organization?.id,
      modelVersion: input.modelVersion ?? 1,
      score: String(input.score),
      quality: input.quality ?? 0,
      factors: input.factors ?? {}
    });
  } else if (input.kind === "survey") {
    publicId = `srv_${nanoid(10)}`;
    await db.insert(surveyResponses).values({
      publicId,
      surveyType: input.surveyType,
      score: input.score,
      period: input.period,
      organizationId: organization?.id,
      population: input.population
    });
  } else if (input.kind === "enrollment") {
    publicId = `enr_${nanoid(10)}`;
    await db.insert(enrollmentFigures).values({ publicId, organizationId: organization?.id, period: input.period, students: input.students });
  } else if (input.kind === "retention") {
    publicId = `ret_${nanoid(10)}`;
    await db.insert(schoolRetention).values({ publicId, organizationId: organization?.id, cohortPeriod: input.cohortPeriod, continued: input.continued, total: input.total });
  } else if (input.kind === "impact") {
    publicId = `imp_${nanoid(10)}`;
    await db.insert(impactMeasurements).values({ publicId, indicator: input.indicator, groupType: input.groupType, phase: input.phase, period: input.period, value: String(input.value) });
  } else {
    publicId = `bud_${nanoid(10)}`;
    await db.insert(budgetLines).values({
      publicId,
      period: input.period,
      component: input.component,
      level: input.level,
      devengado: String(input.devengado),
      ejercido: String(input.ejercido),
      meta: String(input.meta)
    });
  }

  await db.insert(auditEvents).values({
    action: `analytics_input.${input.kind}.create`,
    resourceType: "analytics_input",
    resourceId: publicId,
    reason: "certified_metric_source",
    metadata: { actorId: input.actor.id, kind: input.kind }
  });
  return { id: publicId, kind: input.kind };
}

// EP-08 / 9.2: puntos territoriales como coordenadas para el mapa (MapLibre).
export async function listTerritorialPointsForMap(kind?: string) {
  if (!isDatabaseConfigured()) return [] as Array<{ label: string; kind: string; lng: number; lat: number; weight: number }>;
  const db = getDb();
  const rows = await db
    .select({
      label: territorialPoints.label,
      kind: territorialPoints.kind,
      lng: sql<number>`ST_X(${territorialPoints.location}::geometry)`,
      lat: sql<number>`ST_Y(${territorialPoints.location}::geometry)`
    })
    .from(territorialPoints)
    .where(kind ? eq(territorialPoints.kind, kind) : sql`true`)
    .limit(500);
  return rows.map((row) => ({ label: row.label, kind: row.kind, lng: Number(row.lng), lat: Number(row.lat), weight: 1 }));
}

// EP / 9.2: alta de punto territorial geolocalizado (PostGIS). La geometria se
// envia como EWKT y se almacena como geometry(Point, 4326).
export async function createTerritorialPoint(input: {
  label: string;
  kind: string;
  lat: number;
  lng: number;
  organizationPublicId?: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const organization = input.organizationPublicId ? await findOrganizationRow(input.organizationPublicId) : null;
  if (input.organizationPublicId && !organization) throw new Error("ORGANIZATION_NOT_FOUND");
  const publicId = `geo_${nanoid(10)}`;
  const [row] = await db
    .insert(territorialPoints)
    .values({
      publicId,
      organizationId: organization?.id,
      label: input.label,
      kind: input.kind,
      location: `SRID=4326;POINT(${input.lng} ${input.lat})`
    })
    .returning({ publicId: territorialPoints.publicId, kind: territorialPoints.kind });
  await db.insert(auditEvents).values({
    action: "territorial_point.create",
    resourceType: "territorial_point",
    resourceId: row.publicId,
    reason: "geospatial_resource",
    metadata: { actorId: input.actor.id, kind: input.kind }
  });
  return { id: row.publicId, kind: row.kind };
}

// Puntos dentro de un radio (metros) usando ST_DWithin sobre geography, con el
// indice espacial GIST. Devuelve distancia en metros.
export async function findNearbyTerritorialPoints(input: { lat: number; lng: number; radiusMeters: number; kind?: string }) {
  if (!isDatabaseConfigured()) return [];
  const db = getDb();
  const origin = sql`ST_SetSRID(ST_MakePoint(${input.lng}, ${input.lat}), 4326)::geography`;
  const conditions = [sql`ST_DWithin(${territorialPoints.location}::geography, ${origin}, ${input.radiusMeters})`];
  if (input.kind) conditions.push(sql`${territorialPoints.kind} = ${input.kind}`);
  const rows = await db
    .select({
      id: territorialPoints.publicId,
      label: territorialPoints.label,
      kind: territorialPoints.kind,
      distanceMeters: sql<number>`ST_Distance(${territorialPoints.location}::geography, ${origin})`
    })
    .from(territorialPoints)
    .where(sql.join(conditions, sql` AND `))
    .orderBy(sql`ST_Distance(${territorialPoints.location}::geography, ${origin})`)
    .limit(50);
  return rows.map((row) => ({ ...row, distanceMeters: Math.round(Number(row.distanceMeters)) }));
}

// EP-14: datos de un informe para render (PDF/HTML), con narrativa descifrada.
export async function getGeneratedReportForRender(reportId: string) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [report] = await db
    .select({
      title: generatedReports.title,
      reportType: generatedReports.reportType,
      status: generatedReports.status,
      narrative: generatedReports.narrativeCiphertext,
      createdAt: generatedReports.createdAt
    })
    .from(generatedReports)
    .where(eq(generatedReports.publicId, reportId))
    .limit(1);
  if (!report) return null;
  return {
    title: report.title,
    reportType: report.reportType,
    status: report.status,
    narrative: decryptSensitiveText(report.narrative) || "Sin narrativa registrada.",
    generatedAt: toIso(report.createdAt)
  };
}

// EP-09: alta de documento en la base aprobada para el asistente RAG.
export async function createApprovedDocument(input: {
  docType: string;
  title: string;
  sourceRef: string;
  body: string;
  keywords?: string;
  version?: number;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const publicId = `doc_${nanoid(10)}`;
  const [doc] = await db
    .insert(approvedDocuments)
    .values({
      publicId,
      docType: input.docType,
      title: input.title,
      sourceRef: input.sourceRef,
      body: input.body,
      keywords: input.keywords ?? "",
      version: input.version ?? 1
    })
    .returning({ publicId: approvedDocuments.publicId, title: approvedDocuments.title, version: approvedDocuments.version });
  await db.insert(auditEvents).values({
    action: "approved_document.create",
    resourceType: "approved_document",
    resourceId: doc.publicId,
    reason: "rag_corpus_update",
    metadata: { actorId: input.actor.id, docType: input.docType }
  });
  return doc;
}

// EP-09 / 7.3: asistente de protocolos con RAG. Recupera de la base aprobada,
// cita fuente y version, e indica confianza y datos faltantes. Con el gateway
// activo, sintetiza una respuesta fundamentada citando esas fuentes; sin el,
// devuelve un extracto de la mejor fuente. Nunca responde sin fuente.
export async function answerProtocolQuestion(input: { question: string; actor: Actor }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const docs = await db
    .select({
      publicId: approvedDocuments.publicId,
      title: approvedDocuments.title,
      version: approvedDocuments.version,
      docType: approvedDocuments.docType,
      sourceRef: approvedDocuments.sourceRef,
      body: approvedDocuments.body,
      keywords: approvedDocuments.keywords
    })
    .from(approvedDocuments)
    .where(eq(approvedDocuments.active, true))
    .limit(500);

  const ranked = rankDocuments(input.question, docs);
  const sources = ranked.map((doc) => ({ title: doc.title, version: doc.version, sourceRef: doc.sourceRef, docType: doc.docType }));

  if (ranked.length === 0) {
    return {
      status: "sin_fundamento",
      recommendation: "No hay base documental aprobada que respalde una respuesta. Continua la ruta humana de protocolo.",
      sources: [],
      confidence: 0,
      missingInformation: ["corpus_documental_aprobado"],
      warnings: ["La IA no responde sin fuente aprobada (7.3)."],
      requiresHumanConfirmation: true,
      feedbackPrompt: "No coincide con el caso"
    };
  }

  const top = ranked[0];
  const maxScore = ranked.reduce((max, doc) => Math.max(max, doc.score), 0);
  const confidence = Math.max(0, Math.min(1, Math.round((top.score / (maxScore + 3)) * 100) / 100));

  let recommendation = extractiveSnippet(top.body);
  if (isAiConfigured()) {
    try {
      const context = ranked
        .map((doc, index) => `[Fuente ${index + 1}] ${doc.title} (v${doc.version}, ${doc.sourceRef}):\n${extractiveSnippet(doc.body, 900)}`)
        .join("\n\n");
      const synthesized = await callAiGateway([
        {
          role: "system",
          content:
            "Eres el asistente de protocolos del SINAPVE. Responde SOLO con base en las fuentes provistas y cita [Fuente N]. " +
            "No inventas normativa. Si las fuentes no bastan, dilo. No determinas culpabilidad ni sanciones."
        },
        { role: "user", content: `Pregunta: ${input.question}\n\nFuentes aprobadas:\n${context}` }
      ]);
      if (synthesized.trim()) recommendation = synthesized.trim();
    } catch {
      // Se conserva el extracto de la fuente como respuesta fundamentada.
    }
  }

  await db.insert(auditEvents).values({
    action: "ai_protocol_assistant.answer",
    resourceType: "ai_protocol_assistant",
    resourceId: top.publicId,
    reason: "grounded_rag_answer",
    metadata: { actorId: input.actor.id, sources: sources.length, aiSynthesized: isAiConfigured() }
  });

  return {
    status: "fundamentado",
    recommendation,
    sources,
    confidence,
    missingInformation: [],
    warnings: ["Recomendacion asistida: requiere confirmacion humana antes de actuar."],
    requiresHumanConfirmation: true,
    feedbackPrompt: "No coincide con el caso"
  };
}

// EP-04/06 / 11.6: procesa la cola durable. Idempotente por diseno: cada handler
// vuelve a verificar el estado antes de actuar. Invocable desde el Cron.
export async function processDueJobs(input: { now?: Date; limit?: number }) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const now = input.now ?? new Date();
  const jobs = await claimDueJobs(now, input.limit ?? 25);
  const systemActor: Actor = { id: "system:jobs", name: "Durable Jobs", roles: [], scope: {} };

  let processed = 0;
  let failed = 0;
  for (const job of jobs) {
    try {
      if (job.jobType === "referral_ack_timeout") {
        const referralPublicId = String(job.payload.referralPublicId ?? "");
        const [referral] = await db
          .select({ publicId: referrals.publicId, status: referrals.status })
          .from(referrals)
          .where(eq(referrals.publicId, referralPublicId))
          .limit(1);
        // Solo escala si sigue sin acuse: idempotencia frente a reentregas.
        if (referral && referral.status === "pendiente") {
          await escalateReferral({ referralId: referral.publicId, reason: "acuse_externo_vencido", actor: systemActor });
        }
      } else if (job.jobType === "protocol_sla_check") {
        const casePublicId = String(job.payload.casePublicId ?? "");
        const caseRow = casePublicId ? await findCaseRow(casePublicId) : null;
        if (caseRow) {
          await db.insert(notifications).values({
            publicId: `ntf_${nanoid(10)}`,
            caseId: caseRow.id,
            priority: "accion_requerida",
            channel: "in_app",
            safeSummary: "Revision de SLA del protocolo pendiente de verificacion humana."
          });
        }
      }
      await completeJob(job.id);
      processed += 1;
    } catch (error) {
      await failJob(job, error instanceof Error ? error.message : "job_error", now);
      failed += 1;
    }
  }
  return { claimed: jobs.length, processed, failed };
}
