import Link from "next/link";
import { headers } from "next/headers";
import { FileText, Lock, LogOut } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { DashboardTopbar } from "@/components/DashboardTopbar";
import { RoleDashboard } from "@/components/RoleDashboard";
import { resolveActor } from "@/server/auth/session-actor";
import { isAuthEnabled, signOut } from "@/server/auth/oidc";
import { getDashboardModel, getRealtimeCounts } from "@/server/data/repository";
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

  const [model, counts] = await Promise.all([
    getDashboardModel(actor),
    getRealtimeCounts().catch(() => ({ pendingNotifications: 0, overdueReferrals: 0, pendingJobs: 0, criticalCases: 0 }))
  ]);

  return (
    <div className="page-shell dash-shell">
      <DashboardTopbar name={actor.name} roleLabel={model.preset.label} notifCount={counts.pendingNotifications} />
      <main className="dash-main">
        <div className="dash-actions">
          {!model.databaseConfigured ? (
            <span className="status-pill">La base no está enlazada · el panel no inventa datos</span>
          ) : (
            <span />
          )}
          <div className="status-row" style={{ gap: 8 }}>
            {hasCapability(actor, "content:publish") ? (
              <Link className="button" href="/backoffice/contenido">
                <FileText size={16} aria-hidden="true" /> Publicaciones
              </Link>
            ) : null}
            {isAuthEnabled() ? (
              <form action={signOutAction}>
                <button className="button" type="submit">
                  <LogOut size={16} aria-hidden="true" /> Salir
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
