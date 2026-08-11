import { boolean, customType, index, integer, jsonb, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { CaseState, ReportMode, Severity } from "../domain/types";

// EP / 9.2: tipo geoespacial PostGIS. Punto en SRID 4326 (WGS84). Se acepta EWKT
// (`SRID=4326;POINT(lng lat)`) como valor de entrada.
export const geometryPoint = customType<{ data: string; driverData: string }>({
  dataType() {
    return "geometry(Point, 4326)";
  }
});

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

export const userSessions = pgTable(
  "user_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    sessionDigest: text("session_digest").notNull().unique(),
    source: text("source").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdx: index("user_sessions_user_idx").on(table.userId),
    digestIdx: index("user_sessions_digest_idx").on(table.sessionDigest)
  })
);

export const breakGlassGrants = pgTable(
  "break_glass_grants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    reason: text("reason").notNull(),
    privacyAlertSentAt: timestamp("privacy_alert_sent_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    resourceIdx: index("break_glass_resource_idx").on(table.resourceType, table.resourceId),
    actorIdx: index("break_glass_actor_idx").on(table.actorUserId)
  })
);

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

export const reportMessages = pgTable(
  "report_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    reportId: uuid("report_id")
      .notNull()
      .references(() => reports.id),
    senderType: text("sender_type").notNull(),
    bodyCiphertext: text("body_ciphertext").notNull(),
    status: text("status").default("recibido").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    reportIdx: index("report_messages_report_idx").on(table.reportId),
    createdAtIdx: index("report_messages_created_at_idx").on(table.createdAt)
  })
);

export const reportIntakeChecks = pgTable(
  "report_intake_checks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    reportId: uuid("report_id").references(() => reports.id),
    publicId: text("public_id").notNull().unique(),
    checkType: text("check_type").notNull(),
    status: text("status").notNull(),
    score: integer("score"),
    evidence: jsonb("evidence").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    reportIdx: index("report_intake_checks_report_idx").on(table.reportId),
    typeIdx: index("report_intake_checks_type_idx").on(table.checkType)
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

export const caseParticipants = pgTable(
  "case_participants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    relationship: text("relationship").notNull(),
    displayLabel: text("display_label").notNull(),
    detailsCiphertext: text("details_ciphertext"),
    active: boolean("active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    caseIdx: index("case_participants_case_idx").on(table.caseId),
    relationshipIdx: index("case_participants_relationship_idx").on(table.relationship)
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

export const caseEvidenceFiles = pgTable(
  "case_evidence_files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    pathname: text("pathname").notNull().unique(),
    contentType: text("content_type").notNull(),
    size: integer("size").notNull(),
    sha256: text("sha256").notNull(),
    scanStatus: text("scan_status").notNull(),
    exifPolicy: text("exif_policy").notNull(),
    origin: text("origin").default("case_upload").notNull(),
    custodianUserId: uuid("custodian_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    caseIdx: index("case_evidence_files_case_idx").on(table.caseId),
    shaIdx: index("case_evidence_files_sha_idx").on(table.sha256)
  })
);

export const caseAssignments = pgTable(
  "case_assignments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    caseIdx: index("case_assignments_case_idx").on(table.caseId),
    userIdx: index("case_assignments_user_idx").on(table.userId)
  })
);

export const caseFieldVersions = pgTable(
  "case_field_versions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    fieldName: text("field_name").notNull(),
    valueCiphertext: text("value_ciphertext").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    caseIdx: index("case_field_versions_case_idx").on(table.caseId),
    fieldIdx: index("case_field_versions_field_idx").on(table.fieldName)
  })
);

export const protectionMeasures = pgTable(
  "protection_measures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    measureType: text("measure_type").notNull(),
    summaryCiphertext: text("summary_ciphertext").notNull(),
    status: text("status").default("activa").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true })
  },
  (table) => ({
    caseIdx: index("protection_measures_case_idx").on(table.caseId),
    statusIdx: index("protection_measures_status_idx").on(table.status)
  })
);

