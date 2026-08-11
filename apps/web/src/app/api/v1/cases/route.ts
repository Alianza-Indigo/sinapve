import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { createCaseFromReport } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";

const createCaseSchema = z.object({
  reportId: z.string().min(2),
  title: z.string().min(4).max(240),
  slaMinutes: z.number().int().min(5).max(10_080),
  protectionSummary: z.string().max(4000).optional()
});

export async function POST(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "case:update")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = createCaseSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_case", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await createCaseFromReport({ ...parsed.data, actor });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    if (error instanceof Error && error.message === "REPORT_NOT_FOUND") return Response.json({ error: "report_not_found" }, { status: 404 });
    throw error;
  }
}
