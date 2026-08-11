import type { Actor, CaseFile, HelpReport, Role, Sensitivity } from "./types";

type Capability =
  | "report:create"
  | "report:read"
  | "case:read"
  | "case:update"
  | "protocol:run"
  | "analytics:read"
  | "audit:read"
  | "technical:operate";

const roleCapabilities: Record<Role, Capability[]> = {
  PUBLIC: ["report:create"],
  STUDENT: ["report:create", "report:read"],
  FAMILY: ["report:create", "report:read"],
  SCHOOL_STAFF: ["report:create"],
  APVE: ["report:read", "case:read", "case:update", "protocol:run", "analytics:read"],
  SCHOOL_DIRECTOR: ["report:read", "case:read", "analytics:read"],
  UEPE: ["report:read", "case:read", "case:update", "protocol:run", "analytics:read"],
  EMIR: ["case:read", "case:update", "protocol:run"],
  FEDERAL: ["analytics:read", "audit:read"],
  AUDITOR: ["case:read", "audit:read", "analytics:read"],
  PRIVACY_OFFICER: ["audit:read", "case:read"],
  TECH_ADMIN: ["technical:operate"]
};

export function hasCapability(actor: Actor, capability: Capability) {
  return actor.roles.some((role) => roleCapabilities[role].includes(capability));
}

export function canReadReport(actor: Actor, report: HelpReport) {
  if (!hasCapability(actor, "report:read")) return false;
  if (actor.roles.includes("FEDERAL")) return false;
  return actor.scope.organizationId === report.organizationId || actor.scope.stateCode === report.state;
}

export function canReadCase(actor: Actor, caseFile: CaseFile, sensitivity: Sensitivity = "confidencial") {
  if (!hasCapability(actor, "case:read")) return false;
  if (sensitivity === "altamente_sensible" && !actor.mfaVerified) return false;
  if (actor.roles.includes("FEDERAL") || actor.roles.includes("TECH_ADMIN")) return false;
  if (actor.scope.assignedCaseIds?.includes(caseFile.id)) return true;
  if (actor.scope.organizationId === caseFile.organizationId) return true;
  return actor.roles.includes("AUDITOR") || actor.roles.includes("PRIVACY_OFFICER");
}

export function explainAccess(actor: Actor, resource: "report" | "case" | "analytics") {
  const roles = actor.roles.join(", ");
  const scope = actor.scope.organizationId ?? actor.scope.stateCode ?? "alcance agregado";
  return `Permiso efectivo por roles ${roles}, alcance ${scope} y MFA ${actor.mfaVerified ? "verificado" : "pendiente"}.`;
}
