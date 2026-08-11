CREATE TABLE "approved_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"doc_type" text NOT NULL,
	"title" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"source_ref" text NOT NULL,
	"body" text NOT NULL,
	"keywords" text DEFAULT '' NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"effective_from" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "approved_documents_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "durable_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"job_type" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'pendiente' NOT NULL,
	"run_at" timestamp with time zone DEFAULT now() NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 5 NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_error" text,
	"locked_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "durable_jobs_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "durable_jobs_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE INDEX "approved_documents_doc_type_idx" ON "approved_documents" USING btree ("doc_type");--> statement-breakpoint
CREATE INDEX "approved_documents_active_idx" ON "approved_documents" USING btree ("active");--> statement-breakpoint
CREATE INDEX "durable_jobs_status_run_at_idx" ON "durable_jobs" USING btree ("status","run_at");--> statement-breakpoint
CREATE INDEX "durable_jobs_job_type_idx" ON "durable_jobs" USING btree ("job_type");