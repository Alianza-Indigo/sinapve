import { describe, expect, it } from "vitest";
import { slaCompliance } from "./metrics";

describe("SLA measurements", () => {
  it("does not count an unanswered case as an on-time response", () => {
    expect(slaCompliance([
      { firstResponseMinutes: 0, hasFirstResponse: false, slaMinutes: 30 },
      { firstResponseMinutes: 20, hasFirstResponse: true, slaMinutes: 30 }
    ])).toBe(50);
  });
});
