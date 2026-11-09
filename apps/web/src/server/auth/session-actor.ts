import type { Actor } from "../domain/types";
import { and, eq, isNull } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "../db";
import { organizations, userAssignments, users } from "../db/schema";
import { getActorFromHeaders } from "./current-actor";
import { auth, isAuthEnabled } from "./oidc";
import { mapClaimsToActor, type OidcClaims } from "./oidc-claims";

// EP-01: resolutor unificado de identidad. Prioriza una sesion OIDC/SAML valida
// (Auth.js) y, si no hay proveedor enlazado o sesion activa, cae al modelo de
// gateway por encabezados firmados. Asi la app soporta ambos modos sin duplicar
// logica en cada ruta o pagina.

export async function getSessionActor(): Promise<Actor | null> {
  if (!isAuthEnabled()) return null;
  const session = await auth();
  const claims = (session as unknown as { sinapve?: OidcClaims })?.sinapve;
  if (!claims) return null;
  return mapClaimsToActor(claims);
}

// Uso general (rutas y server components): pasa `request.headers` o
// `await headers()`. Devuelve el Actor de la sesion OIDC o, en su defecto, el
// derivado del gateway.
// A stateless JWT or a signed gateway identity must not outlive a user's
// deactivation or reassignment. Resolve effective access from live records.
async function currentInstitutionalAccess(actor: Actor): Promise<boolean> {
  // The bootstrap administrator is supplied by explicit server-only settings.
  const configuredEmail = process.env.SINAPVE_ADMIN_EMAIL?.trim().toLowerCase();
  const expectedAdminId = configuredEmail ? `admin:${configuredEmail}` : null;
  if (expectedAdminId && actor.id === expectedAdminId && process.env.SINAPVE_ADMIN_PASSWORD && process.env.AUTH_SECRET) {
    // Only the exact configured bootstrap account can bypass the institutional registry.
    const allowedRoles = (process.env.SINAPVE_ADMIN_ROLES ?? "TECH_ADMIN").split(",").map((r) => r.trim());
    return actor.roles.length > 0 && actor.roles.every((role) => allowedRoles.includes(role));
  }
  if (actor.id.startsWith("admin:")) return false;
  if (!isDatabaseConfigured()) return false;

  try {
    const db = getDb();
    const rows = await db
      .select({
        disabledAt: users.disabledAt,
        role: userAssignments.role,
        organizationId: organizations.publicId
      })
      .from(users)
      .innerJoin(userAssignments, and(eq(userAssignments.userId, users.id), isNull(userAssignments.endsAt)))
      .innerJoin(organizations, eq(organizations.id, userAssignments.organizationId))
      .where(eq(users.externalSubject, actor.id));

    if (!rows.length || rows.some((row) => row.disabledAt !== null)) return false;
    if (!actor.roles.every((role) => rows.some((row) => row.role === role))) return false;
    if (actor.scope.organizationId &&
      !rows.some((row) => row.organizationId === actor.scope.organizationId)) return false;
    return true;
  } catch {
    // Fail closed if identity storage is unavailable.
    return false;
  }
}

export async function resolveActor(headers: Headers): Promise<Actor | null> {
  const sessionActor = await getSessionActor();
  if (sessionActor) return (await currentInstitutionalAccess(sessionActor)) ? sessionActor : null;
  const headerActor = getActorFromHeaders(headers);
  return headerActor && (await currentInstitutionalAccess(headerActor)) ? headerActor : null;
}
