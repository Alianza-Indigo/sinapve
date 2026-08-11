import { z } from "zod";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { migrateProtocolRun } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";
import { mapDomainError } from "@/server/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  toProtocolCode: z.string().min(2).max(120),
  reason: z.string().min(8).max(1000)
});

export async function POST(request: Request, { params }: { params: Promise<{ runId: string }> }) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "protocol:run")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_migration", issues: parsed.error.flatten() }, { status: 400 });

  const { runId } = await params;
  try {
    const data = await migrateProtocolRun({ runId, ...parsed.data, actor });
    return Response.json({ data });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    throw error;
  }
}
