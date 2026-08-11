import { resolveActor } from "@/server/auth/session-actor";
import { getProtocolRunState } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET: estado navegable de una corrida de protocolo (motor rama por rama).
export async function GET(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "protocol:run")) return Response.json({ error: "forbidden" }, { status: 403 });

  const { runId } = await params;
  try {
    const state = await getProtocolRunState(runId);
    if (!state) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ run: state });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    throw error;
  }
}
