import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { createAndDispatchNotification } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";
import { DatabaseNotConfiguredError } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  safeSummary: z.string().min(4).max(280),
  priority: z.enum(["informativa", "accion_requerida", "urgente", "critica"]),
  channels: z.array(z.enum(["in_app", "email", "sms", "push", "voice"])).min(1).max(5),
  caseId: z.string().min(2).max(160).optional(),
  userExternalSubject: z.string().min(2).max(200).optional(),
  quietHours: z.object({ start: z.string().optional(), end: z.string().optional() }).optional()
});

export async function POST(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "notification:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_notification", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await createAndDispatchNotification({ ...parsed.data, actor });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    if (error instanceof Error && error.message === "SENSITIVE_DETAIL_IN_NOTIFICATION") {
      return Response.json({ error: "sensitive_detail_in_notification", message: "El resumen no puede incluir datos sensibles." }, { status: 422 });
    }
    throw error;
  }
}
