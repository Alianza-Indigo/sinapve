import { buildAuditEvent } from "@/server/audit";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { getCase, startPersistedProtocolRun } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { canReadCase, hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const actor = getActorFromHeaders(_request.headers);
  if (!actor) {
    return Response.json({ error: "unauthorized", message: "Falta identidad institucional en encabezados seguros." }, { status: 401 });
  }

  const { caseId } = await params;
  let caseFile;
  try {
    caseFile = await getCase(caseId);
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    throw error;
  }

  if (!caseFile) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (!canReadCase(actor, caseFile) || !hasCapability(actor, "protocol:run")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  let run;
  try {
    run = await startPersistedProtocolRun({ caseId, actor });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    throw error;
  }

  const audit = buildAuditEvent({
    actorId: actor.id,
    action: "protocol_run.start",
    resourceType: "case",
    resourceId: caseFile.id,
    reason: "human_confirmed_protocol"
  });

  return Response.json({ run, audit, workflow: { status: "pending_vercel_workflow_binding" } }, { status: 202 });
}
