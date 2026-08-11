import { getReportStatus } from "@/server/data/repository";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const status = await getReportStatus(reportId);

  if (!status) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json(status);
}
