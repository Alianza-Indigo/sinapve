import { enqueueJob } from "../data/jobs";

// EP-04/06 / 11.6: adaptador de orquestacion durable. El almacen de verdad es el
// outbox en PostgreSQL (idempotente, at-least-once). Cuando hay una cola nativa
// enlazada (Vercel Queues) se publica ademas un aviso para drenar de inmediato;
// sin ella, el drenaje periodico corre desde el Cron. Migrar a Vercel
// Queues/Workflows es cambiar el transporte, no la logica.

export function isNativeQueueConfigured() {
  return Boolean(process.env.SINAPVE_QUEUE_PUBLISH_URL);
}

async function publishToNativeQueue(job: { jobType: string; idempotencyKey: string; payload?: Record<string, unknown>; runAt?: Date }) {
  const url = process.env.SINAPVE_QUEUE_PUBLISH_URL;
  if (!url) return { published: false, reason: "native_queue_not_configured" as const };
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(process.env.SINAPVE_QUEUE_TOKEN ? { authorization: `Bearer ${process.env.SINAPVE_QUEUE_TOKEN}` } : {})
      },
      body: JSON.stringify({
        jobType: job.jobType,
        idempotencyKey: job.idempotencyKey,
        payload: job.payload ?? {},
        runAt: job.runAt?.toISOString()
      })
    });
    return { published: response.ok, reason: response.ok ? ("published" as const) : ("native_queue_error" as const) };
  } catch {
    return { published: false, reason: "native_queue_error" as const };
  }
}

// Encola de forma durable: persiste en el outbox y, si hay cola nativa, publica
// el aviso de drenaje. Devuelve el resultado del outbox (fuente de verdad).
export async function enqueueDurable(input: {
  jobType: string;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  runAt?: Date;
  maxAttempts?: number;
}) {
  const outbox = await enqueueJob(input);
  if (!outbox.deduplicated && isNativeQueueConfigured()) {
    await publishToNativeQueue(input);
  }
  return outbox;
}
