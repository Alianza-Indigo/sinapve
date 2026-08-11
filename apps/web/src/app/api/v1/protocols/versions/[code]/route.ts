import { resolveActor } from "@/server/auth/session-actor";
import { getProtocolGraph } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: devuelve el grafo editable de la ultima version de un codigo de protocolo.
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "protocol:author")) return Response.json({ error: "forbidden" }, { status: 403 });

  const { code } = await params;
  try {
    const graph = await getProtocolGraph(code);
    if (!graph) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ graph });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    throw error;
  }
}