export const consentRecords = pgTable(
  "consent_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    caseId: uuid("case_id").references(() => cases.id),
    reportId: uuid("report_id").references(() => reports.id),
    subjectLabel: text("subject_label").notNull(),
    consentType: text("consent_type").notNull(),
    legalBasis: text("legal_basis"),
    status: text("status").default("registrado").notNull(),
    evidenceCiphertext: text("evidence_ciphertext"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    caseIdx: index("consent_records_case_idx").on(table.caseId),
    reportIdx: index("consent_records_report_idx").on(table.reportId)
  })
);

export const clinicalCompartments = pgTable(
  "clinical_compartments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    authorizedRole: text("authorized_role").notNull(),
    summaryCiphertext: text("summary_ciphertext").notNull(),
    status: text("status").default("restringido").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    caseIdx: index("clinical_compartments_case_idx").on(table.caseId)
  })
);

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

export const protocolStepEvents = pgTable(
  "protocol_step_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    protocolRunId: uuid("protocol_run_id")
      .notNull()
      .references(() => protocolRuns.id),
    stepId: text("step_id").notNull(),
    status: text("status").notNull(),
    chosenNext: text("chosen_next"),
    evidencePathname: text("evidence_pathname"),
    notesCiphertext: text("notes_ciphertext"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    runIdx: index("protocol_step_events_run_idx").on(table.protocolRunId),
    stepIdx: index("protocol_step_events_step_idx").on(table.stepId)
  })
);

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

export const serviceDirectoryEntries = pgTable(
  "service_directory_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    serviceType: text("service_type").notNull(),
    name: text("name").notNull(),
    territory: jsonb("territory").$type<Record<string, unknown>>().default({}).notNull(),
    contactPolicy: jsonb("contact_policy").$type<Record<string, unknown>>().default({}).notNull(),
    status: text("status").default("activo").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    serviceTypeIdx: index("service_directory_entries_service_type_idx").on(table.serviceType),
    statusIdx: index("service_directory_entries_status_idx").on(table.status)
  })
);

export const institutionalBodies = pgTable(
  "institutional_bodies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    bodyType: text("body_type").notNull(),
    name: text("name").notNull(),
    status: text("status").default("activo").notNull(),
    quorumRules: jsonb("quorum_rules").$type<Record<string, unknown>>().default({}).notNull(),
    annualPlan: jsonb("annual_plan").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    organizationIdx: index("institutional_bodies_organization_idx").on(table.organizationId),
    bodyTypeIdx: index("institutional_bodies_body_type_idx").on(table.bodyType)
  })
);

export const institutionalBodyMembers = pgTable(
  "institutional_body_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    bodyId: uuid("body_id")
      .notNull()
      .references(() => institutionalBodies.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: text("role").notNull(),
    conflictDeclaration: jsonb("conflict_declaration").$type<Record<string, unknown>>().default({}).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }).defaultNow().notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true })
  },
  (table) => ({
    bodyIdx: index("institutional_body_members_body_idx").on(table.bodyId),
    userIdx: index("institutional_body_members_user_idx").on(table.userId)
  })
);

export const institutionalSessions = pgTable(
  "institutional_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    bodyId: uuid("body_id")
      .notNull()
      .references(() => institutionalBodies.id),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    agenda: jsonb("agenda").$type<Array<Record<string, unknown>>>().default([]).notNull(),
    quorumMet: boolean("quorum_met").default(false).notNull(),
    agreements: jsonb("agreements").$type<Array<Record<string, unknown>>>().default([]).notNull(),
    tasks: jsonb("tasks").$type<Array<Record<string, unknown>>>().default([]).notNull(),
    status: text("status").default("programada").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    bodyIdx: index("institutional_sessions_body_idx").on(table.bodyId),
    statusIdx: index("institutional_sessions_status_idx").on(table.status)
  })
);

