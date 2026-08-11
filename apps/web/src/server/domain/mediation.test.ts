import { describe, expect, it } from "vitest";
import { evaluateMediation } from "./mediation";

describe("evaluateMediation", () => {
  it("permite mediacion en conflictos leves y voluntarios", () => {
    const result = evaluateMediation({ severity: "leve", narrative: "discusion por un juego en el recreo", voluntary: true });
    expect(result.eligible).toBe(true);
    expect(result.blockedReasons).toHaveLength(0);
  });

  it("bloquea por severidad grave o critica", () => {
    expect(evaluateMediation({ severity: "grave" }).eligible).toBe(false);
    expect(evaluateMediation({ severity: "critica" }).blockedReasons).toContain("severidad_grave_o_critica");
  });

  it("bloquea ante violencia sexual descrita en el relato", () => {
    const result = evaluateMediation({ severity: "leve", narrative: "hubo acoso sexual reiterado" });
    expect(result.eligible).toBe(false);
    expect(result.blockedReasons).toContain("violencia_sexual");
  });

  it("bloquea ante amenazas, autolesiones, delito y asimetria de poder", () => {
    expect(evaluateMediation({ severity: "leve", narrative: "recibio una amenaza directa" }).blockedReasons).toContain("coercion_amenaza");
    expect(evaluateMediation({ severity: "leve", categories: ["autolesion"] }).blockedReasons).toContain("autolesion_riesgo_vital");
    expect(evaluateMediation({ severity: "leve", narrative: "traia un arma" }).blockedReasons).toContain("delito_o_arma");
    expect(evaluateMediation({ severity: "leve", powerAsymmetry: true }).blockedReasons).toContain("asimetria_de_poder_grave");
  });

  it("bloquea cuando la participacion no es voluntaria", () => {
    expect(evaluateMediation({ severity: "leve", voluntary: false }).blockedReasons).toContain("participacion_no_voluntaria");
  });
});
