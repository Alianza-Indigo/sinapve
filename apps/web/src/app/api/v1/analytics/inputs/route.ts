import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { createAnalyticsInput } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";
import { mapDomainError } from "@/server/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EP-13: captura de insumos analiticos que alimentan las graficas certificadas
// (INRE, encuestas, matricula, permanencia, impacto, presupuesto). Datos reales.
const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("risk_score"),
    organizationPublicId: z.string().min(2).max(120).optional(),
    modelVersion: z.number().int().min(1).max(999).optional(),
    score: z.number().min(0).max(100),
    quality: z.number().int().min(0).max(100).optional(),
    factors: z.record(z.object({ value: z.number(), contribution: z.number() })).optional()
  }),
  z.object({
    kind: z.literal("survey"),
    surveyType: z.enum(["ipse", "nps"]),
    score: z.number().int().min(-100).max(100),
    period: z.string().min(4).max(20),
    organizationPublicId: z.string().min(2).max(120).optional(),
    population: z.string().max(120).optional()
  }),
  z.object({ kind: z.literal("enrollment"), organizationPublicId: z.string().min(2).max(120).optional(), period: z.string().min(4).max(20), students: z.number().int().min(0).max(10_000_000) }),
  z.object({ kind: z.literal("retention"), organizationPublicId: z.string().min(2).max(120).optional(), cohortPeriod: z.string().min(4).max(20), continued: z.number().int().min(0), total: z.number().int().min(1) }),
  z.object({ kind: z.literal("impact"), indicator: z.string().min(2).max(120), groupType: z.enum(["tratamiento", "comparacion"]), phase: z.enum(["antes", "despues"]), period: z.string().min(4).max(20), value: z.number() }),
  z.object({ kind: z.literal("budget"), period: z.string().min(4).max(20), component: z.string().min(2).max(120), level: z.string().min(2).max(80), devengado: z.number().min(0), ejercido: z.number().min(0), meta: z.number().min(0) })
]);

export async function POST(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "analytics:read") && !hasCapability(actor, "reporting:read")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_analytics_input", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await createAnalyticsInput({ ...parsed.data, actor });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    throw error;
  }
}
