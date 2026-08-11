import { describe, expect, it } from "vitest";
import { safeAiUnavailableRecommendation, validateAiClassification } from "./ai-policy";

describe("AI policy", () => {
  it("requires human confirmation for valid structured output", () => {
    const parsed = validateAiClassification({
      suggested_categories: [{ code: "VIOLENCE_DIGITAL", confidence: 0.86, reason: "relato menciona amenazas digitales" }],
      suggested_severity: "grave",
      protective_flags: ["possible_immediate_risk"],
      recommended_protocol_ids: ["protocol_cyber_v3"],
      missing_information: ["current_safety_status"],
      requires_human_confirmation: true,
      prohibited_conclusions: []
    });

    expect(parsed.success).toBe(true);
  });

  it("falls back to human route when AI is unavailable", () => {
    expect(safeAiUnavailableRecommendation().status).toBe("fallback_humano");
  });
});
