import { buildAuditEvent } from "@/server/audit";
import { demoActor } from "@/server/data/demo";
import { getCase } from "@/server/data/repository";
import { canReadCase } from "@/server/domain/access";
import { createProtocolRun } from "@/server/domain/protocols";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const caseFile = await getCase(caseId);

  if (!caseFile) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (!canReadCase(demoActor, caseFile)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const run = createProtocolRun(caseFile.id, caseFile.severity);
  const audit = buildAuditEvent({
    actorId: demoActor.id,
    action: "protocol_run.start",
    resourceType: "case",
    resourceId: caseFile.id,
    reason: "human_confirmed_protocol"
  });

  return Response.json({ run, audit, workflow: { status: "pending_vercel_workflow_binding" } }, { status: 202 });
}
