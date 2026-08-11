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
      "map",
      "interventions",
      "escalations",
      "institutions",
      "directory",
      "training",
      "community",
      "communications",
      "audit",
      "analytics",
      "informes",
      "privacy",
      "adaptations",
      "configuration",
      "public-portal",
      "notifications",
      "integrations"
    ]);
    expect(modules.every((module) => module.count === 0)).toBe(true);
  });
});
