import type { ProtocolRun, Severity } from "./types";

const baseSteps = [
  { id: "safety", title: "Confirmar seguridad inmediata", dueMinute: 5, requiredEvidence: true },
  { id: "notify-direction", title: "Notificar direccion y responsable APVE", dueMinute: 10, requiredEvidence: true },
  { id: "safe-contact", title: "Definir contacto seguro con familia o tutor", dueMinute: 15, requiredEvidence: false },
  { id: "open-case", title: "Abrir expediente y preservar registros", dueMinute: 20, requiredEvidence: true },
  { id: "decision", title: "Documentar decision, responsable y escalamiento", dueMinute: 30, requiredEvidence: true }
] as const;

export function suggestSeverity(description: string, safetyNow: string): Severity {
  const normalized = description.toLowerCase();
  if (safetyNow === "emergencia" || normalized.includes("arma") || normalized.includes("amenaza")) return "critica";
  if (safetyNow === "riesgo" || normalized.includes("sexual") || normalized.includes("coaccion")) return "grave";
  if (normalized.includes("repetido") || normalized.includes("digital")) return "moderada";
  return "leve";
}

export function createProtocolRun(caseId: string, severity: Severity): ProtocolRun {
  return {
    id: `prun_${caseId}`,
    caseId,
    protocolCode: severity === "critica" ? "critical_response_v1" : "school_protection_v1",
    version: 1,
    startedAt: "2026-08-10T18:30:00Z",
    humanOwner: "APVE asignado",
    steps: baseSteps.map((step, index) => ({
      ...step,
      status: index === 0 ? "en_progreso" : "pendiente"
    }))
  };
}
