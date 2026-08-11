import type { Actor, CaseFile, HelpReport, Role, Sensitivity } from "./types";

type Capability =
  | "report:create"
  | "report:read"
  | "case:read"
  | "case:update"
  | "protocol:run"
  | "analytics:read"
  | "audit:read"
  | "institution:read"
  | "adaptation:read"
  | "integration:read"
  | "technical:operate"
  | "intervention:read"
  | "referral:read"
  | "training:read"
  | "community:read"
  | "reporting:read"
  | "configuration:read"
  | "privacy:read"
  | "notification:read";

const roleCapabilities: Record<Role, Capability[]> = {
  PUBLIC: ["report:create"],
  STUDENT: ["report:create", "report:read"],
  FAMILY: ["report:create", "report:read"],
  SCHOOL_STAFF: ["report:create"],
  APVE: ["report:read", "case:read", "case:update", "protocol:run", "analytics:read", "intervention:read", "referral:read", "institution:read", "training:read", "community:read", "notification:read"],
  SCHOOL_DIRECTOR: ["report:read", "case:read", "analytics:read", "intervention:read", "institution:read", "training:read", "community:read", "reporting:read"],
  UEPE: ["report:read", "case:read", "case:update", "protocol:run", "analytics:read", "intervention:read", "referral:read", "institution:read", "adaptation:read", "training:read", "community:read", "reporting:read", "notification:read"],
  EMIR: ["case:read", "case:update", "protocol:run", "intervention:read", "referral:read", "institution:read", "notification:read"],
  FEDERAL: ["analytics:read", "audit:read", "reporting:read", "institution:read", "adaptation:read", "training:read", "community:read"],
  AUDITOR: ["case:read", "audit:read", "analytics:read", "reporting:read", "institution:read"],
  PRIVACY_OFFICER: ["audit:read", "case:read", "configuration:read", "privacy:read"],
  TECH_ADMIN: ["technical:operate", "configuration:read", "integration:read"]
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

export function canReadModule(actor: Actor, moduleId: string) {
  if (moduleId === "reports") return hasCapability(actor, "report:read");
  if (moduleId === "cases" || moduleId === "protocols") return hasCapability(actor, "case:read");
  if (moduleId === "risk" || moduleId === "map") return hasCapability(actor, "analytics:read");
  if (moduleId === "interventions") return hasCapability(actor, "intervention:read");
  if (moduleId === "escalations" || moduleId === "directory") return hasCapability(actor, "referral:read");
  if (moduleId === "institutions") return hasCapability(actor, "institution:read");
  if (moduleId === "training") return hasCapability(actor, "training:read");
  if (moduleId === "community" || moduleId === "public-portal" || moduleId === "communications") return hasCapability(actor, "community:read");
  if (moduleId === "audit") return hasCapability(actor, "audit:read");
  if (moduleId === "analytics") return hasCapability(actor, "analytics:read");
  if (moduleId === "informes") return hasCapability(actor, "reporting:read");
  if (moduleId === "privacy") return hasCapability(actor, "privacy:read");
  if (moduleId === "adaptations") return hasCapability(actor, "adaptation:read");
  if (moduleId === "configuration") return hasCapability(actor, "configuration:read");
  if (moduleId === "notifications") return hasCapability(actor, "notification:read");
  if (moduleId === "integrations") return hasCapability(actor, "integration:read");
  return false;
}
