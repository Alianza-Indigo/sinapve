CREATE TABLE "ai_feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"resource_type" text NOT NULL,
	"resource_id" text NOT NULL,
	"rating" text NOT NULL,
	"notes_ciphertext" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ai_feedback_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "case_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"case_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" text NOT NULL,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "case_assignments_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "protocol_step_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"protocol_run_id" uuid NOT NULL,
	"step_id" text NOT NULL,
	"status" text NOT NULL,
	"evidence_pathname" text,
	"notes_ciphertext" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "protocol_step_events_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "report_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"report_id" uuid NOT NULL,
	"sender_type" text NOT NULL,
	"body_ciphertext" text NOT NULL,
	"status" text DEFAULT 'recibido' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "report_messages_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "training_enrollments" ADD COLUMN "certificate_public_code" text;--> statement-breakpoint
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "protocol_step_events" ADD CONSTRAINT "protocol_step_events_protocol_run_id_protocol_runs_id_fk" FOREIGN KEY ("protocol_run_id") REFERENCES "public"."protocol_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_messages" ADD CONSTRAINT "report_messages_report_id_reports_id_fk" FOREIGN KEY ("report_id") REFERENCES "public"."reports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ai_feedback_resource_idx" ON "ai_feedback" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "case_assignments_case_idx" ON "case_assignments" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "case_assignments_user_idx" ON "case_assignments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "protocol_step_events_run_idx" ON "protocol_step_events" USING btree ("protocol_run_id");--> statement-breakpoint
CREATE INDEX "protocol_step_events_step_idx" ON "protocol_step_events" USING btree ("step_id");--> statement-breakpoint
CREATE INDEX "report_messages_report_idx" ON "report_messages" USING btree ("report_id");--> statement-breakpoint
CREATE INDEX "report_messages_created_at_idx" ON "report_messages" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "training_enrollments" ADD CONSTRAINT "training_enrollments_certificate_public_code_unique" UNIQUE("certificate_public_code");