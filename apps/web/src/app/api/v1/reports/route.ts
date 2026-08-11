import { z } from "zod";
import { buildAuditEvent } from "@/server/audit";
import { createReport, listReports } from "@/server/data/repository";

export const runtime = "nodejs";

const createReportSchema = z.object({
  mode: z.enum(["anonimo", "confidencial", "identificado"]),
  reporterType: z.enum(["estudiante", "familia", "personal", "comunidad"]),
  schoolName: z.string().min(2).max(160),
  safetyNow: z.enum(["segura", "riesgo", "emergencia"]),
  description: z.string().min(12).max(4000)
});

export async function GET() {
  const data = await listReports();
  return Response.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createReportSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "invalid_report", issues: parsed.error.flatten() }, { status: 400 });
  }

  const report = await createReport(parsed.data);
  const audit = buildAuditEvent({
    actorId: "public",
    action: "report.create",
    resourceType: "report",
    resourceId: report.id,
    reason: "public_help_request",
    metadata: { mode: report.mode, safetyNow: report.safetyNow }
  });

  return Response.json(
    {
      id: report.id,
      folio: report.folio,
      status: report.status,
      suggestedSeverity: report.suggestedSeverity,
      audit
    },
    { status: 201 }
  );
}
