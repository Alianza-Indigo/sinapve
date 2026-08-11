import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { completeProtocolStep, ProtocolBranchError } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const completeStepSchema = z.object({
  status: z.enum(["completado", "bloqueado"]).default("completado"),
  chosenNext: z.string().min(1).max(60).optional(),
  evidencePathname: z.string().min(2).max(500).optional(),
  notes: z.string().max(4000).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ runId: string; stepId: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "protocol:run")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = completeStepSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_protocol_step", issues: parsed.error.flatten() }, { status: 400 });

  const { runId, stepId } = await params;
  try {
    const data = await completeProtocolStep({ runId, stepId, actor, ...parsed.data });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    if (error instanceof ProtocolBranchError) return Response.json({ error: "branch_required", message: error.message }, { status: 400 });
    if (error instanceof Error && error.message === "PROTOCOL_RUN_NOT_FOUND") return Response.json({ error: "not_found" }, { status: 404 });
    throw error;
  }
}
