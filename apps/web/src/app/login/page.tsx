import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { ArrowLeft, Lock } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { auth, isAdminCredentialsConfigured, isOidcConfigured, signIn } from "@/server/auth/oidc";

export const dynamic = "force-dynamic";

async function loginWithCredentials(formData: FormData) {
  "use server";
  try {
    await signIn("admin-credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirectTo: "/backoffice"
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?error=credenciales");
    }
    throw error;
  }
}

async function loginWithOidc() {
  "use server";
  await signIn("sinapve-oidc", { redirectTo: "/backoffice" });
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const session = await auth().catch(() => null);
  if (session) redirect("/backoffice");

  const credentials = isAdminCredentialsConfigured();
  const oidc = isOidcConfigured();

  return (
    <div className="page-shell">
      <Topbar />
      <main className="section">
        <Link className="button" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          Regresar
        </Link>
        <section className="panel" style={{ marginTop: "1rem", maxWidth: 460 }}>
          <p className="eyebrow">Acceso institucional</p>
          <h1 style={{ fontSize: "clamp(1.8rem, 5vw, 2.6rem)" }}>Ingresar a la consola</h1>

          {!credentials && !oidc ? (
            <div className="status-row" style={{ marginTop: "1rem" }}>
              <span className="status-pill critical">
                <Lock size={16} aria-hidden="true" />
                Inicio de sesion no configurado
              </span>
            </div>
          ) : null}

          {error ? (
            <p className="muted" role="alert" style={{ color: "var(--red)" }}>
              Credenciales invalidas. Verifica el correo y la contrasena.
            </p>
          ) : null}

          {credentials ? (
            <form className="form" action={loginWithCredentials} style={{ marginTop: "1rem" }}>
              <div className="field">
                <label htmlFor="email">Correo institucional</label>
                <input id="email" name="email" type="email" autoComplete="username" required />
              </div>
              <div className="field">
                <label htmlFor="password">Contrasena</label>
                <input id="password" name="password" type="password" autoComplete="current-password" required />
              </div>
              <button className="button primary" type="submit">
                Ingresar
              </button>
            </form>
          ) : null}

          {oidc ? (
            <form action={loginWithOidc} style={{ marginTop: "1rem" }}>
              <button className="button" type="submit">
                Ingresar con identidad institucional (OIDC)
              </button>
            </form>
          ) : null}
        </section>
      </main>
    </div>
  );
}
