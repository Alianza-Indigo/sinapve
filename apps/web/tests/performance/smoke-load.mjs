// EP / 15.1: prueba de carga de humo. Lanza N solicitudes concurrentes al
// endpoint publico de indicadores y reporta latencias p50/p95 y errores. No
// requiere base de datos (el endpoint responde agregados con supresion). Uso:
//   BASE_URL=http://127.0.0.1:3100 REQUESTS=200 CONCURRENCY=20 node tests/performance/smoke-load.mjs
const base = process.env.BASE_URL ?? "http://127.0.0.1:3100";
const total = Number(process.env.REQUESTS ?? 200);
const concurrency = Number(process.env.CONCURRENCY ?? 20);
const target = `${base}/api/v1/public/indicators`;

async function worker(count, latencies, errors) {
  for (let i = 0; i < count; i += 1) {
    const start = performance.now();
    try {
      const res = await fetch(target);
      if (!res.ok) errors.push(res.status);
      await res.arrayBuffer();
    } catch (error) {
      errors.push(String(error));
    }
    latencies.push(performance.now() - start);
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

const latencies = [];
const errors = [];
const perWorker = Math.ceil(total / concurrency);
const started = performance.now();
await Promise.all(Array.from({ length: concurrency }, () => worker(perWorker, latencies, errors)));
const wall = performance.now() - started;

latencies.sort((a, b) => a - b);
console.log(
  JSON.stringify(
    {
      target,
      requests: latencies.length,
      concurrency,
      errors: errors.length,
      p50_ms: Math.round(percentile(latencies, 50)),
      p95_ms: Math.round(percentile(latencies, 95)),
      throughput_rps: Math.round((latencies.length / wall) * 1000)
    },
    null,
    2
  )
);
if (errors.length > latencies.length * 0.01) process.exit(1);
