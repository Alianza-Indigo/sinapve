import { resolveActor } from "@/server/auth/session-actor";
import { revokeAccessSession } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) {
    return Response.json({ error: "unauthorized", message: "Falta identidad institucional en encabezados seguros." }, { status: 401 });
  }
  if (!hasCapability(actor, "technical:operate") && !hasCapability(actor, "privacy:read")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { sessionId } = await params;
  try {
    const data = await revokeAccessSession({ sessionId, actor });
    return Response.json({ data });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    if (error instanceof Error && error.message === "SESSION_NOT_FOUND") {
      return Response.json({ error: "not_found" }, { status: 404 });
    }
    throw error;
  }
}
