import type { Actor, Role } from "../domain/types";

// EP-01 / 11.2: mapeo de claims OIDC/SAML a la identidad de dominio (Actor).
// El proveedor emite claims estandar (sub, name) mas claims institucionales del
// SINAPVE (roles y alcance). El mapeo es puro y testeable, independiente de la
// libreria Auth.js.

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

export type OidcClaims = Record<string, unknown>;

function toRoles(value: unknown): Role[] {
  const raw = Array.isArray(value)
    ? value.map(String)
    : typeof value === "string"
      ? value.split(",")
      : [];
  return raw
    .map((role) => role.trim())
    .filter((role): role is Role => validRoles.includes(role as Role));
}

function readString(claims: OidcClaims, key: string): string | undefined {
  const value = claims[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function toList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((item) => item.trim()).filter(Boolean);
  return undefined;
}

// Convierte los claims del proveedor en un Actor, o null si no hay identidad o
// no trae roles institucionales validos. Se aceptan nombres de claim con o sin
// prefijo `sinapve_` para tolerar distintos proveedores.
export function mapClaimsToActor(claims: OidcClaims): Actor | null {
  const id = readString(claims, "sub");
  if (!id) return null;

  const roles = toRoles(claims["sinapve_roles"] ?? claims["roles"]);
  if (roles.length === 0) return null;

  return {
    id,
    name: readString(claims, "name") ?? readString(claims, "preferred_username") ?? id,
    roles,
    scope: {
      organizationId: readString(claims, "sinapve_organization_id") ?? readString(claims, "organization_id"),
      stateCode: readString(claims, "sinapve_state_code") ?? readString(claims, "state_code"),
      municipalityCode: readString(claims, "sinapve_municipality_code") ?? readString(claims, "municipality_code"),
      schoolId: readString(claims, "sinapve_school_id") ?? readString(claims, "school_id"),
      assignedCaseIds: toList(claims["sinapve_assigned_cases"] ?? claims["assigned_cases"])
    }
  };
}

// Selecciona solo los claims institucionales que deben viajar en el token de
// sesion, para no arrastrar todo el perfil del proveedor.
export function pickInstitutionalClaims(claims: OidcClaims): OidcClaims {
  const keys = [
    "sub",
    "name",
    "preferred_username",
    "sinapve_roles",
    "roles",
    "sinapve_organization_id",
    "organization_id",
    "sinapve_state_code",
    "state_code",
    "sinapve_municipality_code",
    "municipality_code",
    "sinapve_school_id",
    "school_id",
    "sinapve_assigned_cases",
    "assigned_cases"
  ];
  const result: OidcClaims = {};
  for (const key of keys) {
    if (claims[key] !== undefined) result[key] = claims[key];
  }
  return result;
}
