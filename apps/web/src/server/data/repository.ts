import { nanoid } from "nanoid";
import { and, desc, eq, or } from "drizzle-orm";
import { DatabaseNotConfiguredError, getDb, isDatabaseConfigured } from "../db";
import { auditEvents, caseEvents, cases, organizations, reports } from "../db/schema";
import { suggestSeverity } from "../domain/protocols";
import type { CaseFile, CaseTimelineEvent, HelpReport, ReportMode } from "../domain/types";

export type LiveDataStatus = {
  databaseConfigured: boolean;
  reports: number;
  cases: number;
};

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
        detail: "Registro transaccional cargado desde Neon.",
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
            detail: "Registro transaccional cargado desde Neon.",
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
