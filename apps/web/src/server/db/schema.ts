import { boolean, index, integer, jsonb, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { CaseState, ReportMode, Severity } from "../domain/types";

export const organizationType = pgEnum("organization_type", ["federal", "state", "municipality", "zone", "school"]);
export const reportMode = pgEnum("report_mode", ["anonimo", "confidencial", "identificado"]);
export const reportStatus = pgEnum("report_status", ["recibido", "en_triaje", "convertido_caso", "cerrado"]);
export const severity = pgEnum("severity", ["leve", "moderada", "grave", "critica"]);
export const caseState = pgEnum("case_state", [
  "nuevo",
  "en_triaje",
  "activo",
  "escalado",
  "en_seguimiento",
  "listo_para_cierre",
  "cerrado",
  "reabierto"
]);

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicId: text("public_id").notNull().unique(),
  name: text("name").notNull(),
  type: organizationType("type").notNull(),
  parentId: uuid("parent_id"),
  stateCode: text("state_code"),
  municipalityCode: text("municipality_code"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  externalSubject: text("external_subject").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  mfaRequired: boolean("mfa_required").default(true).notNull(),
  disabledAt: timestamp("disabled_at", { withTimezone: true })
});

export const userAssignments = pgTable("user_assignments", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  role: text("role").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
  endsAt: timestamp("ends_at", { withTimezone: true })
});

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    folio: text("folio").notNull().unique(),
    mode: reportMode("mode").$type<ReportMode>().notNull(),
    reporterType: text("reporter_type").notNull(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    descriptionCiphertext: text("description_ciphertext").notNull(),
    safetyNow: text("safety_now").notNull(),
    status: reportStatus("status").default("recibido").notNull(),
    suggestedSeverity: severity("suggested_severity").$type<Severity>().notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    organizationIdx: index("reports_organization_idx").on(table.organizationId),
    createdAtIdx: index("reports_created_at_idx").on(table.createdAt)
  })
);

export const cases = pgTable(
  "cases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    folio: text("folio").notNull().unique(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    title: text("title").notNull(),
    state: caseState("state").$type<CaseState>().default("nuevo").notNull(),
    severity: severity("severity").$type<Severity>().notNull(),
    assignedUserId: uuid("assigned_user_id").references(() => users.id),
    protectionSummaryCiphertext: text("protection_summary_ciphertext"),
    firstResponseMinutes: integer("first_response_minutes"),
    slaMinutes: integer("sla_minutes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    closedAt: timestamp("closed_at", { withTimezone: true })
  },
  (table) => ({
    organizationIdx: index("cases_organization_idx").on(table.organizationId),
    stateIdx: index("cases_state_idx").on(table.state)
  })
);

export const caseEvents = pgTable("case_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id),
  actorUserId: uuid("actor_user_id").references(() => users.id),
  title: text("title").notNull(),
  bodyCiphertext: text("body_ciphertext").notNull(),
  eventType: text("event_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const protocolVersions = pgTable("protocol_versions", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull(),
  version: integer("version").notNull(),
  title: text("title").notNull(),
  active: boolean("active").default(true).notNull(),
  steps: jsonb("steps").$type<Array<Record<string, unknown>>>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const protocolRuns = pgTable("protocol_runs", {
  id: uuid("id").defaultRandom().primaryKey(),
  caseId: uuid("case_id")
    .notNull()
    .references(() => cases.id),
  protocolVersionId: uuid("protocol_version_id")
    .notNull()
    .references(() => protocolVersions.id),
  workflowRunId: text("workflow_run_id"),
  status: text("status").default("activo").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull()
});

export const interventionPlans = pgTable(
  "intervention_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    ownerUserId: uuid("owner_user_id").references(() => users.id),
    title: text("title").notNull(),
    status: text("status").default("activo").notNull(),
    goals: jsonb("goals").$type<Array<Record<string, unknown>>>().default([]).notNull(),
    adjustments: jsonb("adjustments").$type<Record<string, unknown>>().default({}).notNull(),
    nextReviewAt: timestamp("next_review_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    caseIdx: index("intervention_plans_case_idx").on(table.caseId),
    statusIdx: index("intervention_plans_status_idx").on(table.status)
  })
);

export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    destinationType: text("destination_type").notNull(),
    destinationName: text("destination_name").notNull(),
    status: text("status").default("pendiente").notNull(),
    requiredAckBy: timestamp("required_ack_by", { withTimezone: true }),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    caseIdx: index("referrals_case_idx").on(table.caseId),
    statusIdx: index("referrals_status_idx").on(table.status)
  })
);

