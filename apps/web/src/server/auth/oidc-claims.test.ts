import { describe, expect, it } from "vitest";
import { mapClaimsToActor, pickInstitutionalClaims } from "./oidc-claims";

describe("mapClaimsToActor", () => {
  it("deriva el Actor de claims institucionales del SINAPVE", () => {
    const actor = mapClaimsToActor({
      sub: "user-123",
      name: "Agente Preventivo",
      sinapve_roles: ["APVE", "SCHOOL_DIRECTOR"],
      sinapve_organization_id: "org-9",
      sinapve_assigned_cases: "case-1, case-2"
    });
    expect(actor).not.toBeNull();
    expect(actor?.id).toBe("user-123");
    expect(actor?.roles).toEqual(["APVE", "SCHOOL_DIRECTOR"]);
    expect(actor?.scope.organizationId).toBe("org-9");
    expect(actor?.scope.assignedCaseIds).toEqual(["case-1", "case-2"]);
  });

  it("acepta roles como cadena separada por comas y claims sin prefijo", () => {
    const actor = mapClaimsToActor({ sub: "u", roles: "AUDITOR", organization_id: "o1" });
    expect(actor?.roles).toEqual(["AUDITOR"]);
    expect(actor?.scope.organizationId).toBe("o1");
  });

  it("descarta roles no validos y devuelve null si no queda ninguno", () => {
    expect(mapClaimsToActor({ sub: "u", sinapve_roles: ["ROOT", "SUPERUSER"] })).toBeNull();
  });

  it("devuelve null sin subject", () => {
    expect(mapClaimsToActor({ sinapve_roles: ["APVE"] })).toBeNull();
  });
});

describe("pickInstitutionalClaims", () => {
  it("conserva solo los claims institucionales y descarta el resto del perfil", () => {
    const picked = pickInstitutionalClaims({
      sub: "u",
      name: "N",
      sinapve_roles: ["APVE"],
      picture: "https://example/avatar.png",
      email_verified: true
    });
    expect(picked).toEqual({ sub: "u", name: "N", sinapve_roles: ["APVE"] });
  });
});
