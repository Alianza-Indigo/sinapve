import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { advanceEmirDispatch } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";
import { mapDomainError } from "@/server/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  toStatus: z.enum(["despachado", "en_sitio", "liberado"]),
  capacitySnapshot: z.record(z.unknown()).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ dispatchId: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "referral:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_dispatch_advance", issues: parsed.error.flatten() }, { status: 400 });

  const { dispatchId } = await params;
  try {
    const data = await advanceEmirDispatch({ dispatchId, ...parsed.data, actor });
    return Response.json({ data });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    throw error;
  }
}
