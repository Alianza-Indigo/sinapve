// EP-04 / EP-06 / 6.3: motor de SLA y escalamiento por falta de respuesta.
// Vercel Workflows/Queues son el destino de produccion para la orquestacion
// durable; mientras tanto esta capa concentra el calculo determinista de hitos,
// clasificacion de vencimiento, pausas auditables y deteccion de referencias sin
// acuse, invocable tanto desde rutas como desde el Cron diario.

export type DueState = "normal" | "proximo" | "vencido";

export type ProtocolStepSchedule = {
  stepId: string;
  title: string;
  dueMinute: number;
  dueAt: string;
  requiredEvidence: boolean;
};

// Motivos de pausa permitidos. El PRD (6.3) exige que un SLA solo se pause con
// motivo permitido y auditable; cualquier otro motivo se rechaza.
export const allowedPauseReasons = [
  "espera_externa_autorizada",
  "proteccion_de_la_persona",
  "restriccion_legal",
  "falta_de_informacion_critica",
  "consentimiento_pendiente"
] as const;

export type PauseReason = (typeof allowedPauseReasons)[number];

export function isAllowedPauseReason(reason: string): reason is PauseReason {
  return (allowedPauseReasons as readonly string[]).includes(reason);
}

export function computeStepSchedule(
  startedAt: Date,
  steps: Array<{ id: string; title: string; dueMinute: number; requiredEvidence?: boolean }>
): ProtocolStepSchedule[] {
  return steps.map((step) => ({
    stepId: step.id,
    title: step.title,
    dueMinute: step.dueMinute,
    requiredEvidence: Boolean(step.requiredEvidence),
    dueAt: new Date(startedAt.getTime() + step.dueMinute * 60_000).toISOString()
  }));
}

// Un hito esta "vencido" si ya paso su fecha limite y "proximo" si le quedan
// warnWindowMinutes o menos. La ventana es configurable por tipo de situacion.
export function classifyDueState(dueAt: Date, now: Date, warnWindowMinutes = 5): DueState {
  const remainingMs = dueAt.getTime() - now.getTime();
  if (remainingMs <= 0) return "vencido";
  return remainingMs <= warnWindowMinutes * 60_000 ? "proximo" : "normal";
}

export type ReferralLike = {
  status: string;
  requiredAckBy?: Date | string | null;
};

const acknowledgedStatuses = new Set(["acuse_recibido", "en_atencion", "resuelto", "cerrado"]);

// Una referencia esta vencida cuando paso su fecha de acuse y aun no hay acuse
// ni estado de atencion. Es el disparador del escalamiento de circuito cerrado.
export function isReferralOverdue(referral: ReferralLike, now = new Date()): boolean {
  if (!referral.requiredAckBy) return false;
  if (acknowledgedStatuses.has(referral.status)) return false;
  const deadline = referral.requiredAckBy instanceof Date ? referral.requiredAckBy : new Date(referral.requiredAckBy);
  return deadline.getTime() < now.getTime();
}

// Estados de circuito cerrado del escalamiento (6.7).
export const referralClosedLoopStatuses = [
  "pendiente",
  "acuse_recibido",
  "en_atencion",
  "sin_respuesta",
  "reintentado",
  "escalado_superior",
  "resuelto",
  "cerrado"
] as const;
