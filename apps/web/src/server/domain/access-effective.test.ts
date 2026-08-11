import { describe, expect, it } from "vitest";
import { effectivePermissions } from "./access";
import type { Actor } from "./types";

const apve: Actor = { id: "u", name: "APVE", roles: ["APVE"], scope: { organizationId: "o1" } };
const multi: Actor = { id: "u2", name: "Doble", roles: ["APVE", "AUDITOR"], scope: {} };

describe("effectivePermissions", () => {
  it("explica cada permiso por el rol que lo otorga", () => {
    const permissions = effectivePermissions(apve);
    const caseUpdate = permissions.find((entry) => entry.capability === "case:update");
    expect(caseUpdate?.grantedByRole).toBe("APVE");
    expect(permissions.every((entry) => entry.grantedByRole === "APVE")).toBe(true);
  });

  it("deduplica capacidades compartidas entre roles", () => {
    const permissions = effectivePermissions(multi);
    const caseReads = permissions.filter((entry) => entry.capability === "case:read");
    expect(caseReads).toHaveLength(1);
    // El primer rol que la otorga queda registrado.
    expect(caseReads[0].grantedByRole).toBe("APVE");
  });
});
