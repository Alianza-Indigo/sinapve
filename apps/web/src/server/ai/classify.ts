// EP-09 / 7.1 / 7.4: clasificacion asistida. Entra un relato desidentificado y
// sale una categoria/severidad SUGERIDA con razones, validada contra el JSON
// Schema. Si la IA no esta activa o la salida no valida, se devuelve null y el
// llamador aplica el fallback humano. La IA nunca decide: requires_human.

import { callAiGateway, isAiConfigured } from "./gateway";
import { validateAiClassification } from "../domain/ai-policy";

const systemPrompt = [
  "Eres un asistente de triaje de convivencia escolar del SINAPVE.",
  "Nunca determinas culpabilidad, sanciones ni diagnosticos.",
  "Devuelves EXCLUSIVAMENTE un objeto JSON valido con esta forma:",
  '{"suggested_categories":[{"code":string,"confidence":number,"reason":string}],',
  '"suggested_severity":"leve"|"moderada"|"grave"|"critica","protective_flags":string[],',
  '"recommended_protocol_ids":string[],"missing_information":string[],',
  '"requires_human_confirmation":true,"prohibited_conclusions":[]}',
  "requires_human_confirmation siempre es true y prohibited_conclusions siempre vacio."
].join(" ");

function extractJson(text: string): unknown {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

// Devuelve una recomendacion validada o null (para que el llamador use el
// fallback humano seguro). El texto se trata como desidentificado por politica
// de entrada; no se envian identificadores directos.
export async function classifyReportDraft(input: { description: string; safetyNow: string }) {
  if (!isAiConfigured()) return null;

  let raw: string;
  try {
    raw = await callAiGateway([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Situacion de seguridad declarada: ${input.safetyNow}. Relato desidentificado: ${input.description}`
      }
    ]);
  } catch {
    return null;
  }

  const parsed = validateAiClassification(extractJson(raw));
  return parsed.success ? parsed.data : null;
}