export const trainingPrograms = pgTable("training_programs", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicId: text("public_id").notNull().unique(),
  title: text("title").notNull(),
  audienceRole: text("audience_role").notNull(),
  version: integer("version").default(1).notNull(),
  requiredForCertification: boolean("required_for_certification").default(false).notNull(),
  status: text("status").default("borrador").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
});

export const trainingEnrollments = pgTable(
  "training_enrollments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    programId: uuid("program_id")
      .notNull()
      .references(() => trainingPrograms.id),
    status: text("status").default("inscrito").notNull(),
    progressPercent: integer("progress_percent").default(0).notNull(),
    certifiedAt: timestamp("certified_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdx: index("training_enrollments_user_idx").on(table.userId),
    programIdx: index("training_enrollments_program_idx").on(table.programId)
  })
);

export const communityInitiatives = pgTable(
  "community_initiatives",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    title: text("title").notNull(),
    initiativeType: text("initiative_type").notNull(),
    status: text("status").default("planeada").notNull(),
    safeguards: jsonb("safeguards").$type<Record<string, unknown>>().default({}).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    organizationIdx: index("community_initiatives_organization_idx").on(table.organizationId),
    statusIdx: index("community_initiatives_status_idx").on(table.status)
  })
);

export const metricDefinitions = pgTable("metric_definitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  version: integer("version").notNull(),
  owner: text("owner").notNull(),
  formula: text("formula").notNull(),
  privacyPolicy: jsonb("privacy_policy").$type<Record<string, unknown>>().notNull()
});

export const generatedReports = pgTable(
  "generated_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    title: text("title").notNull(),
    reportType: text("report_type").notNull(),
    status: text("status").default("borrador").notNull(),
    scope: jsonb("scope").$type<Record<string, unknown>>().default({}).notNull(),
    narrativeCiphertext: text("narrative_ciphertext"),
    approvedByUserId: uuid("approved_by_user_id").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    statusIdx: index("generated_reports_status_idx").on(table.status),
    typeIdx: index("generated_reports_type_idx").on(table.reportType)
  })
);

export const auditFindings = pgTable(
  "audit_findings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    severity: text("severity").notNull(),
    status: text("status").default("abierto").notNull(),
    title: text("title").notNull(),
    correctivePlan: jsonb("corrective_plan").$type<Record<string, unknown>>().default({}).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    resourceIdx: index("audit_findings_resource_idx").on(table.resourceType, table.resourceId),
    statusIdx: index("audit_findings_status_idx").on(table.status)
  })
);

export const systemConfigurations = pgTable("system_configurations", {
  id: uuid("id").defaultRandom().primaryKey(),
  publicId: text("public_id").notNull().unique(),
  configKey: text("config_key").notNull().unique(),
  scope: jsonb("scope").$type<Record<string, unknown>>().default({}).notNull(),
  version: integer("version").default(1).notNull(),
  status: text("status").default("borrador").notNull(),
  value: jsonb("value").$type<Record<string, unknown>>().default({}).notNull(),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
});

export const publicResources = pgTable(
  "public_resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    title: text("title").notNull(),
    resourceType: text("resource_type").notNull(),
    audience: text("audience").notNull(),
    status: text("status").default("borrador").notNull(),
    blobPathname: text("blob_pathname"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    statusIdx: index("public_resources_status_idx").on(table.status),
    audienceIdx: index("public_resources_audience_idx").on(table.audience)
  })
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    userId: uuid("user_id").references(() => users.id),
    caseId: uuid("case_id").references(() => cases.id),
    priority: text("priority").notNull(),
    channel: text("channel").notNull(),
    status: text("status").default("pendiente").notNull(),
    safeSummary: text("safe_summary").notNull(),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdx: index("notifications_user_idx").on(table.userId),
    caseIdx: index("notifications_case_idx").on(table.caseId),
    statusIdx: index("notifications_status_idx").on(table.status)
  })
);

export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    reason: text("reason"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    resourceIdx: index("audit_resource_idx").on(table.resourceType, table.resourceId),
    createdAtIdx: index("audit_created_at_idx").on(table.createdAt)
  })
);
