import { describe, expect, it } from "vitest";
import { canReadCase, canReadModule, canReadReport, hasCapability } from "./access";
import type { Actor, CaseFile, HelpReport } from "./types";

const superAdmin: Actor = { id: "root", name: "Superadmin", roles: ["SUPER_ADMIN"], scope: {} };

const caseFile = { id: "c1", organizationId: "otra-org" } as CaseFile;
const report = { organizationId: "otra-org", state: "ZZ" } as HelpReport;

describe("SUPER_ADMIN", () => {
  it("tiene todas las capacidades", () => {
    for (const cap of ["case:update", "protocol:run", "audit:read", "privacy:read", "integration:read", "technical:operate", "analytics:read"] as const) {
      expect(hasCapability(superAdmin, cap)).toBe(true);
    }
  });

  it("lee expedientes fuera de su alcance y altamente sensibles", () => {
    expect(canReadCase(superAdmin, caseFile)).toBe(true);
    expect(canReadCase(superAdmin, caseFile, "altamente_sensible")).toBe(true);
  });

  it("lee reportes sin restriccion de alcance", () => {
    expect(canReadReport(superAdmin, report)).toBe(true);
  });

  it("ve todos los modulos, incluido integraciones", () => {
    for (const m of ["reports", "cases", "integrations", "configuration", "privacy", "audit", "analytics"]) {
      expect(canReadModule(superAdmin, m)).toBe(true);
    }
  });
});
