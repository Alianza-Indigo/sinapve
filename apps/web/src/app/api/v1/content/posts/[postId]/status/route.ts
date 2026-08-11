import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { setContentPostStatus } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ status: z.enum(["publicado", "borrador"]) });

// POST: publica o retira una publicacion. Requiere content:publish.
export async function POST(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "content:publish")) return Response.json({ error: "forbidden" }, { status: 403 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_status" }, { status: 400 });

  const { postId } = await params;
  try {
    const post = await setContentPostStatus({ postId, status: parsed.data.status, actor });
    return Response.json({ post });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    if (error instanceof Error && error.message === "CONTENT_POST_NOT_FOUND") return Response.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}
