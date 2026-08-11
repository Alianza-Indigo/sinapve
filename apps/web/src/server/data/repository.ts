import { nanoid } from "nanoid";
import { and, desc, eq, or } from "drizzle-orm";
import { DatabaseNotConfiguredError, getDb, isDatabaseConfigured } from "../db";
import {
  auditEvents,
  auditFindings,
  caseEvents,
  cases,
  communityInitiatives,
  generatedReports,
  interventionPlans,
  metricDefinitions,
  notifications,
  organizations,
  protocolRuns,
  protocolVersions,
  publicResources,
  referrals,
  reports,
  systemConfigurations,
  trainingEnrollments,
  trainingPrograms
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
  interventions: { id: "interventions", title: "Intervenciones", description: "Planes individuales, ajustes razonables y revisiones.", href: "/backoffice/interventions" },
  escalations: { id: "escalations", title: "Escalamiento", description: "Referencias, acuses, circuito cerrado y equipos externos.", href: "/backoffice/escalations" },
  training: { id: "training", title: "Formacion", description: "Programas, inscripciones, certificacion y recertificacion.", href: "/backoffice/training" },
  community: { id: "community", title: "Comunidad", description: "Brigadas, campanas, familias y participacion con salvaguardas.", href: "/backoffice/community" },
  audit: { id: "audit", title: "Auditoria", description: "Eventos, hallazgos, planes correctivos y cumplimiento.", href: "/backoffice/audit" },
  analytics: { id: "analytics", title: "Analitica", description: "Indicadores certificados, calidad de datos y tableros.", href: "/backoffice/analytics" },
  informes: { id: "informes", title: "Informes", description: "Narrativas ejecutivas, aprobaciones y paquetes de evidencia.", href: "/backoffice/informes" },
  configuration: { id: "configuration", title: "Configuracion", description: "Matriz de severidad, retencion, territorio y versiones operativas.", href: "/backoffice/configuration" },
  "public-portal": { id: "public-portal", title: "Portal publico", description: "Recursos publicados, transparencia agregada y materiales accesibles.", href: "/backoffice/public-portal" },
  notifications: { id: "notifications", title: "Notificaciones", description: "Avisos seguros, acuses, prioridades y canales permitidos.", href: "/backoffice/notifications" }
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

  if (moduleId === "risk" || moduleId === "analytics") {
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
      platformRecord({ id: row.id, title: row.id, status: `v${row.version}`, owner: row.owner, detail: row.detail })
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
