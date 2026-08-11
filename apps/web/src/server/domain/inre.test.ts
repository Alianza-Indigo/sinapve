import { describe, expect, it } from "vitest";
import { computeInre, defaultInreModel, resolveInreModel } from "./inre";

describe("computeInre", () => {
  it("no calcula puntaje sin dimensiones observadas y lo marca faltante", () => {
    const result = computeInre({});
    expect(result.score).toBeNull();
    expect(result.quality).toBe(0);
    expect(result.missingDimensions).toHaveLength(7);
  });

  it("renormaliza pesos sobre las dimensiones presentes (no imputa faltantes como cero)", () => {
    // Solo una dimension observada con valor 80: el puntaje debe ser 80, no
    // diluido por las dimensiones ausentes.
    const result = computeInre({ conductual: 80 });
    expect(result.score).toBe(80);
    expect(result.missingDimensions).toContain("digital");
    expect(result.quality).toBe(Math.round((1 / 7) * 100));
  });

  it("suma contribuciones ponderadas y reporta cada factor", () => {
    const result = computeInre({ conductual: 100, digital: 0 });
    // pesos 0.2 y 0.15 -> normalizados 0.571 y 0.429; score = 100*0.571 = 57.14
    expect(result.score).toBeGreaterThan(56);
    expect(result.score).toBeLessThan(58);
    const conductual = result.factors.find((f) => f.dimension === "conductual");
    expect(conductual?.missing).toBe(false);
    expect(conductual?.contribution).toBeGreaterThan(0);
  });

  it("resuelve un modelo versionado desde configuracion parcial cayendo al base", () => {
    const model = resolveInreModel({ version: 2, weights: { digital: 0.5 } });
    expect(model.version).toBe(2);
    expect(model.weights.digital).toBe(0.5);
    expect(model.weights.conductual).toBe(defaultInreModel.weights.conductual);
  });
});
