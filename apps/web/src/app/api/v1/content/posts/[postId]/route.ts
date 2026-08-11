import { resolveActor } from "@/server/auth/session-actor";
import { deleteContentPost } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// DELETE: elimina una publicación del portal. Requiere content:publish.
export async function DELETE(request: Request, { params }: { params: Promise<{ postId: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "content:publish")) return Response.json({ error: "forbidden" }, { status: 403 });

  const { postId } = await params;
  try {
    const post = await deleteContentPost({ postId, actor });
    return Response.json({ post });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    if (error instanceof Error && error.message === "CONTENT_POST_NOT_FOUND") return Response.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}
