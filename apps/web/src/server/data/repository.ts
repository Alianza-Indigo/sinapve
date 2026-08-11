import { nanoid } from "nanoid";
import { and, desc, eq, or } from "drizzle-orm";
import { DatabaseNotConfiguredError, getDb, isDatabaseConfigured } from "../db";
import {
  auditEvents,
  auditFindings,
  aiFeedback,
  caseAssignments,
  caseEvents,
  cases,
  communityInitiatives,
  communicationCampaigns,
  contextualAdaptations,
  emirDispatches,
  generatedReports,
  interventionPlans,
  institutionalBodies,
  institutionalSessions,
  integrationEvents,
  metricDefinitions,
  notificationTemplates,
  notifications,
  organizations,
  privacyRequests,
  protocolStepEvents,
  protocolRuns,
  protocolVersions,
  publicResources,
  referrals,
  reportMessages,
  serviceDirectoryEntries,
  reports,
  systemConfigurations,
  trainingEnrollments,
  trainingPrograms,
  userAssignments,
  users
} from "../db/schema";
import { suggestSeverity } from "../domain/protocols";
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
      description: row.description,
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
    protectionSummary: row.protectionSummary ?? "Sin resumen de proteccion registrado.",
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
          detail: event.body,
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
    protectionSummary: caseRow.protectionSummary ?? "Sin resumen de proteccion registrado.",
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
      descriptionCiphertext: input.description,
      safetyNow: input.safetyNow,
      suggestedSeverity,
      metadata: {
        schoolName: input.schoolName,
        source: "public_help_request",
        piiHandling: input.mode
      }
    })
    .returning({
      publicId: reports.publicId,
      createdAt: reports.createdAt,
      status: reports.status
    });

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
      bodyCiphertext: input.body
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
      )
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
    return rows.map((row) =>
      platformRecord({ id: row.id, title: row.id, status: `v${row.version}`, owner: row.owner, detail: moduleId === "map" ? "Capa territorial certificada" : row.detail })
    );
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
    return rows.map((row) =>
      platformRecord({ ...row, detail: row.required ? "Requerido para certificacion" : enrollments.length ? "Con inscripciones" : "Sin inscripciones" })
    );
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
    return rows.map((row) => platformRecord({ ...row, detail: "Iniciativa comunitaria con salvaguardas" }));
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
    return listPrivacyRequests();
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
      protectionSummaryCiphertext: input.protectionSummary ?? "Pendiente de resumen de proteccion.",
      firstResponseMinutes: 0,
      slaMinutes: input.slaMinutes
    })
    .returning({ id: cases.id, publicId: cases.publicId, folio: cases.folio });

  await db.update(reports).set({ status: "convertido_caso" }).where(eq(reports.id, report.id));
  await db.insert(caseEvents).values({
    caseId: caseRow.id,
    title: "Expediente abierto",
    bodyCiphertext: input.protectionSummary ?? "Expediente creado desde reporte.",
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

  await db
    .update(cases)
    .set({
      state: input.state,
      protectionSummaryCiphertext: input.protectionSummary,
      closedAt: input.state === "cerrado" ? new Date() : null
    })
    .where(eq(cases.id, caseRow.id));

  await db.insert(caseEvents).values({
    caseId: caseRow.id,
    title: `Estado actualizado a ${input.state}`,
    bodyCiphertext: input.reason,
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
    bodyCiphertext: input.reason,
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
      bodyCiphertext: input.detail,
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
    bodyCiphertext: input.title,
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
  await db.insert(caseEvents).values({
    caseId: caseRow.id,
    title: "Escalamiento creado",
    bodyCiphertext: input.destinationName,
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
    bodyCiphertext: version.code,
    eventType: "protocol.start"
  });
  await db.insert(auditEvents).values({
    action: "protocol_run.start",
    resourceType: "case",
    resourceId: caseRow.publicId,
    reason: "human_confirmed_protocol",
    metadata: { actorId: input.actor.id, protocolCode: version.code, workflowRunId }
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

export async function completeProtocolStep(input: {
  runId: string;
  stepId: string;
  status?: "completado" | "bloqueado";
  evidencePathname?: string;
  notes?: string;
  actor: Actor;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();

  const db = getDb();
  const [run] = await db
    .select({ id: protocolRuns.id, caseId: protocolRuns.caseId, status: protocolRuns.status })
    .from(protocolRuns)
    .where(eq(protocolRuns.id, input.runId))
    .limit(1);
  if (!run) throw new Error("PROTOCOL_RUN_NOT_FOUND");

  const publicId = `step_${nanoid(10)}`;
  const [event] = await db
    .insert(protocolStepEvents)
    .values({
      publicId,
      protocolRunId: run.id,
      stepId: input.stepId,
      status: input.status ?? "completado",
      evidencePathname: input.evidencePathname,
      notesCiphertext: input.notes
    })
    .returning({ publicId: protocolStepEvents.publicId, stepId: protocolStepEvents.stepId, status: protocolStepEvents.status, createdAt: protocolStepEvents.createdAt });

  await db.insert(caseEvents).values({
    caseId: run.caseId,
    title: "Paso de protocolo actualizado",
    bodyCiphertext: `${event.stepId}:${event.status}`,
    eventType: "protocol.step"
  });
  await db.insert(auditEvents).values({
    action: "protocol_step.complete",
    resourceType: "protocol_run",
    resourceId: input.runId,
    reason: "human_confirmed_protocol_step",
    metadata: { actorId: input.actor.id, stepId: input.stepId, status: event.status }
  });

  return { id: event.publicId, runId: input.runId, stepId: event.stepId, status: event.status, createdAt: toIso(event.createdAt) };
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
        narrativeCiphertext: typeof input.narrative === "string" ? input.narrative : null
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
      notesCiphertext: input.notes
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
      requesterContactCiphertext: input.requesterContact,
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
