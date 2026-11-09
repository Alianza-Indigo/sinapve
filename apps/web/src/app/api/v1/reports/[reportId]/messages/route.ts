import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { createReportMessage, getReportAccessRecord } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { canReadReport, hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const messageSchema = z.object({
  senderType: z.enum(["reporter", "institution"]).default("reporter"),
  body: z.string().min(2).max(4000),
  followUpToken: z.string().min(32).max(160).optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const body = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_report_message", issues: parsed.error.flatten() }, { status: 400 });

  const actor = await resolveActor(request.headers);
  const { reportId } = await params;

  if (parsed.data.senderType === "institution") {
    if (!actor || !hasCapability(actor, "report:read")) return Response.json({ error: "unauthorized" }, { status: 401 });
    const report = await getReportAccessRecord(reportId);
    if (!report) return Response.json({ error: "not_found" }, { status: 404 });
    if (!canReadReport(actor, report)) return Response.json({ error: "forbidden" }, { status: 403 });
  } else if (!parsed.data.followUpToken) {
    return Response.json({ error: "follow_up_token_required" }, { status: 403 });
  }

  try {
    const data = await createReportMessage({ reportId, actor: actor ?? undefined, ...parsed.data });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    if (error instanceof Error && error.message === "REPORT_NOT_FOUND") return Response.json({ error: "not_found" }, { status: 404 });
    if (error instanceof Error && error.message === "REPORT_ACCESS_DENIED") return Response.json({ error: "forbidden" }, { status: 403 });
    throw error;
  }
}
