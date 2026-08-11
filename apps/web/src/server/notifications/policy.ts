// EP / 14: reglas de notificacion. Las preferencias del usuario no pueden
// silenciar obligaciones criticas; los horarios silenciosos aplican salvo
// emergencia; y nunca se incluye detalle sensible en el contenido.

export type NotificationPriority = "informativa" | "accion_requerida" | "urgente" | "critica";

export type QuietHours = { start?: string; end?: string } | null | undefined;

export type DeliveryDecision = { deliver: boolean; reason: string };

function minutesOfDay(hhmm: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

// Verdadero si `now` (hora local en minutos) cae dentro de la ventana silenciosa,
// que puede cruzar la medianoche (p. ej. 22:00-07:00).
export function isWithinQuietHours(quietHours: QuietHours, nowMinutes: number): boolean {
  if (!quietHours?.start || !quietHours?.end) return false;
  const start = minutesOfDay(quietHours.start);
  const end = minutesOfDay(quietHours.end);
  if (start === null || end === null) return false;
  if (start === end) return false;
  return start < end ? nowMinutes >= start && nowMinutes < end : nowMinutes >= start || nowMinutes < end;
}

// Decide si una notificacion debe entregarse ahora. Las criticas siempre se
// entregan (override): ni preferencias ni horario silencioso las detienen.
export function shouldDeliver(input: {
  priority: NotificationPriority;
  channelEnabled?: boolean;
  quietHours?: QuietHours;
  nowMinutes: number;
}): DeliveryDecision {
  if (input.priority === "critica") {
    return { deliver: true, reason: "critical_override" };
  }
  if (input.channelEnabled === false) {
    return { deliver: false, reason: "channel_disabled_by_preference" };
  }
  if (input.priority !== "urgente" && isWithinQuietHours(input.quietHours, input.nowMinutes)) {
    return { deliver: false, reason: "deferred_quiet_hours" };
  }
  return { deliver: true, reason: "delivered" };
}

// Patrones que no deben viajar en el resumen de una notificacion (URLs, correos,
// telefonos/CURP-like largos). Evita fugas de datos sensibles (12.1, 14).
const sensitivePatterns: RegExp[] = [
  /https?:\/\//i,
  /[\w.+-]+@[\w-]+\.[\w.-]+/,
  /\b\d{7,}\b/,
  /\b[A-Z]{4}\d{6}[A-Z0-9]{8}\b/ // CURP
];

export function containsSensitiveDetail(text: string): boolean {
  return sensitivePatterns.some((pattern) => pattern.test(text));
}
