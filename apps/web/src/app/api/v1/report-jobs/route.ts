import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { createGovernanceRecord, generateReportDraft } from "@/server/data/repository";
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
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "reporting:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = reportJobSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_report_job", issues: parsed.error.flatten() }, { status: 400 });

  try {
    // Sin narrativa explicita se autogenera un borrador desde metricas
    // certificadas (8.5); con narrativa se registra el informe tal cual. En
    // ambos casos la publicacion exige aprobacion humana posterior.
    const data = parsed.data.narrative
      ? await createGovernanceRecord("informes", {
          title: parsed.data.title,
          reportType: parsed.data.reportType,
          metadata: parsed.data.scope,
          narrative: parsed.data.narrative,
          actor
        })
      : await generateReportDraft({
          title: parsed.data.title,
          reportType: parsed.data.reportType,
          scope: parsed.data.scope,
          actor
        });
    return Response.json({ data }, { status: 202 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    throw error;
  }
}
