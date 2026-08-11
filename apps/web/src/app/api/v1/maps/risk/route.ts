import { resolveActor } from "@/server/auth/session-actor";
import { listCases, listReports } from "@/server/data/repository";
import { canReadCase, canReadReport, hasCapability } from "@/server/domain/access";
import { buildCertifiedWidgets } from "@/server/domain/metrics";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "analytics:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const [allReports, allCases] = await Promise.all([listReports(), listCases()]);
  const reports = allReports.filter((report) => canReadReport(actor, report));
  const cases = allCases.filter((caseFile) => canReadCase(actor, caseFile));
  const risk = buildCertifiedWidgets(reports, cases).find((item) => item.id === "G10_TERRITORIAL_RISK");

  return Response.json({ data: risk ?? null });
}
