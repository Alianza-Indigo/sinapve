import type { NotificationPriority } from "./policy";

// EP / 14: fan-out multicanal. in_app siempre se registra; los canales externos
// (correo, SMS, push, voz) se entregan a un webhook de proveedor cuando esta
// enlazado. Sin proveedor, la entrega queda registrada como pendiente sin
// bloquear el flujo (degradacion elegante). Solo viaja el resumen seguro.

export type NotificationChannel = "in_app" | "email" | "sms" | "push" | "voice";

export type ChannelDelivery = {
  channel: NotificationChannel;
  status: "delivered" | "queued_provider" | "provider_not_configured" | "provider_error";
};

const providerEnv: Record<Exclude<NotificationChannel, "in_app">, string> = {
  email: "SINAPVE_EMAIL_WEBHOOK",
  sms: "SINAPVE_SMS_WEBHOOK",
  push: "SINAPVE_PUSH_WEBHOOK",
  voice: "SINAPVE_VOICE_WEBHOOK"
};

export function isChannelConfigured(channel: NotificationChannel): boolean {
  if (channel === "in_app") return true;
  return Boolean(process.env[providerEnv[channel]]);
}

export async function dispatchToChannel(
  channel: NotificationChannel,
  message: { safeSummary: string; priority: NotificationPriority }
): Promise<ChannelDelivery> {
  if (channel === "in_app") {
    return { channel, status: "delivered" };
  }

  const endpoint = process.env[providerEnv[channel]];
  if (!endpoint) {
    return { channel, status: "provider_not_configured" };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      // Nunca se envia detalle sensible: solo el resumen seguro y la prioridad.
      body: JSON.stringify({ summary: message.safeSummary, priority: message.priority })
    });
    return { channel, status: response.ok ? "queued_provider" : "provider_error" };
  } catch {
    return { channel, status: "provider_error" };
  }
}
