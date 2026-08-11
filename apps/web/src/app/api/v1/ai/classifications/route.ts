import { z } from "zod";
import { safeAiUnavailableRecommendation, validateAiClassification } from "@/server/domain/ai-policy";
import { classifyReportDraft } from "@/server/ai/classify";
import { isAiConfigured } from "@/server/ai/gateway";

export const runtime = "nodejs";

const liveSchema = z.object({
  description: z.string().min(12).max(4000),
  safetyNow: z.string().min(2).max(40)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  // Modo 1: validar un borrador provisto externamente contra el JSON Schema.
  if (body?.draftRecommendation) {
    const parsed = validateAiClassification(body.draftRecommendation);
    if (!parsed.success) {
      return Response.json({ error: "invalid_ai_output", fallback: safeAiUnavailableRecommendation() }, { status: 422 });
    }

    return Response.json({ recommendation: parsed.data, requiresHumanConfirmation: true });
  }

  // Modo 2: clasificacion asistida en vivo por el AI Gateway (cuando esta
  // enlazado). La salida se valida contra el JSON Schema; si no valida o la IA
  // esta apagada, se cae al fallback humano seguro. La IA nunca decide.
  const parsed = liveSchema.safeParse(body);
  if (parsed.success && isAiConfigured()) {
    const draft = await classifyReportDraft(parsed.data);
    if (draft) {
      return Response.json({ recommendation: draft, requiresHumanConfirmation: true, source: "ai_gateway" });
    }
  }

  return Response.json(safeAiUnavailableRecommendation(), { status: 503 });
}
