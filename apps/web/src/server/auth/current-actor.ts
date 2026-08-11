import type { Actor, Role } from "../domain/types";

const validRoles: Role[] = [
  "PUBLIC",
  "STUDENT",
  "FAMILY",
  "SCHOOL_STAFF",
  "APVE",
  "SCHOOL_DIRECTOR",
  "UEPE",
  "EMIR",
  "FEDERAL",
  "AUDITOR",
  "PRIVACY_OFFICER",
  "TECH_ADMIN"
];

function parseRoles(value: string | null): Role[] {
  if (!value) return [];
  return value
    .split(",")
    .map((role) => role.trim())
    .filter((role): role is Role => validRoles.includes(role as Role));
}

export function getActorFromHeaders(headers: Headers): Actor | null {
  const id = headers.get("x-sinapve-user-id");
  const roles = parseRoles(headers.get("x-sinapve-roles"));

  if (!id || roles.length === 0) return null;

  return {
    id,
    name: headers.get("x-sinapve-user-name") ?? id,
    roles,
    mfaVerified: headers.get("x-sinapve-mfa-verified") === "true",
    scope: {
      organizationId: headers.get("x-sinapve-organization-id") ?? undefined,
      stateCode: headers.get("x-sinapve-state-code") ?? undefined,
      municipalityCode: headers.get("x-sinapve-municipality-code") ?? undefined,
      schoolId: headers.get("x-sinapve-school-id") ?? undefined,
      assignedCaseIds: headers.get("x-sinapve-assigned-cases")?.split(",").map((item) => item.trim())
    }
  };
}
