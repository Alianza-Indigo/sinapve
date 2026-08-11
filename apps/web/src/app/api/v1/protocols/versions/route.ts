import { z } from "zod";
import { buildAuditEvent } from "@/server/audit";
import { resolveActor } from "@/server/auth/session-actor";
import { listAuthoredProtocolVersions, saveProtocolVersionFromGraph, ProtocolGraphInvalidError } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";
import { protocolGraphSchema } from "@/server/domain/protocol-graph";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  graph: protocolGraphSchema
});

// GET: lista la ultima version de cada protocolo autorable (para "abrir existente").
export async function GET(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "protocol:author")) return Response.json({ error: "forbidden" }, { status: 403 });

  try {
    const versions = await listAuthoredProtocolVersions();
    return Response.json({ versions });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    throw error;
  }
}

// POST: publica una nueva version a partir del grafo del constructor visual.
export async function POST(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "protocol:author")) return Response.json({ error: "forbidden" }, { status: 403 });

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return Response.json(
      { error: "invalid_protocol", issues: parsed.error.issues.map((issue) => `${issue.path.join(".") || "grafo"}: ${issue.message}`) },
      { status: 400 }
    );
  }

  try {
    const result = await saveProtocolVersionFromGraph({ graph: parsed.data.graph, actor });
    const audit = buildAuditEvent({
      actorId: actor.id,
      action: "protocol_version.publish",
      resourceType: "protocol_version",
      resourceId: result.code,
      reason: "protocol_builder"
    });
    return Response.json({ version: result, audit }, { status: 201 });
  } catch (error) {
    if (error instanceof ProtocolGraphInvalidError) {
      return Response.json({ error: "invalid_protocol", issues: error.errors }, { status: 400 });
    }
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    throw error;
  }
}
