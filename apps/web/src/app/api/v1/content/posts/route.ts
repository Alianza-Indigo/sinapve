import { z } from "zod";
import { buildAuditEvent } from "@/server/audit";
import { resolveActor } from "@/server/auth/session-actor";
import { createContentPost, listPublishedPosts } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  kind: z.enum(["comunicado", "noticia", "recurso"]),
  title: z.string().min(3).max(160),
  summary: z.string().min(3).max(400),
  body: z.string().max(20000).optional(),
  tag: z.string().max(40).optional(),
  externalUrl: z.string().url().max(500).optional(),
  coverImagePath: z.string().max(500).optional(),
  publish: z.boolean().optional()
});

// GET publico: publicaciones publicadas para el portal (sin PII, sin auth).
export async function GET(request: Request) {
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? "12");
  try {
    const posts = await listPublishedPosts(Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 50) : 12);
    return Response.json({ posts });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ posts: [] });
    throw error;
  }
}

// POST: crea una publicacion (borrador o publicada). Requiere content:publish.
export async function POST(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "content:publish")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_content", issues: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) }, { status: 400 });
  }

  try {
    const post = await createContentPost({ ...parsed.data, actor });
    const audit = buildAuditEvent({ actorId: actor.id, action: "content_post.create", resourceType: "content_post", resourceId: post.id, reason: "content_publication" });
    return Response.json({ post, audit }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    if (error instanceof Error && error.message === "INVALID_CONTENT_KIND") return Response.json({ error: "invalid_content" }, { status: 400 });
    throw error;
  }
}
