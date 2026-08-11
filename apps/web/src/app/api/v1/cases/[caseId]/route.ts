import { buildAuditEvent } from "@/server/audit";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { getCase } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { canReadCase } from "@/server/domain/access";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
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

  if (!canReadCase(actor, caseFile)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const audit = buildAuditEvent({
    actorId: actor.id,
    action: "case.read",
    resourceType: "case",
    resourceId: caseFile.id,
    reason: "assigned_case_access"
  });

  return Response.json({ data: caseFile, audit });
}
