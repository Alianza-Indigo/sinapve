import { resolveActor } from "@/server/auth/session-actor";
import { getRealtimeCounts } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EP / 11.6: canal de tiempo real por SSE (streaming). El cliente (EventSource)
// reconecta automáticamente y, en cada (re)conexión, recibe un snapshot que
// recarga el estado. Transporte desacoplado: un WebSocket puede respaldar este
// mismo contrato de eventos sin cambiar el cliente. Solo cifras agregadas.
export async function GET(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "notification:read") && !hasCapability(actor, "analytics:read")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let last = "";
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      const push = async (event: "snapshot" | "update") => {
        if (closed) return;
        try {
          const counts = await getRealtimeCounts();
          const serialized = JSON.stringify(counts);
          if (event === "snapshot" || serialized !== last) {
            last = serialized;
            send(event, { ...counts, at: new Date().toISOString() });
          }
        } catch {
          /* no romper el stream por un error transitorio */
        }
      };

      // Recarga de estado inmediata al conectar.
      void push("snapshot");
      const poll = setInterval(() => void push("update"), 10_000);
      const ping = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": ping\n\n"));
      }, 25_000);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(poll);
        clearInterval(ping);
        try {
          controller.close();
        } catch {
          /* ya cerrado */
        }
      };
      request.signal.addEventListener("abort", close);
    },
    cancel() {
      closed = true;
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no"
    }
  });
}
