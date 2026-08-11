import { z } from "zod";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { createGovernanceRecord } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reportJobSchema = z.object({
  title: z.string().min(3).max(240),
  reportType: z.string().min(2).max(120).default("ejecutivo"),
  scope: z.record(z.unknown()).optional(),
  narrative: z.string().max(8000).optional()
});

export async function POST(request: Request) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "reporting:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = reportJobSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_report_job", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await createGovernanceRecord("informes", {
      title: parsed.data.title,
      reportType: parsed.data.reportType,
      metadata: parsed.data.scope,
      narrative: parsed.data.narrative,
      actor
    });
    return Response.json({ data }, { status: 202 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    throw error;
  }
}
