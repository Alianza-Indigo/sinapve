CREATE TABLE "privacy_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"request_type" text NOT NULL,
	"requester_contact_ciphertext" text NOT NULL,
	"status" text DEFAULT 'recibida' NOT NULL,
	"scope" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"due_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "privacy_requests_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE INDEX "privacy_requests_status_idx" ON "privacy_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "privacy_requests_type_idx" ON "privacy_requests" USING btree ("request_type");