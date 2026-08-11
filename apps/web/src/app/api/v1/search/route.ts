import { getActorFromHeaders } from "@/server/auth/current-actor";
import { listCases, listModuleRecords, listReports } from "@/server/data/repository";
import { canReadCase, canReadModule, canReadReport } from "@/server/domain/access";
import type { PlatformModuleId } from "@/server/domain/types";

const modules: PlatformModuleId[] = [
  "protocols",
  "risk",
  "map",
  "interventions",
  "escalations",
  "institutions",
  "directory",
  "training",
  "community",
  "communications",
  "audit",
  "analytics",
  "informes",
  "privacy",
  "adaptations",
  "configuration",
  "public-portal",
  "notifications",
  "integrations"
];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase();
  if (!q || q.length < 2) return Response.json({ data: [] });

  const [reports, cases, moduleRows] = await Promise.all([
    listReports(),
    listCases(),
    Promise.all(modules.filter((moduleId) => canReadModule(actor, moduleId)).map(async (moduleId) => ({ moduleId, rows: await listModuleRecords(moduleId) })))
  ]);

  const reportHits = reports
    .filter((report) => canReadReport(actor, report))
    .filter((report) => [report.folio, report.schoolName, report.status].some((value) => value.toLowerCase().includes(q)))
    .map((report) => ({ type: "report", id: report.id, title: report.folio, href: `/backoffice/reports` }));

  const caseHits = cases
    .filter((caseFile) => canReadCase(actor, caseFile))
    .filter((caseFile) => [caseFile.folio, caseFile.title, caseFile.state].some((value) => value.toLowerCase().includes(q)))
    .map((caseFile) => ({ type: "case", id: caseFile.id, title: caseFile.folio, href: `/backoffice/cases/${caseFile.id}` }));

  const moduleHits = moduleRows.flatMap(({ moduleId, rows }) =>
    rows
      .filter((row) => [row.id, row.title, row.status, row.owner, row.detail].some((value) => value.toLowerCase().includes(q)))
      .map((row) => ({ type: moduleId, id: row.id, title: row.title, href: `/backoffice/${moduleId}` }))
  );

  return Response.json({ data: [...reportHits, ...caseHits, ...moduleHits].slice(0, 50) });
}
