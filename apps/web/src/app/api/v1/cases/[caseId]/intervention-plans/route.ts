import { z } from "zod";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { createInterventionPlan } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";

const planSchema = z.object({
  title: z.string().min(4).max(220),
  goals: z.array(z.record(z.unknown())).optional(),
  adjustments: z.record(z.unknown()).optional(),
  nextReviewAt: z.string().datetime().optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "case:update")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = planSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_intervention_plan", issues: parsed.error.flatten() }, { status: 400 });

  const { caseId } = await params;
  try {
    const data = await createInterventionPlan({ caseId, actor, ...parsed.data });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    if (error instanceof Error && error.message === "CASE_NOT_FOUND") return Response.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}
