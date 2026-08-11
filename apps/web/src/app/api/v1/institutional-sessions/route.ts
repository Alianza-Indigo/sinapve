import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { createInstitutionalSession } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";
import { mapDomainError } from "@/server/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  bodyPublicId: z.string().min(2).max(120),
  scheduledAt: z.string().datetime(),
  agenda: z.array(z.record(z.unknown())).max(100).optional()
});

export async function POST(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "institution:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_session", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await createInstitutionalSession({ ...parsed.data, actor });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    throw error;
  }
}
