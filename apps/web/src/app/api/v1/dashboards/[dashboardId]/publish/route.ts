import { getActorFromHeaders } from "@/server/auth/current-actor";
import { publishDashboard } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";
import { mapDomainError } from "@/server/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ dashboardId: string }> }) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "analytics:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const { dashboardId } = await params;
  try {
    const data = await publishDashboard({ dashboardId, actor });
    return Response.json({ data });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    throw error;
  }
}