export const emirDispatches = pgTable(
  "emir_dispatches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    caseId: uuid("case_id").references(() => cases.id),
    teamName: text("team_name").notNull(),
    coverageArea: jsonb("coverage_area").$type<Record<string, unknown>>().default({}).notNull(),
    approximateLocation: jsonb("approximate_location").$type<Record<string, unknown>>().default({}).notNull(),
    capacitySnapshot: jsonb("capacity_snapshot").$type<Record<string, unknown>>().default({}).notNull(),
    status: text("status").default("disponible").notNull(),
    dispatchedAt: timestamp("dispatched_at", { withTimezone: true }),
    arrivedAt: timestamp("arrived_at", { withTimezone: true }),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    statusIdx: index("emir_dispatches_status_idx").on(table.status),
    organizationIdx: index("emir_dispatches_organization_idx").on(table.organizationId)
  })
);

export const protocolApprovals = pgTable(
  "protocol_approvals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    protocolVersionId: uuid("protocol_version_id")
      .notNull()
      .references(() => protocolVersions.id),
    approverUserId: uuid("approver_user_id").references(() => users.id),
    approvalType: text("approval_type").notNull(),
    status: text("status").default("pendiente").notNull(),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    protocolIdx: index("protocol_approvals_protocol_idx").on(table.protocolVersionId),
    statusIdx: index("protocol_approvals_status_idx").on(table.status)
  })
);

export const protocolSimulations = pgTable(
  "protocol_simulations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    protocolVersionId: uuid("protocol_version_id")
      .notNull()
      .references(() => protocolVersions.id),
    scenario: jsonb("scenario").$type<Record<string, unknown>>().default({}).notNull(),
    result: jsonb("result").$type<Record<string, unknown>>().default({}).notNull(),
    status: text("status").default("ejecutada").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    protocolIdx: index("protocol_simulations_protocol_idx").on(table.protocolVersionId)
  })
);

export const protocolMigrations = pgTable(
  "protocol_migrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    fromProtocolVersionId: uuid("from_protocol_version_id").references(() => protocolVersions.id),
    toProtocolVersionId: uuid("to_protocol_version_id")
      .notNull()
      .references(() => protocolVersions.id),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    reason: text("reason").notNull(),
    status: text("status").default("pendiente").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    caseIdx: index("protocol_migrations_case_idx").on(table.caseId),
    statusIdx: index("protocol_migrations_status_idx").on(table.status)
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
    certificatePublicCode: text("certificate_public_code").unique(),
    certifiedAt: timestamp("certified_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdx: index("training_enrollments_user_idx").on(table.userId),
    programIdx: index("training_enrollments_program_idx").on(table.programId)
  })
);

export const trainingCohorts = pgTable(
  "training_cohorts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    programId: uuid("program_id")
      .notNull()
      .references(() => trainingPrograms.id),
    facilitatorUserId: uuid("facilitator_user_id").references(() => users.id),
    modality: text("modality").notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    status: text("status").default("planeada").notNull(),
    accessibilityEvidence: jsonb("accessibility_evidence").$type<Record<string, unknown>>().default({}).notNull()
  },
  (table) => ({
    programIdx: index("training_cohorts_program_idx").on(table.programId),
    statusIdx: index("training_cohorts_status_idx").on(table.status)
  })
);

export const trainingAssessments = pgTable(
  "training_assessments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    enrollmentId: uuid("enrollment_id")
      .notNull()
      .references(() => trainingEnrollments.id),
    assessmentType: text("assessment_type").notNull(),
    score: integer("score"),
    status: text("status").default("revision_humana").notNull(),
    anomalyFlags: jsonb("anomaly_flags").$type<Array<string>>().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    enrollmentIdx: index("training_assessments_enrollment_idx").on(table.enrollmentId),
    statusIdx: index("training_assessments_status_idx").on(table.status)
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

export const communicationCampaigns = pgTable(
  "communication_campaigns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    title: text("title").notNull(),
    audience: text("audience").notNull(),
    territory: jsonb("territory").$type<Record<string, unknown>>().default({}).notNull(),
    language: text("language").default("es").notNull(),
    channelPlan: jsonb("channel_plan").$type<Record<string, unknown>>().default({}).notNull(),
    contentPolicy: jsonb("content_policy").$type<Record<string, unknown>>().default({}).notNull(),
    editorialStatus: text("editorial_status").default("pendiente").notNull(),
    legalStatus: text("legal_status").default("pendiente").notNull(),
    status: text("status").default("borrador").notNull(),
    metrics: jsonb("metrics").$type<Record<string, unknown>>().default({}).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    statusIdx: index("communication_campaigns_status_idx").on(table.status),
    audienceIdx: index("communication_campaigns_audience_idx").on(table.audience)
  })
);

