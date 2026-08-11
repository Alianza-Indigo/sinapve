import type { Actor } from "../domain/types";
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
export async function resolveActor(headers: Headers): Promise<Actor | null> {
  const sessionActor = await getSessionActor();
  if (sessionActor) return sessionActor;
  return getActorFromHeaders(headers);
}
