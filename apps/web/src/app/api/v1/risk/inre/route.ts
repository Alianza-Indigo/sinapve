import { z } from "zod";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { hasCapability } from "@/server/domain/access";
import { computeInre, defaultInreModel, inreDimensions } from "@/server/domain/inre";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET expone el modelo INRE activo (pesos versionados, propietario, dimensiones).
export async function GET(request: Request) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "analytics:read")) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json({ data: { model: defaultInreModel, dimensions: inreDimensions } });
}

const schema = z.object({
  dimensions: z.record(z.number().min(0).max(100)).optional(),
  conductual: z.number().min(0).max(100).optional(),
  grupal: z.number().min(0).max(100).optional(),
  digital: z.number().min(0).max(100).optional(),
  ambiental: z.number().min(0).max(100).optional(),
  familiar: z.number().min(0).max(100).optional(),
  comunitaria: z.number().min(0).max(100).optional(),
  territorial: z.number().min(0).max(100).optional()
});

// POST calcula el INRE de forma explicable a partir de valores por dimension.
// La revision humana es obligatoria antes de asignar recursos o auditar (7.6).
export async function POST(request: Request) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "analytics:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_inre_input", issues: parsed.error.flatten() }, { status: 400 });

  const { dimensions, ...flat } = parsed.data;
  const input = { ...(dimensions ?? {}), ...flat };
  const result = computeInre(input);
  return Response.json({ data: { ...result, requiresHumanReview: true } });
}
