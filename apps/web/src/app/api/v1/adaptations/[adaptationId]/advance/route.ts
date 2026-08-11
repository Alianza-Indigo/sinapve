import { z } from "zod";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { advanceContextualAdaptation } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";
import { mapDomainError } from "@/server/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z
  .object({
    reviewStatus: z.enum(["tecnica", "juridica", "accesibilidad", "privacidad", "completa"]).optional(),
    approvalStatus: z.enum(["pendiente", "aprobada", "rechazada"]).optional(),
    publicSummary: z.string().max(2000).optional()
  })
  .refine((value) => Object.keys(value).length > 0, { message: "sin_cambios" });

export async function POST(request: Request, { params }: { params: Promise<{ adaptationId: string }> }) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "adaptation:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_adaptation_advance", issues: parsed.error.flatten() }, { status: 400 });

  const { adaptationId } = await params;
  try {
    const data = await advanceContextualAdaptation({ adaptationId, ...parsed.data, actor });
    return Response.json({ data });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    throw error;
  }
}
