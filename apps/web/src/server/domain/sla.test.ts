import { describe, expect, it } from "vitest";
import { classifyDueState, computeStepSchedule, isAllowedPauseReason, isReferralOverdue } from "./sla";

describe("computeStepSchedule", () => {
  it("proyecta los hitos a partir del inicio y su minuto de vencimiento", () => {
    const start = new Date("2026-08-11T00:00:00.000Z");
    const schedule = computeStepSchedule(start, [
      { id: "safety", title: "Seguridad", dueMinute: 5, requiredEvidence: true },
      { id: "decision", title: "Decision", dueMinute: 30 }
    ]);
    expect(schedule[0].dueAt).toBe("2026-08-11T00:05:00.000Z");
    expect(schedule[1].dueAt).toBe("2026-08-11T00:30:00.000Z");
    expect(schedule[0].requiredEvidence).toBe(true);
  });
});

describe("classifyDueState", () => {
  const due = new Date("2026-08-11T00:30:00.000Z");
  it("marca normal cuando queda tiempo suficiente", () => {
    expect(classifyDueState(due, new Date("2026-08-11T00:00:00.000Z"))).toBe("normal");
  });
  it("marca proximo dentro de la ventana de aviso", () => {
    expect(classifyDueState(due, new Date("2026-08-11T00:27:00.000Z"))).toBe("proximo");
  });
  it("marca vencido cuando paso la fecha limite", () => {
    expect(classifyDueState(due, new Date("2026-08-11T00:31:00.000Z"))).toBe("vencido");
  });
});

describe("isReferralOverdue", () => {
  const now = new Date("2026-08-11T12:00:00.000Z");
  it("es verdadero cuando paso el acuse y sigue pendiente", () => {
    expect(isReferralOverdue({ status: "pendiente", requiredAckBy: "2026-08-11T11:00:00.000Z" }, now)).toBe(true);
  });
  it("es falso cuando ya hay acuse", () => {
    expect(isReferralOverdue({ status: "acuse_recibido", requiredAckBy: "2026-08-11T11:00:00.000Z" }, now)).toBe(false);
  });
  it("es falso sin fecha de acuse", () => {
    expect(isReferralOverdue({ status: "pendiente", requiredAckBy: null }, now)).toBe(false);
  });
});

describe("isAllowedPauseReason", () => {
  it("acepta solo motivos permitidos", () => {
    expect(isAllowedPauseReason("restriccion_legal")).toBe(true);
    expect(isAllowedPauseReason("por_conveniencia")).toBe(false);
  });
});
