// EP-09 / 7.5 / 11.2: cliente de IA con abstraccion de proveedor a traves del
// AI Gateway (compatible con la API de chat estilo OpenAI que expone Vercel AI
// Gateway). Sin SDK propietario: se usa fetch. Cuando el gateway no esta
// enlazado, la capa de IA queda desactivada y los flujos humanos continuan.

export class AiNotConfiguredError extends Error {
  constructor() {
    super("SINAPVE_AI_GATEWAY_URL y SINAPVE_AI_GATEWAY_KEY son requeridos para la IA supervisada.");
    this.name = "AiNotConfiguredError";
  }
}

export function isAiConfigured() {
  return Boolean(process.env.SINAPVE_AI_GATEWAY_URL && process.env.SINAPVE_AI_GATEWAY_KEY);
}

export type AiMessage = { role: "system" | "user"; content: string };

// Llama al gateway y devuelve el texto de la respuesta. Interruptor global de
// capacidad: si el modelo/capacidad esta apagado por variable, se comporta como
// no configurado (7.5).
export async function callAiGateway(messages: AiMessage[], options?: { temperature?: number; maxTokens?: number; signal?: AbortSignal }) {
  if (!isAiConfigured()) throw new AiNotConfiguredError();

  const base = process.env.SINAPVE_AI_GATEWAY_URL!.replace(/\/$/, "");
  const model = process.env.SINAPVE_AI_MODEL ?? "gpt-4o-mini";

  const response = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${process.env.SINAPVE_AI_GATEWAY_KEY}`
    },
    body: JSON.stringify({
      model,
      temperature: options?.temperature ?? 0,
      max_tokens: options?.maxTokens ?? 800,
      messages
    }),
    signal: options?.signal
  });

  if (!response.ok) {
    throw new Error(`AI_GATEWAY_ERROR_${response.status}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}
