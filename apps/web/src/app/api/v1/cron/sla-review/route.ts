import { processDueJobs, sweepOverdueReferrals } from "@/server/data/repository";
import { countJobsByStatus } from "@/server/data/jobs";
import { DatabaseNotConfiguredError } from "@/server/db";
import type { Actor } from "@/server/domain/types";

export const runtime = "nodejs";

// Actor de sistema para la auditoria del barrido programado. No tiene alcance
// sobre expedientes: solo dispara transiciones de circuito cerrado.
const cronActor: Actor = { id: "system:cron:sla-review", name: "Cron SLA Review", roles: [], scope: {} };

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const receivedSecret = request.headers.get("authorization")?.replace("Bearer ", "");

  if (!configuredSecret) {
    return Response.json({ error: "cron_secret_not_configured" }, { status: 503 });
  }

  if (receivedSecret !== configuredSecret) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    // 1) Drena la cola durable (recordatorios de SLA, vencimientos de acuse).
    //    Los consumidores son idempotentes. En produccion este drenaje tambien
    //    puede dispararse desde Vercel Queues/Workflows; el almacen es PostgreSQL
    //    para no depender de estado en memoria entre invocaciones.
    const jobs = await processDueJobs({});
    // 2) Barrido de respaldo: escala referencias vencidas que no tuvieran
    //    trabajo durable asociado (6.7).
    const referrals = await sweepOverdueReferrals({ actor: cronActor });
    const queue = await countJobsByStatus();
    return Response.json({
      status: "accepted",
      job: "sla-review",
      jobs,
      referrals,
      queue,
      note: "Cola durable drenada y referencias sin acuse revisadas."
    });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ status: "skipped", job: "sla-review", reason: "database_not_configured" });
    }
    throw error;
  }
}
