import { processDueJobs } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EP-04/06 / 11.6: endpoint de drenaje de la cola durable. Lo invocan el Cron o
// un consumidor de Vercel Queues/Workflows. Protegido por CRON_SECRET. Los
// handlers son idempotentes, por lo que reintentos y entregas repetidas son
// seguros.
export async function POST(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const received = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!configuredSecret) return Response.json({ error: "cron_secret_not_configured" }, { status: 503 });
  if (received !== configuredSecret) return Response.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? "25"), 1), 100);

  try {
    const result = await processDueJobs({ limit });
    return Response.json({ status: "accepted", job: "queue-drain", result });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ status: "skipped", reason: "database_not_configured" });
    }
    throw error;
  }
}
