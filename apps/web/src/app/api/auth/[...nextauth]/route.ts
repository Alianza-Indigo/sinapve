import { handlers } from "@/server/auth/oidc";

// Rutas del relying party OIDC/SAML (Auth.js): autorizacion, callback y sesion.
// Cuando el proveedor no esta enlazado no hay proveedores registrados y estas
// rutas no ofrecen inicio de sesion (modo gateway/desarrollo).
export const runtime = "nodejs";

export const { GET, POST } = handlers;
