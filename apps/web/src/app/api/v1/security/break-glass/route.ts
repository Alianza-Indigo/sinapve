import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { createBreakGlassGrant } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const breakGlassSchema = z.object({
  resourceType: z.string().min(2).max(120),
  resourceId: z.string().min(2).max(180),
  reason: z.string().min(12).max(1200),
  durationMinutes: z.number().int().min(5).max(240).optional()
});

export async function POST(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) {
    return Response.json({ error: "unauthorized", message: "Falta identidad institucional en encabezados seguros." }, { status: 401 });
  }
  if (!hasCapability(actor, "case:read") && !hasCapability(actor, "audit:read") && !hasCapability(actor, "privacy:read")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = breakGlassSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_break_glass", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const data = await createBreakGlassGrant({ ...parsed.data, actor });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    throw error;
  }
}
