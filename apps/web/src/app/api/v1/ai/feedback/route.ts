import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { recordAiFeedback } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const feedbackSchema = z.object({
  resourceType: z.string().min(2).max(120),
  resourceId: z.string().min(2).max(180),
  rating: z.enum(["util", "incorrecta", "riesgosa"]),
  notes: z.string().max(4000).optional()
});

export async function POST(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "case:update") && !hasCapability(actor, "audit:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = feedbackSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_ai_feedback", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await recordAiFeedback({ actor, ...parsed.data });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    throw error;
  }
}
