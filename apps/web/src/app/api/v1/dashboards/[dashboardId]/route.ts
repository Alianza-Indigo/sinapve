import { cases, reports } from "@/server/data/demo";
import { buildCertifiedWidgets } from "@/server/domain/metrics";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ dashboardId: string }> }) {
  const { dashboardId } = await params;

  return Response.json({
    dashboardId,
    metricVersion: 1,
    generatedAt: "2026-08-10T18:30:00Z",
    filtersApplied: { state: "CHH", scope: "school" },
    widgets: buildCertifiedWidgets(reports, cases)
  });
}
