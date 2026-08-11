import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { recordInstitutionalSessionOutcome } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";
import { mapDomainError } from "@/server/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  presentMembers: z.number().int().min(0).max(1000),
  agreements: z.array(z.record(z.unknown())).max(200).optional(),
  tasks: z.array(z.record(z.unknown())).max(200).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "institution:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_session_outcome", issues: parsed.error.flatten() }, { status: 400 });

  const { sessionId } = await params;
  try {
    const data = await recordInstitutionalSessionOutcome({ sessionId, ...parsed.data, actor });
    return Response.json({ data });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    throw error;
  }
}
