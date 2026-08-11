import Link from "next/link";
import { headers } from "next/headers";
import { FileText, Lock } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { RealtimeBadge } from "@/components/RealtimeBadge";
import { RoleDashboard } from "@/components/RoleDashboard";
import { resolveActor } from "@/server/auth/session-actor";
import { isAuthEnabled, signOut } from "@/server/auth/oidc";
import { getDashboardModel, getLiveDataStatus } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";

export const dynamic = "force-dynamic";

const BACKOFFICE_CAPS = ["analytics:read", "case:read", "audit:read", "configuration:read", "notification:read", "protocol:run", "reporting:read"] as const;

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export default async function BackofficePage() {
  const actor = await resolveActor(await headers());
  const canUseBackoffice = actor ? BACKOFFICE_CAPS.some((cap) => hasCapability(actor, cap)) : false;

  if (!actor || !canUseBackoffice) {
    return (
      <div className="page-shell">
        <Topbar />
        <main className="section">
          <section className="panel">
            <p className="eyebrow">Acceso requerido</p>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>Centro de protección escolar</h1>
            <p className="lead">La consola requiere identidad institucional verificada con permiso operativo.</p>
            <div className="status-row">
              <span className="status-pill critical">
                <Lock size={16} aria-hidden="true" />
                Sin permiso efectivo
              </span>
            </div>
            <div className="hero-actions">
              <Link className="button primary" href="/login">
                Ingresar
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const [model, liveStatus] = await Promise.all([getDashboardModel(actor), getLiveDataStatus()]);

  return (
    <div className="page-shell">
      <Topbar />
      <main className="section">
        <div className="toolbar" style={{ justifyContent: "space-between" }}>
          <div>
            <p className="eyebrow">Centro de mando</p>
            <h1 style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>Sistema de Dashboards SINAPVE</h1>
            <p className="lead" style={{ fontSize: "1rem" }}>
              {liveStatus.databaseConfigured
                ? "Un solo template; los datos cambian según tu rol y alcance."
                : "La base de datos no está enlazada en este entorno. El panel no muestra datos inventados."}
            </p>
            <RealtimeBadge />
          </div>
          <div className="status-row">
            {hasCapability(actor, "content:publish") ? (
              <Link className="button" href="/backoffice/contenido">
                <FileText size={18} aria-hidden="true" />
                Publicaciones
              </Link>
            ) : null}
            {isAuthEnabled() ? (
              <form action={signOutAction}>
                <button className="button" type="submit">
                  Salir
                </button>
              </form>
            ) : null}
          </div>
        </div>

        <RoleDashboard model={model} />
      </main>
    </div>
  );
}
