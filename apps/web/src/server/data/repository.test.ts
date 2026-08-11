import { describe, expect, it } from "vitest";
import { listPlatformModules } from "./repository";

describe("platform modules repository", () => {
  it("exposes the full PRD module surface without requiring sample data", async () => {
    const modules = await listPlatformModules();
    expect(modules.map((module) => module.id)).toEqual([
      "reports",
      "cases",
      "protocols",
      "risk",
      "interventions",
      "escalations",
      "training",
      "community",
      "audit",
      "analytics",
      "informes",
      "configuration",
      "public-portal",
      "notifications"
    ]);
    expect(modules.every((module) => module.count === 0)).toBe(true);
  });
});
