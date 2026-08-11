import { describe, expect, it } from "vitest";
import { demoActor } from "../data/demo";
import { canReadCase, hasCapability } from "./access";
import type { CaseFile } from "./types";

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

    expect(hasCapability(demoActor, "case:read")).toBe(true);
    expect(canReadCase(demoActor, caseFile)).toBe(true);
  });

  it("denies highly sensitive access when MFA is not verified", () => {
    const actor = { ...demoActor, mfaVerified: false };
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
  });
});
