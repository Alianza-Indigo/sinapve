import { nanoid } from "nanoid";
import { and, asc, eq, lte, sql } from "drizzle-orm";
import { getDb, isDatabaseConfigured, DatabaseNotConfiguredError } from "../db";
import { durableJobs } from "../db/schema";

// EP-04/06 / 11.6: primitivas de la cola durable (patron outbox). Entrega al
// menos una vez; los consumidores deben ser idempotentes. La idempotencyKey
// evita duplicar un trabajo logico. Portable a Vercel Queues/Workflows: aqui el
// almacen es PostgreSQL para no depender del estado en memoria entre
// invocaciones serverless.

export type DurableJobRow = {
  id: string;
  publicId: string;
  jobType: string;
  attempts: number;
  maxAttempts: number;
  payload: Record<string, unknown>;
};

// Encola un trabajo. Si ya existe la idempotencyKey, no crea duplicado.
export async function enqueueJob(input: {
  jobType: string;
  idempotencyKey: string;
  payload?: Record<string, unknown>;
  runAt?: Date;
  maxAttempts?: number;
}) {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const [row] = await db
    .insert(durableJobs)
    .values({
      publicId: `job_${nanoid(12)}`,
      jobType: input.jobType,
      idempotencyKey: input.idempotencyKey,
      payload: input.payload ?? {},
      runAt: input.runAt ?? new Date(),
      maxAttempts: input.maxAttempts ?? 5
    })
    .onConflictDoNothing({ target: durableJobs.idempotencyKey })
    .returning({ publicId: durableJobs.publicId });
  return { id: row?.publicId ?? null, deduplicated: !row };
}

// Reclama trabajos vencidos marcandolos como en_proceso (lease). En serverless
// una sola invocacion drena; el lease evita doble procesamiento concurrente.
export async function claimDueJobs(now: Date, limit = 25): Promise<DurableJobRow[]> {
  if (!isDatabaseConfigured()) throw new DatabaseNotConfiguredError();
  const db = getDb();
  const due = await db
    .select({
      id: durableJobs.id,
      publicId: durableJobs.publicId,
      jobType: durableJobs.jobType,
      attempts: durableJobs.attempts,
      maxAttempts: durableJobs.maxAttempts,
      payload: durableJobs.payload
    })
    .from(durableJobs)
    .where(and(eq(durableJobs.status, "pendiente"), lte(durableJobs.runAt, now)))
    .orderBy(asc(durableJobs.runAt))
    .limit(limit);

  const claimed: DurableJobRow[] = [];
  for (const job of due) {
    const [locked] = await db
      .update(durableJobs)
      .set({ status: "en_proceso", lockedAt: now, attempts: job.attempts + 1 })
      .where(and(eq(durableJobs.id, job.id), eq(durableJobs.status, "pendiente")))
      .returning({ id: durableJobs.id });
    if (locked) claimed.push(job);
  }
  return claimed;
}

export async function completeJob(jobId: string) {
  const db = getDb();
  await db.update(durableJobs).set({ status: "completado", completedAt: new Date() }).where(eq(durableJobs.id, jobId));
}

// Falla un intento: reprograma con backoff exponencial hasta agotar reintentos;
// entonces marca fallido para revision (no se pierde el trabajo).
export async function failJob(job: DurableJobRow, error: string, now = new Date()) {
  const db = getDb();
  if (job.attempts >= job.maxAttempts) {
    await db.update(durableJobs).set({ status: "fallido", lastError: error }).where(eq(durableJobs.id, job.id));
    return { status: "fallido" as const };
  }
  const backoffMs = Math.min(60 * 60_000, 2 ** job.attempts * 60_000);
  await db
    .update(durableJobs)
    .set({ status: "pendiente", lastError: error, runAt: new Date(now.getTime() + backoffMs), lockedAt: null })
    .where(eq(durableJobs.id, job.id));
  return { status: "reprogramado" as const, retryAt: new Date(now.getTime() + backoffMs) };
}

export async function countJobsByStatus() {
  if (!isDatabaseConfigured()) return {} as Record<string, number>;
  const db = getDb();
  const rows = await db
    .select({ status: durableJobs.status, count: sql<number>`count(*)::int` })
    .from(durableJobs)
    .groupBy(durableJobs.status);
  return Object.fromEntries(rows.map((row) => [row.status, row.count]));
}
