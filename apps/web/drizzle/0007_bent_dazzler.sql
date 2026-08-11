CREATE EXTENSION IF NOT EXISTS postgis;--> statement-breakpoint
CREATE TABLE "territorial_points" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"organization_id" uuid,
	"label" text NOT NULL,
	"kind" text NOT NULL,
	"location" geometry(Point, 4326) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "territorial_points_public_id_unique" UNIQUE("public_id")
);
--> statement-breakpoint
ALTER TABLE "territorial_points" ADD CONSTRAINT "territorial_points_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "territorial_points_kind_idx" ON "territorial_points" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "territorial_points_organization_idx" ON "territorial_points" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "territorial_points_location_gix" ON "territorial_points" USING gist ("location");