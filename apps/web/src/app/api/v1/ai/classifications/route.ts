import { safeAiUnavailableRecommendation, validateAiClassification } from "@/server/domain/ai-policy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (body?.draftRecommendation) {
    const parsed = validateAiClassification(body.draftRecommendation);
    if (!parsed.success) {
      return Response.json({ error: "invalid_ai_output", fallback: safeAiUnavailableRecommendation() }, { status: 422 });
    }

    return Response.json({ recommendation: parsed.data, requiresHumanConfirmation: true });
  }

  return Response.json(safeAiUnavailableRecommendation(), { status: 503 });
}
