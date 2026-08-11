import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { ModuleCreateForm } from "@/components/ModuleCreateForm";
import { ModuleRecordsTable } from "@/components/ModuleRecordsTable";
import { KpiCard } from "@/components/KpiCard";
import { EChartWidget } from "@/components/EChartWidget";
import { RiskMap } from "@/components/RiskMap";
import { resolveActor } from "@/server/auth/session-actor";
import { getCertifiedWidgetsForActor, listModuleRecords, listPlatformModules, listTerritorialPointsForMap } from "@/server/data/repository";
import { canReadModule, hasCapability } from "@/server/domain/access";
import type { MetricWidget, PlatformModuleId } from "@/server/domain/types";

const analyticsModules: PlatformModuleId[] = ["analytics", "risk", "map"];

const validModuleIds = [
  "reports",
  "cases",
  "protocols",
  "risk",
  "map",
  "interventions",
  "escalations",
  "institutions",
  "directory",
  "training",
  "community",
  "communications",
  "audit",
  "analytics",
  "informes",
  "privacy",
  "adaptations",
  "configuration",
  "public-portal",
  "notifications",
  "integrations"
] satisfies PlatformModuleId[];

export const dynamic = "force-dynamic";

export default async function BackofficeModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  if (!validModuleIds.includes(moduleId as PlatformModuleId)) notFound();

  const actor = await resolveActor(await headers());
  if (!actor || !canReadModule(actor, moduleId)) {
    return (
      <div className="page-shell">
        <Topbar />
        <main className="section">
          <Link className="button" href="/backoffice">
            <ArrowLeft size={18} aria-hidden="true" />
            Regresar
          </Link>
          <section className="panel" style={{ marginTop: "1rem" }}>
            <p className="eyebrow">Acceso requerido</p>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>Modulo protegido</h1>
            <p className="lead">Tu identidad institucional no tiene permiso efectivo para consultar esta area.</p>
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

  const [modules, records] = await Promise.all([listPlatformModules(), listModuleRecords(moduleId as PlatformModuleId)]);
  const module = modules.find((item) => item.id === moduleId);
  if (!module) notFound();

  const isAnalytics = analyticsModules.includes(moduleId as PlatformModuleId);
  const widgets: MetricWidget[] = isAnalytics ? await getCertifiedWidgetsForActor(actor) : [];
  const chartWidgets = widgets.filter((widget) => widget.series.length > 0).slice(0, 6);
  const isMap = moduleId === "map";
  const mapPoints = isMap ? await listTerritorialPointsForMap() : [];

  return (
    <div className="page-shell">
      <Topbar />
      <main className="section">
        <Link className="button" href="/backoffice">
          <ArrowLeft size={18} aria-hidden="true" />
          Regresar
        </Link>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <p className="eyebrow">{module.statusLabel}</p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>{module.title}</h1>
          <p className="lead">{module.description}</p>
          {moduleId === "protocols" && hasCapability(actor, "protocol:author") ? (
            <div className="hero-actions" style={{ marginTop: "0.75rem" }}>
              <Link className="button primary" href="/backoffice/protocols/builder">
                Abrir constructor visual de protocolos
              </Link>
            </div>
          ) : null}
        </section>
        {isAnalytics ? (
          <>
            <section className="widget-grid" aria-label="Indicadores certificados" style={{ marginTop: "1rem" }}>
              {widgets.slice(0, 6).map((widget) => (
                <KpiCard key={widget.id} widget={widget} />
              ))}
            </section>
            {chartWidgets.length > 0 ? (
              <section className="widget-grid" aria-label="Graficas accesibles (ECharts)" style={{ marginTop: "1rem" }}>
                {chartWidgets.map((widget) => (
                  <EChartWidget key={`chart-${widget.id}`} widget={widget} />
                ))}
              </section>
            ) : null}
          </>
        ) : null}
        {isMap ? (
          <section className="panel" aria-label="Mapa territorial" style={{ marginTop: "1rem" }}>
            <p className="eyebrow">Mapa territorial (MapLibre)</p>
            <h2>Cobertura y recursos georreferenciados</h2>
            <p className="muted">Solo recursos y agregados no sensibles. Los expedientes individuales nunca se mapean.</p>
            <RiskMap points={mapPoints} />
          </section>
        ) : null}
        <section className="panel" style={{ marginTop: "1rem" }}>
          <p className="eyebrow">Operacion</p>
          <h2>Crear registro</h2>
          <ModuleCreateForm moduleId={moduleId as PlatformModuleId} />
        </section>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <h2>Registros</h2>
          <ModuleRecordsTable records={records} />
        </section>
      </main>
    </div>
  );
}
