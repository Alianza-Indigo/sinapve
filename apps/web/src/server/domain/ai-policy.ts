import { z } from "zod";

export const aiClassificationSchema = z.object({
  suggested_categories: z.array(
    z.object({
      code: z.string(),
      confidence: z.number().min(0).max(1),
      reason: z.string()
    })
  ),
  suggested_severity: z.enum(["leve", "moderada", "grave", "critica"]),
  protective_flags: z.array(z.string()),
  recommended_protocol_ids: z.array(z.string()),
  missing_information: z.array(z.string()),
  requires_human_confirmation: z.literal(true),
  prohibited_conclusions: z.array(z.string()).max(0)
});

export function safeAiUnavailableRecommendation() {
  return {
    status: "fallback_humano",
    message: "La asistencia de IA no esta activa. Continua la ruta humana de triaje y protocolo.",
    requiresHumanConfirmation: true
  };
}

export function validateAiClassification(value: unknown) {
  return aiClassificationSchema.safeParse(value);
}
