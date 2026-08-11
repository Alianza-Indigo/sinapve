import { z } from "zod";
import { buildAuditEvent } from "@/server/audit";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { createReport, listReports } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { canReadReport } from "@/server/domain/access";

export const runtime = "nodejs";

const createReportSchema = z.object({
  mode: z.enum(["anonimo", "confidencial", "identificado"]),
  reporterType: z.enum(["estudiante", "familia", "personal", "comunidad"]),
  organizationPublicId: z.string().min(2).max(120),
  schoolName: z.string().min(2).max(160),
  safetyNow: z.enum(["segura", "riesgo", "emergencia"]),
  description: z.string().min(12).max(4000)
});

export async function GET(request: Request) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) {
    return Response.json({ error: "unauthorized", message: "Falta identidad institucional en encabezados seguros." }, { status: 401 });
  }

  const reports = await listReports();
  const data = reports.filter((report) => canReadReport(actor, report));
  return Response.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = createReportSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json({ error: "invalid_report", issues: parsed.error.flatten() }, { status: 400 });
  }

  let report;
  try {
    report = await createReport(parsed.data);
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }

    if (error instanceof Error && error.message === "ORGANIZATION_NOT_FOUND") {
      return Response.json({ error: "organization_not_found", message: "El plantel no existe en el catalogo territorial de la base vinculada." }, { status: 422 });
    }

    throw error;
  }
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
