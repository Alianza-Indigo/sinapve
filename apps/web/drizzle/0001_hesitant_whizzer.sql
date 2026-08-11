CREATE TABLE "audit_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"severity" text NOT NULL,
	"status" text DEFAULT 'abierto' NOT NULL,
	"title" text NOT NULL,
	"corrective_plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"due_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "audit_findings_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "community_initiatives" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"organization_id" uuid,
	"title" text NOT NULL,
	"initiative_type" text NOT NULL,
	"status" text DEFAULT 'planeada' NOT NULL,
	"safeguards" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "community_initiatives_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "generated_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"title" text NOT NULL,
	"report_type" text NOT NULL,
	"status" text DEFAULT 'borrador' NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"narrative_ciphertext" text,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generated_reports_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "intervention_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"case_id" uuid NOT NULL,
	"owner_user_id" uuid,
	"title" text NOT NULL,
	"status" text DEFAULT 'activo' NOT NULL,
	"goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"adjustments" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"next_review_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "intervention_plans_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"user_id" uuid,
	"case_id" uuid,
	"priority" text NOT NULL,
	"channel" text NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"safe_summary" text NOT NULL,
	"acknowledged_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notifications_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "public_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"title" text NOT NULL,
	"resource_type" text NOT NULL,
	"audience" text NOT NULL,
	"status" text DEFAULT 'borrador' NOT NULL,
	"blob_pathname" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "public_resources_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"case_id" uuid NOT NULL,
	"destination_type" text NOT NULL,
	"destination_name" text NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"required_ack_by" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "referrals_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "system_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"config_key" text NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'borrador' NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_by_user_id" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "system_configurations_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "system_configurations_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE "training_enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"program_id" uuid NOT NULL,
	"status" text DEFAULT 'inscrito' NOT NULL,
	"progress_percent" integer DEFAULT 0 NOT NULL,
	"certified_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "training_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"title" text NOT NULL,
	"audience_role" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"required_for_certification" boolean DEFAULT false NOT NULL,
	"status" text DEFAULT 'borrador' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "training_programs_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "community_initiatives" ADD CONSTRAINT "community_initiatives_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_reports" ADD CONSTRAINT "generated_reports_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_plans" ADD CONSTRAINT "intervention_plans_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intervention_plans" ADD CONSTRAINT "intervention_plans_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "system_configurations" ADD CONSTRAINT "system_configurations_updated_by_user_id_users_id_fk" FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_program_id_training_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."training_programs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_findings_resource_idx" ON "audit_findings" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_findings_status_idx" ON "audit_findings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "community_initiatives_organization_idx" ON "community_initiatives" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "community_initiatives_status_idx" ON "community_initiatives" USING btree ("status");--> statement-breakpoint
CREATE INDEX "generated_reports_status_idx" ON "generated_reports" USING btree ("status");--> statement-breakpoint
CREATE INDEX "generated_reports_type_idx" ON "generated_reports" USING btree ("report_type");--> statement-breakpoint
CREATE INDEX "intervention_plans_case_idx" ON "intervention_plans" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "intervention_plans_status_idx" ON "intervention_plans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_case_idx" ON "notifications" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "notifications_status_idx" ON "notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "public_resources_status_idx" ON "public_resources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "public_resources_audience_idx" ON "public_resources" USING btree ("audience");--> statement-breakpoint
CREATE INDEX "referrals_case_idx" ON "referrals" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "referrals_status_idx" ON "referrals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "training_enrollments_user_idx" ON "training_enrollments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "training_enrollments_program_idx" ON "training_enrollments" USING btree ("program_id");