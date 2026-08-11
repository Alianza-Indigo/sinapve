import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { deactivateUser } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";
import { mapDomainError } from "@/server/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ reason: z.string().min(4).max(1000) });

export async function POST(request: Request, { params }: { params: Promise<{ externalSubject: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  // Administracion de identidad institucional.
  if (!hasCapability(actor, "technical:operate") && !hasCapability(actor, "configuration:read")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_deactivation", issues: parsed.error.flatten() }, { status: 400 });

  const { externalSubject } = await params;
  try {
    const data = await deactivateUser({ externalSubject, reason: parsed.data.reason, actor });
    return Response.json({ data });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    throw error;
  }
}
