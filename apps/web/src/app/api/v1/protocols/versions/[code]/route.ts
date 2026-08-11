import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import {
  approveProtocolVersion,
  getProtocolGraph,
  migrateActiveRunsToLatest,
  recordProtocolSimulation,
  retireProtocolVersion
} from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const actionSchema = z.object({
  action: z.enum(["approve", "retire", "migrate-runs", "simulate"]),
  scenario: z.record(z.string(), z.unknown()).optional(),
  result: z.record(z.string(), z.unknown()).optional()
});

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

// POST: acciones de gobernanza sobre un codigo de protocolo (aprobar y activar,
// retirar, migrar corridas a la version activa, registrar simulacion).
export async function POST(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "protocol:author")) return Response.json({ error: "forbidden" }, { status: 403 });

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "invalid_action" }, { status: 400 });

  const { code } = await params;
  try {
    if (parsed.data.action === "approve") {
      return Response.json({ result: await approveProtocolVersion({ code, actor }) });
    }
    if (parsed.data.action === "retire") {
      return Response.json({ result: await retireProtocolVersion({ code, actor }) });
    }
    if (parsed.data.action === "migrate-runs") {
      return Response.json({ result: await migrateActiveRunsToLatest({ code, actor }) });
    }
    return Response.json({ result: await recordProtocolSimulation({ code, scenario: parsed.data.scenario ?? {}, result: parsed.data.result ?? {}, actor }) });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    if (error instanceof Error && (error.message === "PROTOCOL_VERSION_NOT_FOUND" || error.message === "NO_ACTIVE_VERSION")) {
      return Response.json({ error: "not_found", message: error.message }, { status: 404 });
    }
    throw error;
  }
}
