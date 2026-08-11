import { describe, expect, it } from "vitest";
import { canReadCase, hasCapability } from "./access";
import type { Actor, CaseFile } from "./types";

const actor: Actor = {
  id: "user_001",
  name: "APVE fixture",
  roles: ["APVE"],
  scope: {
    organizationId: "org_secundaria_norte",
    stateCode: "CHH",
    assignedCaseIds: ["case_001"]
  }
};

describe("RBAC + ABAC", () => {
  it("allows APVE to read assigned cases within scope", () => {
    const caseFile: CaseFile = {
      id: "case_001",
      folio: "CASO",
      reportId: "rep",
      organizationId: "org_secundaria_norte",
      title: "Caso",
      state: "activo",
      parallelStates: [],
      severity: "grave",
      assignedTo: "APVE",
      firstResponseMinutes: 10,
      slaMinutes: 30,
      protectionSummary: "Proteccion",
      timeline: []
    };

    expect(hasCapability(actor, "case:read")).toBe(true);
    expect(canReadCase(actor, caseFile)).toBe(true);
  });

  it("limits highly sensitive access to privacy and audit roles", () => {
    const caseFile: CaseFile = {
      id: "case_001",
      folio: "CASO",
      reportId: "rep",
      organizationId: "org_secundaria_norte",
      title: "Caso",
      state: "activo",
      parallelStates: [],
      severity: "grave",
      assignedTo: "APVE",
      firstResponseMinutes: 10,
      slaMinutes: 30,
      protectionSummary: "Proteccion",
      timeline: []
    };

    expect(canReadCase(actor, caseFile, "altamente_sensible")).toBe(false);
    expect(canReadCase({ ...actor, roles: ["PRIVACY_OFFICER"] }, caseFile, "altamente_sensible")).toBe(true);
  });
});
