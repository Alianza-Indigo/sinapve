import { describe, expect, it } from "vitest";
import { assertStepUp, requiresStepUp, StepUpRequiredError } from "./mfa";
import type { Actor } from "./types";

const baseActor: Actor = { id: "u1", name: "APVE", roles: ["APVE"], scope: {} };

describe("requiresStepUp", () => {
  it("exige segundo factor para capacidades elevadas", () => {
    expect(requiresStepUp("protocol:run")).toBe(true);
    expect(requiresStepUp("break_glass")).toBe(true);
    expect(requiresStepUp("report:read")).toBe(false);
  });
});

describe("assertStepUp", () => {
  it("bloquea sin segundo factor vigente", () => {
    expect(() => assertStepUp(baseActor, "case:update")).toThrow(StepUpRequiredError);
  });
  it("permite con segundo factor vigente", () => {
    expect(() => assertStepUp({ ...baseActor, mfaVerified: true }, "case:update")).not.toThrow();
  });
});
