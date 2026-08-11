CREATE TABLE "content_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"public_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"tag" text,
	"cover_image_path" text,
	"external_url" text,
	"status" text DEFAULT 'borrador' NOT NULL,
	"published_at" timestamp with time zone,
	"author_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_posts_public_id_unique" UNIQUE("public_id"),
	CONSTRAINT "content_posts_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "content_posts" ADD CONSTRAINT "content_posts_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "content_posts_status_idx" ON "content_posts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "content_posts_kind_idx" ON "content_posts" USING btree ("kind");--> statement-breakpoint
CREATE INDEX "content_posts_published_idx" ON "content_posts" USING btree ("published_at");