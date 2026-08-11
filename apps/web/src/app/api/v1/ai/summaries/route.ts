import { z } from "zod";
import { safeAiUnavailableRecommendation } from "@/server/domain/ai-policy";

export const runtime = "nodejs";

const summarySchema = z.object({
  sourceText: z.string().min(20).max(12000),
  maxCharacters: z.number().int().min(120).max(1200).default(600)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = summarySchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_summary_request", issues: parsed.error.flatten() }, { status: 400 });

  const clean = parsed.data.sourceText.replace(/\s+/g, " ").trim();
  const draftSummary = clean.length > parsed.data.maxCharacters ? `${clean.slice(0, parsed.data.maxCharacters - 3)}...` : clean;

  return Response.json({
    draftSummary,
    requiresHumanConfirmation: true,
    policy: safeAiUnavailableRecommendation()
  });
}