export const contextualAdaptations = pgTable(
  "contextual_adaptations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    title: text("title").notNull(),
    requestingOrganizationId: uuid("requesting_organization_id").references(() => organizations.id),
    territory: jsonb("territory").$type<Record<string, unknown>>().default({}).notNull(),
    population: text("population").notNull(),
    justification: text("justification").notNull(),
    risks: jsonb("risks").$type<Record<string, unknown>>().default({}).notNull(),
    evidence: jsonb("evidence").$type<Record<string, unknown>>().default({}).notNull(),
    reviewStatus: text("review_status").default("tecnica").notNull(),
    approvalStatus: text("approval_status").default("pendiente").notNull(),
    publicSummary: text("public_summary"),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }),
    effectiveTo: timestamp("effective_to", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    approvalIdx: index("contextual_adaptations_approval_idx").on(table.approvalStatus),
    reviewIdx: index("contextual_adaptations_review_idx").on(table.reviewStatus)
  })
);

export const communityProposals = pgTable(
  "community_proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    title: text("title").notNull(),
    bodyCiphertext: text("body_ciphertext").notNull(),
    status: text("status").default("recibida").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    organizationIdx: index("community_proposals_organization_idx").on(table.organizationId),
    statusIdx: index("community_proposals_status_idx").on(table.status)
  })
);

export const mediationReviews = pgTable(
  "mediation_reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => cases.id),
    eligible: boolean("eligible").notNull(),
    blockedReasons: jsonb("blocked_reasons").$type<Array<string>>().default([]).notNull(),
    humanReviewerUserId: uuid("human_reviewer_user_id").references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    caseIdx: index("mediation_reviews_case_idx").on(table.caseId)
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

export const dashboardLayouts = pgTable(
  "dashboard_layouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    ownerUserId: uuid("owner_user_id").references(() => users.id),
    title: text("title").notNull(),
    audience: text("audience").notNull(),
    version: integer("version").default(1).notNull(),
    widgets: jsonb("widgets").$type<Array<Record<string, unknown>>>().default([]).notNull(),
    filters: jsonb("filters").$type<Record<string, unknown>>().default({}).notNull(),
    status: text("status").default("borrador").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    audienceIdx: index("dashboard_layouts_audience_idx").on(table.audience),
    statusIdx: index("dashboard_layouts_status_idx").on(table.status)
  })
);

export const metricExports = pgTable(
  "metric_exports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    metricCode: text("metric_code").notNull(),
    exportType: text("export_type").notNull(),
    filters: jsonb("filters").$type<Record<string, unknown>>().default({}).notNull(),
    purpose: text("purpose").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    metricIdx: index("metric_exports_metric_idx").on(table.metricCode),
    actorIdx: index("metric_exports_actor_idx").on(table.actorUserId)
  })
);

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

export const aiModelRegistry = pgTable(
  "ai_model_registry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    provider: text("provider").notNull(),
    model: text("model").notNull(),
    purpose: text("purpose").notNull(),
    owner: text("owner").notNull(),
    status: text("status").default("apagado").notNull(),
    evaluation: jsonb("evaluation").$type<Record<string, unknown>>().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    statusIdx: index("ai_model_registry_status_idx").on(table.status),
    purposeIdx: index("ai_model_registry_purpose_idx").on(table.purpose)
  })
);

export const aiDecisionLogs = pgTable(
  "ai_decision_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    modelRegistryId: uuid("model_registry_id").references(() => aiModelRegistry.id),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    promptDigest: text("prompt_digest").notNull(),
    responseDigest: text("response_digest").notNull(),
    humanDecision: text("human_decision"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    resourceIdx: index("ai_decision_logs_resource_idx").on(table.resourceType, table.resourceId)
  })
);

