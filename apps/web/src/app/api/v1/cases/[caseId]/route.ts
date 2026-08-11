import { buildAuditEvent } from "@/server/audit";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { getCase, updateCaseState } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { canReadCase, hasCapability } from "@/server/domain/access";
import { z } from "zod";

export const runtime = "nodejs";

const updateCaseSchema = z.object({
  state: z.enum(["nuevo", "en_triaje", "activo", "escalado", "en_seguimiento", "listo_para_cierre", "cerrado", "reabierto"]),
  protectionSummary: z.string().max(4000).optional(),
  reason: z.string().min(4).max(2000)
});

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

export async function PATCH(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized", message: "Falta identidad institucional en encabezados seguros." }, { status: 401 });
  if (!hasCapability(actor, "case:update")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = updateCaseSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_case_update", issues: parsed.error.flatten() }, { status: 400 });

  const { caseId } = await params;
  try {
    const data = await updateCaseState({ caseId, actor, ...parsed.data });
    return Response.json({ data });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    if (error instanceof Error && error.message === "CASE_NOT_FOUND") return Response.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}
