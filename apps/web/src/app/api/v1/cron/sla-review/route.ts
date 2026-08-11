import { sweepOverdueReferrals } from "@/server/data/repository";
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
    // Escalamiento por falta de respuesta externa (6.7). En produccion el
    // fan-out durable pertenece a Vercel Queues/Workflows; este Cron es el
    // disparador periodico que marca referencias vencidas.
    const referrals = await sweepOverdueReferrals({ actor: cronActor });
    return Response.json({
      status: "accepted",
      job: "sla-review",
      referrals,
      note: "Barrido de referencias sin acuse ejecutado. La orquestacion durable pertenece a Vercel Queues/Workflows."
    });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ status: "skipped", job: "sla-review", reason: "database_not_configured" });
    }
    throw error;
  }
}
