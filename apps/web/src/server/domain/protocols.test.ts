import { describe, expect, it } from "vitest";
import { createProtocolRun, suggestSeverity } from "./protocols";

describe("protocol orchestration", () => {
  it("classifies emergencies as critical suggestions only", () => {
    expect(suggestSeverity("amenaza con arma", "emergencia")).toBe("critica");
  });

  it("creates a protocol route with T+30 decision checkpoint", () => {
    const run = createProtocolRun("case_001", "grave");
    expect(run.steps.at(-1)?.dueMinute).toBe(30);
    expect(run.steps.every((step) => step.status === "pendiente" || step.status === "en_progreso")).toBe(true);
  });
});
