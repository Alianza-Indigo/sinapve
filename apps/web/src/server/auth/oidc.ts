import NextAuth, { type NextAuthConfig } from "next-auth";
import { pickInstitutionalClaims } from "./oidc-claims";

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

const providers: NextAuthConfig["providers"] = isOidcConfigured()
  ? [
      {
        id: "sinapve-oidc",
        name: "Identidad institucional SINAPVE",
        type: "oidc",
        issuer: process.env.SINAPVE_OIDC_ISSUER,
        clientId: process.env.SINAPVE_OIDC_CLIENT_ID,
        clientSecret: process.env.SINAPVE_OIDC_CLIENT_SECRET,
        authorization: { params: { scope: process.env.SINAPVE_OIDC_SCOPE ?? "openid profile email" } }
      }
    ]
  : [];

export const authConfig: NextAuthConfig = {
  providers,
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  trustHost: true,
  callbacks: {
    // En el primer inicio de sesion se conservan solo los claims
    // institucionales necesarios para derivar el Actor.
    async jwt({ token, profile }) {
      if (profile) {
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
