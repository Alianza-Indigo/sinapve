import { z } from "zod";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { addCaseTimelineEvent, getCase } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { canReadCase, hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";

const eventSchema = z.object({
  title: z.string().min(3).max(180),
  detail: z.string().min(3).max(4000),
  eventType: z.string().min(2).max(80)
});

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "case:update")) return Response.json({ error: "forbidden" }, { status: 403 });

  const { caseId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_case_event", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const caseFile = await getCase(caseId);
    if (!caseFile) return Response.json({ error: "not_found" }, { status: 404 });
    if (!canReadCase(actor, caseFile)) return Response.json({ error: "forbidden" }, { status: 403 });
    const data = await addCaseTimelineEvent({ caseId, actor, ...parsed.data });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    if (error instanceof Error && error.message === "CASE_NOT_FOUND") return Response.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}
