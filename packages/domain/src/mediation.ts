// EP-11 / 6.10 / 7.2: la mediacion solo procede en conflictos de bajo riesgo y
// con participacion voluntaria. Debe bloquearse de forma automatica ante
// violencia sexual, coercion, amenazas, autolesiones, delito o asimetria grave.
// La evaluacion es determinista y auditable; nunca "decide culpabilidad", solo
// determina elegibilidad de la via de mediacion.

import type { Severity } from "./types";

export type MediationEvaluationInput = {
  severity: Severity;
  categories?: string[];
  narrative?: string;
  voluntary?: boolean;
  powerAsymmetry?: boolean;
};

export type MediationEvaluation = {
  eligible: boolean;
  blockedReasons: string[];
};

const blockingCategoryPatterns: Array<{ reason: string; test: RegExp }> = [
  { reason: "violencia_sexual", test: /(sexual|abuso|violaci|acoso sexual|tocamiento)/i },
  { reason: "coercion_amenaza", test: /(coacci|coerci|amenaza|extorsi|chantaje)/i },
  { reason: "autolesion_riesgo_vital", test: /(autolesi|suicid|autoinfligid)/i },
  { reason: "delito_o_arma", test: /(arma|delito|narc|trata|secuestro)/i },
  { reason: "violencia_familiar", test: /(violencia familiar|intrafamiliar|maltrato en casa)/i }
];

export function evaluateMediation(input: MediationEvaluationInput): MediationEvaluation {
  const blockedReasons = new Set<string>();

  if (input.severity === "grave" || input.severity === "critica") {
    blockedReasons.add("severidad_grave_o_critica");
  }

  if (input.powerAsymmetry) {
    blockedReasons.add("asimetria_de_poder_grave");
  }

  if (input.voluntary === false) {
    blockedReasons.add("participacion_no_voluntaria");
  }

  const haystack = [input.narrative ?? "", ...(input.categories ?? [])].join(" ");
  for (const pattern of blockingCategoryPatterns) {
    if (pattern.test.test(haystack)) blockedReasons.add(pattern.reason);
  }

  const categories = (input.categories ?? []).map((category) => category.toLowerCase());
  for (const category of categories) {
    for (const pattern of blockingCategoryPatterns) {
      if (pattern.test.test(category)) blockedReasons.add(pattern.reason);
    }
  }

  return {
    eligible: blockedReasons.size === 0,
    blockedReasons: [...blockedReasons]
  };
}
