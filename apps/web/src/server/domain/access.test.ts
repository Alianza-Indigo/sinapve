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


describe("institutional write boundaries", () => {
  it("does not allow modifying another school's case", async () => {
    const { canUpdateCase, canCreateCaseFromReport } = await import("./access");
    const foreign = { id: "foreign-case", organizationId: "other-school" };
    expect(canUpdateCase(actor, foreign)).toBe(false);
    expect(canUpdateCase(actor, { id: "case_001", organizationId: "other-school" })).toBe(true);
    expect(canCreateCaseFromReport(actor, { organizationId: "other-school", state: "CHH" })).toBe(false);
    expect(canCreateCaseFromReport(actor, { organizationId: "org_secundaria_norte", state: "CHH" })).toBe(true);
  });

  it("rejects write actions for readers in generic modules", async () => {
    const { canWriteModule } = await import("./access");
    expect(canWriteModule(actor, "community")).toBe(true);
    expect(canWriteModule(actor, "training")).toBe(false);
    expect(canWriteModule({ ...actor, roles: ["AUDITOR"] }, "analytics")).toBe(false);
  });
});

describe('privileged role provisioning', () => {
  it('prevents technical administrators from creating superadministrators', async () => {
    const { canProvisionRole } = await import('./access');
    expect(canProvisionRole({ ...actor, roles: ['TECH_ADMIN'] }, 'SUPER_ADMIN')).toBe(false);
    expect(canProvisionRole({ ...actor, roles: ['TECH_ADMIN'] }, 'APVE')).toBe(true);
    expect(canProvisionRole({ ...actor, roles: ['SUPER_ADMIN'] }, 'INVALID_ROLE')).toBe(false);
  });
});

describe("separate reading from institutional mutations", () => {
  it("allows scoped analytics only for authorized editors", async () => {
    const { canCaptureAnalytics } = await import("./access");
    expect(canCaptureAnalytics(actor, "risk_score", "org_secundaria_norte")).toBe(false);
    const uepe: Actor = { ...actor, roles: ["UEPE"] };
    expect(canCaptureAnalytics(uepe, "risk_score", "org_secundaria_norte")).toBe(true);
    expect(canCaptureAnalytics(uepe, "risk_score", "otra_escuela")).toBe(false);
    expect(canCaptureAnalytics(uepe, "budget")).toBe(false);
    expect(canCaptureAnalytics({ ...actor, roles: ["FEDERAL"] }, "budget")).toBe(true);
  });
  it("does not allow read-only institutional users to issue certificates", async () => {
    const { canIssueCertification } = await import("./access");
    expect(canIssueCertification({ ...actor, roles: ["SCHOOL_DIRECTOR"] })).toBe(false);
    expect(canIssueCertification({ ...actor, roles: ["UEPE"] })).toBe(true);
    expect(canIssueCertification({ ...actor, roles: ["FEDERAL"] })).toBe(true);
  });
});
