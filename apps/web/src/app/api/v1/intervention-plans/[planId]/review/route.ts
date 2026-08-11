import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { reviewInterventionPlan } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";
import { mapDomainError } from "@/server/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  outcome: z.string().min(4).max(4000),
  status: z.string().min(2).max(80).optional(),
  nextReviewAt: z.string().datetime().optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ planId: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "case:update")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_review", issues: parsed.error.flatten() }, { status: 400 });

  const { planId } = await params;
  try {
    const data = await reviewInterventionPlan({ planId, ...parsed.data, actor });
    return Response.json({ data });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    throw error;
  }
}
