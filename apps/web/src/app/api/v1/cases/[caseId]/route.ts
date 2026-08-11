import { buildAuditEvent } from "@/server/audit";
import { demoActor } from "@/server/data/demo";
import { getCase } from "@/server/data/repository";
import { canReadCase } from "@/server/domain/access";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const caseFile = await getCase(caseId);

  if (!caseFile) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (!canReadCase(demoActor, caseFile)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const audit = buildAuditEvent({
    actorId: demoActor.id,
    action: "case.read",
    resourceType: "case",
    resourceId: caseFile.id,
    reason: "assigned_case_access"
  });

  return Response.json({ data: caseFile, audit });
}
