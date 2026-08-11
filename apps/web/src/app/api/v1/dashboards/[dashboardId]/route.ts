import { getActorFromHeaders } from "@/server/auth/current-actor";
import { listCases, listReports } from "@/server/data/repository";
import { canReadCase, canReadReport, hasCapability } from "@/server/domain/access";
import { buildCertifiedWidgets, reportConversionRate } from "@/server/domain/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ dashboardId: string }> }) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) {
    return Response.json({ error: "unauthorized", message: "Falta identidad institucional en encabezados seguros." }, { status: 401 });
  }

  if (!hasCapability(actor, "analytics:read")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { dashboardId } = await params;
  const [allReports, allCases] = await Promise.all([listReports(), listCases()]);
  const reports = allReports.filter((report) => canReadReport(actor, report));
  const cases = allCases.filter((caseFile) => canReadCase(actor, caseFile));

  return Response.json({
    dashboardId,
    metricVersion: 1,
    generatedAt: new Date().toISOString(),
    filtersApplied: { state: actor.scope.stateCode, organizationId: actor.scope.organizationId },
    summary: { reports: reports.length, cases: cases.length, conversionRate: reportConversionRate(reports, cases) },
    widgets: buildCertifiedWidgets(reports, cases)
  });
}
