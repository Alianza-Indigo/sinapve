import { z } from "zod";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { acknowledgeReferral } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ackSchema = z.object({
  externalStatus: z.string().min(2).max(120).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ referralId: string }> }) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "referral:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = ackSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_referral_ack", issues: parsed.error.flatten() }, { status: 400 });

  const { referralId } = await params;
  try {
    const data = await acknowledgeReferral({ referralId, actor, ...parsed.data });
    return Response.json({ data });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    if (error instanceof Error && error.message === "REFERRAL_NOT_FOUND") return Response.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}
