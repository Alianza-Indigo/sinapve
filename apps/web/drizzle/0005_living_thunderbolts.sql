CREATE TABLE "ai_decision_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"model_registry_id" uuid,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"prompt_digest" text NOT NULL,
	"response_digest" text NOT NULL,
	"human_decision" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_decision_logs_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "ai_model_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"purpose" text NOT NULL,
	"owner" text NOT NULL,
	"status" text DEFAULT 'apagado' NOT NULL,
	"evaluation" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_model_registry_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "break_glass_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"actor_user_id" uuid,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"reason" text NOT NULL,
	"privacy_alert_sent_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "break_glass_grants_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "case_evidence_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"case_id" uuid NOT NULL,
	"pathname" text NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"sha256" text NOT NULL,
	"scan_status" text NOT NULL,
	"exif_policy" text NOT NULL,
	"origin" text DEFAULT 'case_upload' NOT NULL,
	"custodian_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_evidence_files_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "case_evidence_files_pathname_unique" UNIQUE("pathname")
);
--> statement-breakpoint
CREATE TABLE "case_field_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"field_name" text NOT NULL,
	"value_ciphertext" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"case_id" uuid NOT NULL,
	"relationship" text NOT NULL,
	"display_label" text NOT NULL,
	"details_ciphertext" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_participants_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "clinical_compartments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"case_id" uuid NOT NULL,
	"authorized_role" text NOT NULL,
	"summary_ciphertext" text NOT NULL,
	"status" text DEFAULT 'restringido' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinical_compartments_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "community_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"organization_id" uuid,
	"title" text NOT NULL,
	"body_ciphertext" text NOT NULL,
	"status" text DEFAULT 'recibida' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_proposals_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "consent_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"case_id" uuid,
	"report_id" uuid,
	"subject_label" text NOT NULL,
	"consent_type" text NOT NULL,
	"legal_basis" text,
	"status" text DEFAULT 'registrado' NOT NULL,
	"evidence_ciphertext" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consent_records_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "dashboard_layouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"owner_user_id" uuid,
	"title" text NOT NULL,
	"audience" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"widgets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'borrador' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dashboard_layouts_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "mediation_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"case_id" uuid NOT NULL,
	"eligible" boolean NOT NULL,
	"blocked_reasons" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"human_reviewer_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mediation_reviews_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "metric_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"actor_user_id" uuid,
	"metric_code" text NOT NULL,
	"export_type" text NOT NULL,
	"filters" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"purpose" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "metric_exports_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "privacy_processing_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"purpose" text NOT NULL,
	"audience" text NOT NULL,
	"data_categories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"legal_basis" text NOT NULL,
	"retention_rule" text NOT NULL,
	"status" text DEFAULT 'vigente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "privacy_processing_records_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "protection_measures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"case_id" uuid NOT NULL,
	"measure_type" text NOT NULL,
	"summary_ciphertext" text NOT NULL,
	"status" text DEFAULT 'activa' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	CONSTRAINT "protection_measures_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "protocol_approvals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"protocol_version_id" uuid NOT NULL,
	"approver_user_id" uuid,
	"approval_type" text NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"signed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocol_approvals_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "protocol_migrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"from_protocol_version_id" uuid,
	"to_protocol_version_id" uuid NOT NULL,
	"case_id" uuid NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocol_migrations_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "protocol_simulations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"protocol_version_id" uuid NOT NULL,
	"scenario" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"result" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'ejecutada' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocol_simulations_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "report_intake_checks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"report_id" uuid,
	"public_id" text NOT NULL,
	"check_type" text NOT NULL,
	"status" text NOT NULL,
	"score" integer,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_intake_checks_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "retention_policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"category" text NOT NULL,
	"jurisdiction" text NOT NULL,
	"retention_days" integer NOT NULL,
	"legal_hold" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'vigente' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "retention_policies_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "training_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"enrollment_id" uuid NOT NULL,
	"assessment_type" text NOT NULL,
	"score" integer,
	"status" text DEFAULT 'revision_humana' NOT NULL,
	"anomaly_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "training_assessments_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "training_cohorts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"program_id" uuid NOT NULL,
	"facilitator_user_id" uuid,
	"modality" text NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"status" text DEFAULT 'planeada' NOT NULL,
	"accessibility_evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	CONSTRAINT "training_cohorts_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"session_digest" text NOT NULL,
	"source" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_sessions_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "user_sessions_session_digest_unique" UNIQUE("session_digest")
);
--> statement-breakpoint
ALTER TABLE "ai_decision_logs" ADD CONSTRAINT "ai_decision_logs_model_registry_id_ai_model_registry_id_fk" FOREIGN KEY ("model_registry_id") REFERENCES "public"."ai_model_registry"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "break_glass_grants" ADD CONSTRAINT "break_glass_grants_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_evidence_files" ADD CONSTRAINT "case_evidence_files_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_evidence_files" ADD CONSTRAINT "case_evidence_files_custodian_user_id_users_id_fk" FOREIGN KEY ("custodian_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_field_versions" ADD CONSTRAINT "case_field_versions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_participants" ADD CONSTRAINT "case_participants_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_compartments" ADD CONSTRAINT "clinical_compartments_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "community_proposals" ADD CONSTRAINT "community_proposals_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dashboard_layouts" ADD CONSTRAINT "dashboard_layouts_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mediation_reviews" ADD CONSTRAINT "mediation_reviews_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mediation_reviews" ADD CONSTRAINT "mediation_reviews_human_reviewer_user_id_users_id_fk" FOREIGN KEY ("human_reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "metric_exports" ADD CONSTRAINT "metric_exports_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protection_measures" ADD CONSTRAINT "protection_measures_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_approvals" ADD CONSTRAINT "protocol_approvals_protocol_version_id_protocol_versions_id_fk" FOREIGN KEY ("protocol_version_id") REFERENCES "public"."protocol_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_approvals" ADD CONSTRAINT "protocol_approvals_approver_user_id_users_id_fk" FOREIGN KEY ("approver_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_migrations" ADD CONSTRAINT "protocol_migrations_from_protocol_version_id_protocol_versions_id_fk" FOREIGN KEY ("from_protocol_version_id") REFERENCES "public"."protocol_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_migrations" ADD CONSTRAINT "protocol_migrations_to_protocol_version_id_protocol_versions_id_fk" FOREIGN KEY ("to_protocol_version_id") REFERENCES "public"."protocol_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_migrations" ADD CONSTRAINT "protocol_migrations_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_simulations" ADD CONSTRAINT "protocol_simulations_protocol_version_id_protocol_versions_id_fk" FOREIGN KEY ("protocol_version_id") REFERENCES "public"."protocol_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_intake_checks" ADD CONSTRAINT "report_intake_checks_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_assessments" ADD CONSTRAINT "training_assessments_enrollment_id_training_enrollments_id_fk" FOREIGN KEY ("enrollment_id") REFERENCES "public"."training_enrollments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_cohorts" ADD CONSTRAINT "training_cohorts_program_id_training_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."training_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_cohorts" ADD CONSTRAINT "training_cohorts_facilitator_user_id_users_id_fk" FOREIGN KEY ("facilitator_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_decision_logs_resource_idx" ON "ai_decision_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "ai_model_registry_status_idx" ON "ai_model_registry" USING btree ("status");--> statement-breakpoint
CREATE INDEX "ai_model_registry_purpose_idx" ON "ai_model_registry" USING btree ("purpose");--> statement-breakpoint
CREATE INDEX "break_glass_resource_idx" ON "break_glass_grants" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "break_glass_actor_idx" ON "break_glass_grants" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "case_evidence_files_case_idx" ON "case_evidence_files" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_evidence_files_sha_idx" ON "case_evidence_files" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "case_field_versions_case_idx" ON "case_field_versions" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_field_versions_field_idx" ON "case_field_versions" USING btree ("field_name");--> statement-breakpoint
CREATE INDEX "case_participants_case_idx" ON "case_participants" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_participants_relationship_idx" ON "case_participants" USING btree ("relationship");--> statement-breakpoint
CREATE INDEX "clinical_compartments_case_idx" ON "clinical_compartments" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "community_proposals_organization_idx" ON "community_proposals" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "community_proposals_status_idx" ON "community_proposals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "consent_records_case_idx" ON "consent_records" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "consent_records_report_idx" ON "consent_records" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "dashboard_layouts_audience_idx" ON "dashboard_layouts" USING btree ("audience");--> statement-breakpoint
CREATE INDEX "dashboard_layouts_status_idx" ON "dashboard_layouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "mediation_reviews_case_idx" ON "mediation_reviews" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "metric_exports_metric_idx" ON "metric_exports" USING btree ("metric_code");--> statement-breakpoint
CREATE INDEX "metric_exports_actor_idx" ON "metric_exports" USING btree ("actor_user_id");--> statement-breakpoint
CREATE INDEX "privacy_processing_records_purpose_idx" ON "privacy_processing_records" USING btree ("purpose");--> statement-breakpoint
CREATE INDEX "privacy_processing_records_status_idx" ON "privacy_processing_records" USING btree ("status");--> statement-breakpoint
CREATE INDEX "protection_measures_case_idx" ON "protection_measures" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "protection_measures_status_idx" ON "protection_measures" USING btree ("status");--> statement-breakpoint
CREATE INDEX "protocol_approvals_protocol_idx" ON "protocol_approvals" USING btree ("protocol_version_id");--> statement-breakpoint
CREATE INDEX "protocol_approvals_status_idx" ON "protocol_approvals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "protocol_migrations_case_idx" ON "protocol_migrations" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "protocol_migrations_status_idx" ON "protocol_migrations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "protocol_simulations_protocol_idx" ON "protocol_simulations" USING btree ("protocol_version_id");--> statement-breakpoint
CREATE INDEX "report_intake_checks_report_idx" ON "report_intake_checks" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "report_intake_checks_type_idx" ON "report_intake_checks" USING btree ("check_type");--> statement-breakpoint
CREATE INDEX "retention_policies_category_idx" ON "retention_policies" USING btree ("category");--> statement-breakpoint
CREATE INDEX "retention_policies_status_idx" ON "retention_policies" USING btree ("status");--> statement-breakpoint
CREATE INDEX "training_assessments_enrollment_idx" ON "training_assessments" USING btree ("enrollment_id");--> statement-breakpoint
CREATE INDEX "training_assessments_status_idx" ON "training_assessments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "training_cohorts_program_idx" ON "training_cohorts" USING btree ("program_id");--> statement-breakpoint
CREATE INDEX "training_cohorts_status_idx" ON "training_cohorts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "user_sessions_user_idx" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_sessions_digest_idx" ON "user_sessions" USING btree ("session_digest");--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "mfa_required";