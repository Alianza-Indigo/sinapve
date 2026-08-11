import { z } from "zod";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { assignCase, getCase } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { canReadCase, hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const assignmentSchema = z.object({
  assigneeExternalSubject: z.string().min(2).max(180),
  role: z.string().min(2).max(80).optional(),
  reason: z.string().min(4).max(2000)
});

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "case:update")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = assignmentSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_assignment", issues: parsed.error.flatten() }, { status: 400 });

  const { caseId } = await params;
  try {
    const caseFile = await getCase(caseId);
    if (!caseFile) return Response.json({ error: "not_found" }, { status: 404 });
    if (!canReadCase(actor, caseFile)) return Response.json({ error: "forbidden" }, { status: 403 });
    const data = await assignCase({ caseId, actor, ...parsed.data });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    if (error instanceof Error && error.message === "CASE_NOT_FOUND") return Response.json({ error: "not_found" }, { status: 404 });
    if (error instanceof Error && error.message === "USER_NOT_FOUND") return Response.json({ error: "user_not_found" }, { status: 422 });
    throw error;
  }
}
