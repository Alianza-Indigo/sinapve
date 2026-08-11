CREATE TABLE "budget_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"period" text NOT NULL,
	"component" text NOT NULL,
	"level" text NOT NULL,
	"devengado" numeric DEFAULT '0' NOT NULL,
	"ejercido" numeric DEFAULT '0' NOT NULL,
	"meta" numeric DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "budget_lines_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "enrollment_figures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"organization_id" uuid,
	"period" text NOT NULL,
	"students" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enrollment_figures_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "impact_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"indicator" text NOT NULL,
	"group_type" text NOT NULL,
	"phase" text NOT NULL,
	"period" text NOT NULL,
	"value" numeric NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "impact_measurements_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "risk_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"organization_id" uuid,
	"model_version" integer DEFAULT 1 NOT NULL,
	"score" numeric NOT NULL,
	"quality" integer DEFAULT 0 NOT NULL,
	"factors" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "risk_scores_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "school_retention" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"organization_id" uuid,
	"cohort_period" text NOT NULL,
	"continued" integer NOT NULL,
	"total" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_retention_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
CREATE TABLE "survey_responses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"survey_type" text NOT NULL,
	"score" integer NOT NULL,
	"period" text NOT NULL,
	"organization_id" uuid,
	"population" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "survey_responses_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "enrollment_figures" ADD CONSTRAINT "enrollment_figures_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_scores" ADD CONSTRAINT "risk_scores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_retention" ADD CONSTRAINT "school_retention_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budget_lines_period_idx" ON "budget_lines" USING btree ("period");--> statement-breakpoint
CREATE INDEX "budget_lines_component_idx" ON "budget_lines" USING btree ("component");--> statement-breakpoint
CREATE INDEX "enrollment_figures_period_idx" ON "enrollment_figures" USING btree ("period");--> statement-breakpoint
CREATE INDEX "impact_measurements_indicator_idx" ON "impact_measurements" USING btree ("indicator");--> statement-breakpoint
CREATE INDEX "risk_scores_org_idx" ON "risk_scores" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "risk_scores_computed_idx" ON "risk_scores" USING btree ("computed_at");--> statement-breakpoint
CREATE INDEX "school_retention_cohort_idx" ON "school_retention" USING btree ("cohort_period");--> statement-breakpoint
CREATE INDEX "survey_responses_type_idx" ON "survey_responses" USING btree ("survey_type");--> statement-breakpoint
CREATE INDEX "survey_responses_period_idx" ON "survey_responses" USING btree ("period");