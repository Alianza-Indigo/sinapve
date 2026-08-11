import { z } from "zod";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { answerProtocolQuestion, createApprovedDocument } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";
import { mapDomainError } from "@/server/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({ question: z.string().min(6).max(2000) });

const documentSchema = z.object({
  action: z.literal("add_document"),
  docType: z.string().min(2).max(80),
  title: z.string().min(3).max(240),
  sourceRef: z.string().min(2).max(240),
  body: z.string().min(20).max(20000),
  keywords: z.string().max(1000).optional(),
  version: z.number().int().min(1).max(999).optional()
});

export async function POST(request: Request) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "protocol:run") && !hasCapability(actor, "case:read")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);

  try {
    // Alta de documento aprobado en el corpus (requiere operar protocolos).
    if (body && typeof body === "object" && (body as { action?: string }).action === "add_document") {
      if (!hasCapability(actor, "protocol:run")) return Response.json({ error: "forbidden" }, { status: 403 });
      const parsedDoc = documentSchema.safeParse(body);
      if (!parsedDoc.success) return Response.json({ error: "invalid_document", issues: parsedDoc.error.flatten() }, { status: 400 });
      const { action: _action, ...doc } = parsedDoc.data;
      const data = await createApprovedDocument({ ...doc, actor });
      return Response.json({ data }, { status: 201 });
    }

    const parsed = querySchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: "invalid_question", issues: parsed.error.flatten() }, { status: 400 });
    const data = await answerProtocolQuestion({ question: parsed.data.question, actor });
    return Response.json({ data });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    throw error;
  }
}
