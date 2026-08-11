import { describe, expect, it } from "vitest";
import { containsSensitiveDetail, isWithinQuietHours, shouldDeliver } from "./policy";

describe("isWithinQuietHours", () => {
  it("maneja ventanas que cruzan la medianoche", () => {
    const quiet = { start: "22:00", end: "07:00" };
    expect(isWithinQuietHours(quiet, 23 * 60)).toBe(true);
    expect(isWithinQuietHours(quiet, 3 * 60)).toBe(true);
    expect(isWithinQuietHours(quiet, 12 * 60)).toBe(false);
  });
});

describe("shouldDeliver", () => {
  it("entrega siempre las criticas (override) pese a preferencias y horario", () => {
    const decision = shouldDeliver({ priority: "critica", channelEnabled: false, quietHours: { start: "22:00", end: "07:00" }, nowMinutes: 23 * 60 });
    expect(decision).toEqual({ deliver: true, reason: "critical_override" });
  });

  it("respeta el canal deshabilitado por preferencia (no critica)", () => {
    expect(shouldDeliver({ priority: "informativa", channelEnabled: false, nowMinutes: 600 }).deliver).toBe(false);
  });

  it("difiere en horario silencioso salvo urgente/critica", () => {
    const quiet = { start: "22:00", end: "07:00" };
    expect(shouldDeliver({ priority: "informativa", quietHours: quiet, nowMinutes: 23 * 60 }).reason).toBe("deferred_quiet_hours");
    expect(shouldDeliver({ priority: "urgente", quietHours: quiet, nowMinutes: 23 * 60 }).deliver).toBe(true);
  });
});

describe("containsSensitiveDetail", () => {
  it("detecta URLs, correos, telefonos largos y CURP", () => {
    expect(containsSensitiveDetail("Ver https://x.mx/expediente")).toBe(true);
    expect(containsSensitiveDetail("contacto persona@correo.mx")).toBe(true);
    expect(containsSensitiveDetail("tel 5512345678")).toBe(true);
    expect(containsSensitiveDetail("Tienes una tarea pendiente en tu bandeja")).toBe(false);
  });
});
