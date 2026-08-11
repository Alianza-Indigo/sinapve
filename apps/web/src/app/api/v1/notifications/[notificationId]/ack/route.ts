import { getActorFromHeaders } from "@/server/auth/current-actor";
import { acknowledgeNotification } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request, { params }: { params: Promise<{ notificationId: string }> }) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "notification:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const { notificationId } = await params;
  try {
    const data = await acknowledgeNotification({ notificationId, actor });
    return Response.json({ data });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    if (error instanceof Error && error.message === "NOTIFICATION_NOT_FOUND") return Response.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}
