import Link from "next/link";
import { headers } from "next/headers";
import { Activity, BrainCircuit, FileText, Lock, Map, ShieldCheck } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { KpiCard } from "@/components/KpiCard";
import { ReportQueue } from "@/components/ReportQueue";
import { resolveActor } from "@/server/auth/session-actor";
import { isAuthEnabled, signOut } from "@/server/auth/oidc";
import { getLiveDataStatus, listCases, listPlatformModules, listReports } from "@/server/data/repository";
import { canReadCase, canReadModule, canReadReport, hasCapability } from "@/server/domain/access";
import { buildCertifiedWidgets } from "@/server/domain/metrics";

export const dynamic = "force-dynamic";

async function signOutAction() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export default async function BackofficePage() {
  const actor = await resolveActor(await headers());
  if (!actor || !hasCapability(actor, "analytics:read")) {
    return (
      <div className="page-shell">
        <Topbar />
        <main className="section">
          <section className="panel">
            <p className="eyebrow">Acceso requerido</p>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>Centro de proteccion escolar</h1>
            <p className="lead">La consola requiere identidad institucional verificada y permiso de analitica.</p>
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

  const [allReports, allCases, liveStatus, allModules] = await Promise.all([
    listReports(),
    listCases(),
    getLiveDataStatus(),
    listPlatformModules()
  ]);
  const reports = allReports.filter((report) => canReadReport(actor, report));
  const cases = allCases.filter((caseFile) => canReadCase(actor, caseFile));
  const modules = allModules.filter((module) => canReadModule(actor, module.id));
  const widgets = buildCertifiedWidgets(reports, cases);
  const territorialWidget = widgets.find((widget) => widget.id === "G10_TERRITORIAL_RISK");
  const firstCase = cases[0];

  return (
    <div className="page-shell">
      <Topbar />
      <main className="section">
        <div className="toolbar" style={{ justifyContent: "space-between" }}>
          <div>
            <p className="eyebrow">Backoffice</p>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)" }}>Centro de proteccion escolar</h1>
            <p className="lead">
              {liveStatus.databaseConfigured
                ? `${liveStatus.reports} reportes y ${liveStatus.cases} expedientes visibles desde la base vinculada.`
                : "La base de datos no esta enlazada en este entorno. La plataforma no muestra datos inventados."}
            </p>
          </div>
          <div className="status-row">
            {firstCase ? (
              <Link className="button primary" href={`/backoffice/cases/${firstCase.id}`}>
                <FileText size={18} aria-hidden="true" />
                Abrir expediente
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

        <section className="widget-grid" aria-label="Indicadores certificados">
          {widgets.map((widget) => (
            <KpiCard key={widget.id} widget={widget} />
          ))}
        </section>

        <section className="panel" style={{ marginTop: "1rem" }} aria-labelledby="modules-title">
          <p className="eyebrow">Plataforma integral</p>
          <h2 id="modules-title">Modulos del PRD</h2>
          <div className="module-grid">
            {modules.map((module) => (
              <Link className="module-tile" href={module.href} key={module.id}>
                <span className="eyebrow">{module.statusLabel}</span>
                <strong>{module.title}</strong>
                <span>{module.description}</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="main-grid" style={{ paddingInline: 0 }}>
          <section className="panel" aria-labelledby="queue-title">
            <p className="eyebrow">Reportes</p>
            <h2 id="queue-title">Cola de triaje</h2>
            <ReportQueue reports={reports} />
          </section>
          <aside>
            <section className="panel">
              <p className="eyebrow">Riesgo territorial</p>
              <h2>INRE explicable</h2>
              <div className="map-visual" role="img" aria-label="Mapa territorial con privacidad aplicada">
                {territorialWidget?.series.length ? (
                  territorialWidget.series.slice(0, 6).map((cell) => (
                    <span className="map-cell" key={cell.label}>
                      {cell.value}
                    </span>
                  ))
                ) : (
                  <span className="map-cell">0</span>
                )}
              </div>
              <p className="muted">
                {territorialWidget?.series.length
                  ? "Celdas pequenas se suprimen antes de llegar al navegador."
                  : "Sin reportes territoriales en la base vinculada."}
              </p>
            </section>
            <section className="panel">
              <p className="eyebrow">IA supervisada</p>
              <h2>Centro de asistencia</h2>
              <p>Clasificacion, resumen y recomendacion de protocolos permanecen desactivables y requieren confirmacion humana.</p>
              <div className="status-row">
                <span className="status-pill safe"><BrainCircuit size={16} aria-hidden="true" /> Fallback humano</span>
                <span className="status-pill"><Activity size={16} aria-hidden="true" /> Auditoria activa</span>
                <span className="status-pill"><Map size={16} aria-hidden="true" /> Alcance escolar</span>
                <span className="status-pill"><ShieldCheck size={16} aria-hidden="true" /> Alcance verificado</span>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
