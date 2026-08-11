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
import type { CaseFile, CaseTimelineEvent, HelpReport, PlatformModuleId, PlatformModuleSummary, PlatformRecord, ReportMode } from "../domain/types";

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
