import { z } from "zod";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { issueCertification } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";
import { mapDomainError } from "@/server/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  validityMonths: z.number().int().min(1).max(60).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ enrollmentId: string }> }) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "training:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_certification", issues: parsed.error.flatten() }, { status: 400 });

  const { enrollmentId } = await params;
  try {
    const data = await issueCertification({ enrollmentId, ...parsed.data, actor });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    throw error;
  }
}
