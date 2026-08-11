import { resolveActor } from "@/server/auth/session-actor";
import { listCases, listReports } from "@/server/data/repository";
import { canReadCase, canReadReport, hasCapability } from "@/server/domain/access";
import { buildCertifiedWidgets } from "@/server/domain/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ metricCode: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "analytics:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const { metricCode } = await params;
  const [allReports, allCases] = await Promise.all([listReports(), listCases()]);
  const reports = allReports.filter((report) => canReadReport(actor, report));
  const cases = allCases.filter((caseFile) => canReadCase(actor, caseFile));
  const widget = buildCertifiedWidgets(reports, cases).find((item) => item.id === metricCode || item.metricCodes.includes(metricCode));

  if (!widget) return Response.json({ error: "not_found" }, { status: 404 });
  return Response.json({ data: widget });
}
