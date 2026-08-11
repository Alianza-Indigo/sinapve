import { resolveActor } from "@/server/auth/session-actor";
import { getGeneratedReportForRender } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";
import { DatabaseNotConfiguredError } from "@/server/db";
import { renderReportPdf } from "@/server/reports/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EP-14: render PDF del informe. La narrativa deriva de metricas certificadas;
// los borradores llevan marca de agua.
export async function GET(request: Request, { params }: { params: Promise<{ reportId: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "reporting:read")) return Response.json({ error: "forbidden" }, { status: 403 });

  const { reportId } = await params;
  try {
    const report = await getGeneratedReportForRender(reportId);
    if (!report) return Response.json({ error: "not_found" }, { status: 404 });
    const pdf = await renderReportPdf(report);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="informe-${reportId}.pdf"`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store"
      }
    });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    throw error;
  }
}