export const aiFeedback = pgTable(
  "ai_feedback",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id").notNull(),
    rating: text("rating").notNull(),
    notesCiphertext: text("notes_ciphertext"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    resourceIdx: index("ai_feedback_resource_idx").on(table.resourceType, table.resourceId)
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

export const notificationTemplates = pgTable(
  "notification_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    name: text("name").notNull(),
    channel: text("channel").notNull(),
    priority: text("priority").notNull(),
    locale: text("locale").default("es-MX").notNull(),
    safeBody: text("safe_body").notNull(),
    version: integer("version").default(1).notNull(),
    status: text("status").default("borrador").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    channelIdx: index("notification_templates_channel_idx").on(table.channel),
    statusIdx: index("notification_templates_status_idx").on(table.status)
  })
);

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    channel: text("channel").notNull(),
    enabled: boolean("enabled").default(true).notNull(),
    quietHours: jsonb("quiet_hours").$type<Record<string, unknown>>().default({}).notNull(),
    criticalOverride: boolean("critical_override").default(true).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    userIdx: index("notification_preferences_user_idx").on(table.userId)
  })
);

export const privacyRequests = pgTable(
  "privacy_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    requestType: text("request_type").notNull(),
    requesterContactCiphertext: text("requester_contact_ciphertext").notNull(),
    status: text("status").default("recibida").notNull(),
    scope: jsonb("scope").$type<Record<string, unknown>>().default({}).notNull(),
    dueAt: timestamp("due_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    statusIdx: index("privacy_requests_status_idx").on(table.status),
    typeIdx: index("privacy_requests_type_idx").on(table.requestType)
  })
);

export const privacyProcessingRecords = pgTable(
  "privacy_processing_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    purpose: text("purpose").notNull(),
    audience: text("audience").notNull(),
    dataCategories: jsonb("data_categories").$type<Array<string>>().default([]).notNull(),
    legalBasis: text("legal_basis").notNull(),
    retentionRule: text("retention_rule").notNull(),
    status: text("status").default("vigente").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    purposeIdx: index("privacy_processing_records_purpose_idx").on(table.purpose),
    statusIdx: index("privacy_processing_records_status_idx").on(table.status)
  })
);

export const retentionPolicies = pgTable(
  "retention_policies",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    category: text("category").notNull(),
    jurisdiction: text("jurisdiction").notNull(),
    retentionDays: integer("retention_days").notNull(),
    legalHold: boolean("legal_hold").default(false).notNull(),
    status: text("status").default("vigente").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    categoryIdx: index("retention_policies_category_idx").on(table.category),
    statusIdx: index("retention_policies_status_idx").on(table.status)
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

export const integrationEvents = pgTable(
  "integration_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    source: text("source").notNull(),
    eventType: text("event_type").notNull(),
    signatureDigest: text("signature_digest"),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
    status: text("status").default("recibido").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    sourceIdx: index("integration_events_source_idx").on(table.source),
    typeIdx: index("integration_events_type_idx").on(table.eventType)
  })
);

// EP-09 / 7.3: base documental aprobada para el asistente RAG de protocolos.
// Solo contiene doctrina aprobada (protocolos, manuales, normativa, FAQ), no
// datos personales. Versionada y con vigencia.
export const approvedDocuments = pgTable(
  "approved_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    docType: text("doc_type").notNull(),
    title: text("title").notNull(),
    version: integer("version").default(1).notNull(),
    sourceRef: text("source_ref").notNull(),
    body: text("body").notNull(),
    keywords: text("keywords").default("").notNull(),
    active: boolean("active").default(true).notNull(),
    effectiveFrom: timestamp("effective_from", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    docTypeIdx: index("approved_documents_doc_type_idx").on(table.docType),
    activeIdx: index("approved_documents_active_idx").on(table.active)
  })
);

