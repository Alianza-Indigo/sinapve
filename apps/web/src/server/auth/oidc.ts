import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { pickInstitutionalClaims } from "./oidc-claims";
import { verifyPassword } from "./password";

// EP-01 / 11.2: relying party OIDC/SAML con Auth.js, DETRAS DE CONFIGURACION.
// Cuando las variables del proveedor no estan enlazadas, no se registra ningun
// proveedor y la app mantiene el modelo de gateway/desarrollo; el build sigue
// verde. El segundo factor (MFA) sigue siendo responsabilidad del proveedor
// (ADR 0003).

export function isOidcConfigured() {
  return Boolean(
    process.env.SINAPVE_OIDC_ISSUER &&
      process.env.SINAPVE_OIDC_CLIENT_ID &&
      process.env.SINAPVE_OIDC_CLIENT_SECRET &&
      process.env.AUTH_SECRET
  );
}

// Admin bootstrap (login interino): habilita un inicio de sesion por credenciales
// para operar la consola antes de enlazar el IdP definitivo. Configurado por
// entorno; la contrasena vive como hash scrypt, nunca en el repo. Sus roles y
// alcance salen de la configuracion.
export function isAdminCredentialsConfigured() {
  return Boolean(process.env.SINAPVE_ADMIN_EMAIL && process.env.SINAPVE_ADMIN_PASSWORD_HASH && process.env.AUTH_SECRET);
}

export function isAuthEnabled() {
  return isOidcConfigured() || isAdminCredentialsConfigured();
}

function adminClaims() {
  return {
    sub: `admin:${process.env.SINAPVE_ADMIN_EMAIL}`,
    name: process.env.SINAPVE_ADMIN_NAME ?? "Administrador SINAPVE",
    sinapve_roles: process.env.SINAPVE_ADMIN_ROLES ?? "TECH_ADMIN",
    ...(process.env.SINAPVE_ADMIN_ORG ? { sinapve_organization_id: process.env.SINAPVE_ADMIN_ORG } : {})
  };
}

const providers: NextAuthConfig["providers"] = [];

if (isOidcConfigured()) {
  providers.push({
    id: "sinapve-oidc",
    name: "Identidad institucional SINAPVE",
    type: "oidc",
    issuer: process.env.SINAPVE_OIDC_ISSUER,
    clientId: process.env.SINAPVE_OIDC_CLIENT_ID,
    clientSecret: process.env.SINAPVE_OIDC_CLIENT_SECRET,
    authorization: { params: { scope: process.env.SINAPVE_OIDC_SCOPE ?? "openid profile email" } }
  });
}

if (isAdminCredentialsConfigured()) {
  providers.push(
    Credentials({
      id: "admin-credentials",
      name: "Acceso administrativo",
      credentials: { email: { label: "Correo", type: "email" }, password: { label: "Contrasena", type: "password" } },
      authorize(raw) {
        const email = typeof raw?.email === "string" ? raw.email.trim().toLowerCase() : "";
        const password = typeof raw?.password === "string" ? raw.password : "";
        const expectedEmail = (process.env.SINAPVE_ADMIN_EMAIL ?? "").trim().toLowerCase();
        if (!email || email !== expectedEmail) return null;
        if (!verifyPassword(password, process.env.SINAPVE_ADMIN_PASSWORD_HASH)) return null;
        const claims = adminClaims();
        return { id: claims.sub, name: claims.name, sinapve: claims } as unknown as { id: string };
      }
    })
  );
}

export const authConfig: NextAuthConfig = {
  providers,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    // En el primer inicio de sesion se conservan solo los claims institucionales
    // necesarios para derivar el Actor: del perfil OIDC o del admin bootstrap.
    async jwt({ token, profile, user }) {
      const fromUser = (user as { sinapve?: Record<string, unknown> } | undefined)?.sinapve;
      if (fromUser) {
        (token as Record<string, unknown>).sinapve = fromUser;
      } else if (profile) {
        (token as Record<string, unknown>).sinapve = pickInstitutionalClaims(profile as Record<string, unknown>);
      }
      return token;
    },
    async session({ session, token }) {
      (session as unknown as Record<string, unknown>).sinapve = (token as Record<string, unknown>).sinapve ?? null;
      return session;
    }
  }
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
