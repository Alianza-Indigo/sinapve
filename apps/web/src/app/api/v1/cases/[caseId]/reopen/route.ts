import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { updateCaseState } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";

const reopenSchema = z.object({
  reason: z.string().min(4).max(2000)
});

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "case:update")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = reopenSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_case_reopen", issues: parsed.error.flatten() }, { status: 400 });

  const { caseId } = await params;
  try {
    const data = await updateCaseState({ caseId, actor, state: "reabierto", reason: parsed.data.reason });
    return Response.json({ data });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    if (error instanceof Error && error.message === "CASE_NOT_FOUND") return Response.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}
