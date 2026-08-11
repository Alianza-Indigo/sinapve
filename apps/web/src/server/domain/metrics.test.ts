import { describe, expect, it } from "vitest";
import { cases, reports } from "../data/demo";
import { buildCertifiedWidgets, reportConversionRate, slaCompliance } from "./metrics";

describe("certified metrics", () => {
  it("calculates SLA compliance from server-side case facts", () => {
    expect(slaCompliance(cases)).toBe(100);
  });

  it("builds the six required initial dashboard widgets", () => {
    const widgets = buildCertifiedWidgets(reports, cases);
    expect(widgets.map((widget) => widget.id)).toEqual([
      "G01_CASES_OVER_TIME",
      "G04_FIRST_RESPONSE",
      "G05_SLA_COMPLIANCE",
      "G07_OPEN_CASE_AGE",
      "G10_TERRITORIAL_RISK",
      "G19_CERTIFICATION_COVERAGE"
    ]);
  });

  it("keeps conversion formula deterministic", () => {
    expect(reportConversionRate(reports, cases)).toBe(100);
  });
});