// EP / 9.2: puntos territoriales geolocalizados (recursos, planteles, despachos)
// con geometria PostGIS para consultas de proximidad e indices espaciales.
export const territorialPoints = pgTable(
  "territorial_points",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    label: text("label").notNull(),
    kind: text("kind").notNull(),
    location: geometryPoint("location").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    kindIdx: index("territorial_points_kind_idx").on(table.kind),
    organizationIdx: index("territorial_points_organization_idx").on(table.organizationId)
  })
);

// EP-08 / 7.6: corridas del INRE (indice de riesgo) con puntaje, calidad y
// contribucion por dimension. Alimenta G11 (tendencia) y G12 (factores).
export const riskScores = pgTable(
  "risk_scores",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    modelVersion: integer("model_version").default(1).notNull(),
    score: numeric("score").notNull(),
    quality: integer("quality").default(0).notNull(),
    factors: jsonb("factors").$type<Record<string, { value: number; contribution: number }>>().default({}).notNull(),
    computedAt: timestamp("computed_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    orgIdx: index("risk_scores_org_idx").on(table.organizationId),
    computedIdx: index("risk_scores_computed_idx").on(table.computedAt)
  })
);

// EP-13: respuestas de encuesta agregables (IPSE percepcion, NPS confianza).
// Alimenta G24 y G32. Sin vinculo a sanciones individuales.
export const surveyResponses = pgTable(
  "survey_responses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    surveyType: text("survey_type").notNull(),
    score: integer("score").notNull(),
    period: text("period").notNull(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    population: text("population"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    typeIdx: index("survey_responses_type_idx").on(table.surveyType),
    periodIdx: index("survey_responses_period_idx").on(table.period)
  })
);

// EP-13: matricula por plantel y periodo. Denominador de tasa_incidencia (G25).
export const enrollmentFigures = pgTable(
  "enrollment_figures",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    period: text("period").notNull(),
    students: integer("students").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    periodIdx: index("enrollment_figures_period_idx").on(table.period)
  })
);

// EP-13: permanencia escolar por cohorte. Alimenta G27.
export const schoolRetention = pgTable(
  "school_retention",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    organizationId: uuid("organization_id").references(() => organizations.id),
    cohortPeriod: text("cohort_period").notNull(),
    continued: integer("continued").notNull(),
    total: integer("total").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    cohortIdx: index("school_retention_cohort_idx").on(table.cohortPeriod)
  })
);

// EP-13: mediciones de evaluacion de impacto (diseno DiD). Alimenta G28.
export const impactMeasurements = pgTable(
  "impact_measurements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    indicator: text("indicator").notNull(),
    groupType: text("group_type").notNull(),
    phase: text("phase").notNull(),
    period: text("period").notNull(),
    value: numeric("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    indicatorIdx: index("impact_measurements_indicator_idx").on(table.indicator)
  })
);

// EP-13: ejecucion presupuestal por componente y periodo. Alimenta G30.
export const budgetLines = pgTable(
  "budget_lines",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    period: text("period").notNull(),
    component: text("component").notNull(),
    level: text("level").notNull(),
    devengado: numeric("devengado").default("0").notNull(),
    ejercido: numeric("ejercido").default("0").notNull(),
    meta: numeric("meta").default("0").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    periodIdx: index("budget_lines_period_idx").on(table.period),
    componentIdx: index("budget_lines_component_idx").on(table.component)
  })
);

// EP-04/06 / 11.6: cola de trabajos durables (patron outbox). Portable a Vercel
// Queues/Workflows: entrega al menos una vez, consumidores idempotentes por
// idempotencyKey, reintentos con backoff y bloqueo por lease.
export const durableJobs = pgTable(
  "durable_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    publicId: text("public_id").notNull().unique(),
    jobType: text("job_type").notNull(),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    status: text("status").default("pendiente").notNull(),
    runAt: timestamp("run_at", { withTimezone: true }).defaultNow().notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}).notNull(),
    lastError: text("last_error"),
    lockedAt: timestamp("locked_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull()
  },
  (table) => ({
    statusRunAtIdx: index("durable_jobs_status_run_at_idx").on(table.status, table.runAt),
    jobTypeIdx: index("durable_jobs_job_type_idx").on(table.jobType)
  })
);
