import { randomUUID } from "crypto";
import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { createIntegrationEvent } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";
import { mapDomainError } from "@/server/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EP-10 / 6.9: ingesta de statements xAPI (Experience API) como estándar
// equivalente a SCORM para registrar actividad de formación. El statement se
// almacena como evento de integración idempotente (source "xapi").
const actorSchema = z.object({
  objectType: z.literal("Agent").optional(),
  name: z.string().max(240).optional(),
  mbox: z.string().max(240).optional(),
  account: z.record(z.unknown()).optional()
});
const statementSchema = z.object({
  id: z.string().uuid().optional(),
  actor: actorSchema,
  verb: z.object({ id: z.string().url(), display: z.record(z.string()).optional() }),
  object: z.object({ id: z.string().min(2), objectType: z.string().optional(), definition: z.record(z.unknown()).optional() }),
  result: z.record(z.unknown()).optional(),
  timestamp: z.string().datetime().optional()
});

export async function POST(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "training:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = statementSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_xapi_statement", issues: parsed.error.flatten() }, { status: 400 });

  const statementId = parsed.data.id ?? randomUUID();
  try {
    const data = await createIntegrationEvent({
      idempotencyKey: `xapi:${statementId}`,
      source: "xapi",
      eventType: parsed.data.verb.id,
      payload: { ...parsed.data, id: statementId },
      actor
    });
    return Response.json({ data: { id: statementId, stored: data.id } }, { status: 201 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    throw error;
  }
}
