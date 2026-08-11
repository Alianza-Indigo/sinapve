CREATE TYPE "public"."case_state" AS ENUM('nuevo', 'en_triaje', 'activo', 'escalado', 'en_seguimiento', 'listo_para_cierre', 'cerrado', 'reabierto');--> statement-breakpoint
CREATE TYPE "public"."organization_type" AS ENUM('federal', 'state', 'municipality', 'zone', 'school');--> statement-breakpoint
CREATE TYPE "public"."report_mode" AS ENUM('anonimo', 'confidencial', 'identificado');--> statement-breakpoint
CREATE TYPE "public"."report_status" AS ENUM('recibido', 'en_triaje', 'convertido_caso', 'cerrado');--> statement-breakpoint
CREATE TYPE "public"."severity" AS ENUM('leve', 'moderada', 'grave', 'critica');--> statement-breakpoint
CREATE TABLE "audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"reason" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"title" text NOT NULL,
	"body_ciphertext" text NOT NULL,
	"event_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"folio" text NOT NULL,
	"report_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"title" text NOT NULL,
	"state" "case_state" DEFAULT 'nuevo' NOT NULL,
	"severity" "severity" NOT NULL,
	"assigned_user_id" uuid,
	"protection_summary_ciphertext" text,
	"first_response_minutes" integer,
	"sla_minutes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	CONSTRAINT "cases_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "cases_folio_unique" UNIQUE("folio")
);
--> statement-breakpoint
CREATE TABLE "metric_definitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"version" integer NOT NULL,
	"owner" text NOT NULL,
	"formula" text NOT NULL,
	"privacy_policy" jsonb NOT NULL,
	CONSTRAINT "metric_definitions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"name" text NOT NULL,
	"type" "organization_type" NOT NULL,
	"parent_id" uuid,
	"state_code" text,
	"municipality_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "protocol_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"protocol_version_id" uuid NOT NULL,
	"workflow_run_id" text,
	"status" text DEFAULT 'activo' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "protocol_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"version" integer NOT NULL,
	"title" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"steps" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"folio" text NOT NULL,
	"mode" "report_mode" NOT NULL,
	"reporter_type" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"description_ciphertext" text NOT NULL,
	"safety_now" text NOT NULL,
	"status" "report_status" DEFAULT 'recibido' NOT NULL,
	"suggested_severity" "severity" NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "reports_folio_unique" UNIQUE("folio")
);
--> statement-breakpoint
CREATE TABLE "user_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"role" text NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"external_subject" text NOT NULL,
	"display_name" text NOT NULL,
	"email" text,
	"mfa_required" boolean DEFAULT true NOT NULL,
	"disabled_at" timestamp with time zone,
	CONSTRAINT "users_external_subject_unique" UNIQUE("external_subject")
);
--> statement-breakpoint
ALTER TABLE "audit_events" ADD CONSTRAINT "audit_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_events" ADD CONSTRAINT "case_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cases" ADD CONSTRAINT "cases_assigned_user_id_users_id_fk" FOREIGN KEY ("assigned_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_runs" ADD CONSTRAINT "protocol_runs_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_runs" ADD CONSTRAINT "protocol_runs_protocol_version_id_protocol_versions_id_fk" FOREIGN KEY ("protocol_version_id") REFERENCES "public"."protocol_versions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_resource_idx" ON "audit_events" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_created_at_idx" ON "audit_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cases_organization_idx" ON "cases" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "cases_state_idx" ON "cases" USING btree ("state");--> statement-breakpoint
CREATE INDEX "reports_organization_idx" ON "reports" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "reports_created_at_idx" ON "reports" USING btree ("created_at");