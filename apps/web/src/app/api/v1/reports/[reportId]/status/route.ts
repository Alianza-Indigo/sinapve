import { getReportStatus } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  let status;
  try {
    status = await getReportStatus(reportId);
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    throw error;
  }

  if (!status) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json(status);
}
