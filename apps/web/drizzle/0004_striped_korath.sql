CREATE TABLE "communication_campaigns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"title" text NOT NULL,
	"audience" text NOT NULL,
	"territory" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"language" text DEFAULT 'es' NOT NULL,
	"channel_plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content_policy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"editorial_status" text DEFAULT 'pendiente' NOT NULL,
	"legal_status" text DEFAULT 'pendiente' NOT NULL,
	"status" text DEFAULT 'borrador' NOT NULL,
	"metrics" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "communication_campaigns_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "contextual_adaptations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"title" text NOT NULL,
	"requesting_organization_id" uuid,
	"territory" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"population" text NOT NULL,
	"justification" text NOT NULL,
	"risks" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"review_status" text DEFAULT 'tecnica' NOT NULL,
	"approval_status" text DEFAULT 'pendiente' NOT NULL,
	"public_summary" text,
	"effective_from" timestamp with time zone,
	"effective_to" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contextual_adaptations_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "emir_dispatches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"organization_id" uuid,
	"case_id" uuid,
	"team_name" text NOT NULL,
	"coverage_area" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"approximate_location" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"capacity_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'disponible' NOT NULL,
	"dispatched_at" timestamp with time zone,
	"arrived_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "emir_dispatches_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "institutional_bodies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"organization_id" uuid NOT NULL,
	"body_type" text NOT NULL,
	"name" text NOT NULL,
	"status" text DEFAULT 'activo' NOT NULL,
	"quorum_rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"annual_plan" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "institutional_bodies_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "institutional_body_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"body_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"conflict_declaration" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "institutional_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"body_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone NOT NULL,
	"agenda" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"quorum_met" boolean DEFAULT false NOT NULL,
	"agreements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tasks" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" text DEFAULT 'programada' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "institutional_sessions_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "integration_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"source" text NOT NULL,
	"event_type" text NOT NULL,
	"signature_digest" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'recibido' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "integration_events_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "integration_events_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"quiet_hours" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"critical_override" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"name" text NOT NULL,
	"channel" text NOT NULL,
	"priority" text NOT NULL,
	"locale" text DEFAULT 'es-MX' NOT NULL,
	"safe_body" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'borrador' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_templates_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "service_directory_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"organization_id" uuid,
	"service_type" text NOT NULL,
	"name" text NOT NULL,
	"territory" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"contact_policy" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'activo' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_directory_entries_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "contextual_adaptations" ADD CONSTRAINT "contextual_adaptations_requesting_organization_id_organizations_id_fk" FOREIGN KEY ("requesting_organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emir_dispatches" ADD CONSTRAINT "emir_dispatches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emir_dispatches" ADD CONSTRAINT "emir_dispatches_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institutional_bodies" ADD CONSTRAINT "institutional_bodies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institutional_body_members" ADD CONSTRAINT "institutional_body_members_body_id_institutional_bodies_id_fk" FOREIGN KEY ("body_id") REFERENCES "public"."institutional_bodies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institutional_body_members" ADD CONSTRAINT "institutional_body_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institutional_sessions" ADD CONSTRAINT "institutional_sessions_body_id_institutional_bodies_id_fk" FOREIGN KEY ("body_id") REFERENCES "public"."institutional_bodies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_directory_entries" ADD CONSTRAINT "service_directory_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "communication_campaigns_status_idx" ON "communication_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "communication_campaigns_audience_idx" ON "communication_campaigns" USING btree ("audience");--> statement-breakpoint
CREATE INDEX "contextual_adaptations_approval_idx" ON "contextual_adaptations" USING btree ("approval_status");--> statement-breakpoint
CREATE INDEX "contextual_adaptations_review_idx" ON "contextual_adaptations" USING btree ("review_status");--> statement-breakpoint
CREATE INDEX "emir_dispatches_status_idx" ON "emir_dispatches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "emir_dispatches_organization_idx" ON "emir_dispatches" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "institutional_bodies_organization_idx" ON "institutional_bodies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "institutional_bodies_body_type_idx" ON "institutional_bodies" USING btree ("body_type");--> statement-breakpoint
CREATE INDEX "institutional_body_members_body_idx" ON "institutional_body_members" USING btree ("body_id");--> statement-breakpoint
CREATE INDEX "institutional_body_members_user_idx" ON "institutional_body_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "institutional_sessions_body_idx" ON "institutional_sessions" USING btree ("body_id");--> statement-breakpoint
CREATE INDEX "institutional_sessions_status_idx" ON "institutional_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "integration_events_source_idx" ON "integration_events" USING btree ("source");--> statement-breakpoint
CREATE INDEX "integration_events_type_idx" ON "integration_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "notification_preferences_user_idx" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "notification_templates_channel_idx" ON "notification_templates" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "notification_templates_status_idx" ON "notification_templates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "service_directory_entries_service_type_idx" ON "service_directory_entries" USING btree ("service_type");--> statement-breakpoint
CREATE INDEX "service_directory_entries_status_idx" ON "service_directory_entries" USING btree ("status");