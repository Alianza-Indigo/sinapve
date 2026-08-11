import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { ModuleRecordsTable } from "@/components/ModuleRecordsTable";
import { MetricWidgetChart } from "@/components/MetricWidgetChart";
import { getPublicIndicators, listPublishedResources } from "@/server/data/repository";

export const dynamic = "force-dynamic";

export default async function PublicPortalPage() {
  const [resources, indicators] = await Promise.all([listPublishedResources(), getPublicIndicators()]);

  return (
    <div className="page-shell">
      <Topbar />
      <main className="section">
        <Link className="button" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          Regresar
        </Link>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <p className="eyebrow">Portal publico</p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>Transparencia y recursos</h1>
          <p className="lead">
            Materiales publicados y datos no sensibles. Los expedientes individuales nunca se exponen en este portal.
          </p>
        </section>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <h2>Indicadores agregados</h2>
          <p className="muted">
            Cifras agregadas con umbral de privacidad de {indicators.minimumCellCount}. Los grupos pequenos se reservan para no
            reidentificar personas. Actualizado {indicators.generatedAt}.
          </p>
          <div className="widget-grid">
            {indicators.kpis.map((kpi) => (
              <article key={kpi.code} className="panel metric" aria-labelledby={`${kpi.code}-kpi`}>
                <h3 id={`${kpi.code}-kpi`}>{kpi.label}</h3>
                <div className="metric-value">{kpi.value}</div>
                {kpi.suppressed ? <p className="muted">Reservado por privacidad</p> : null}
              </article>
            ))}
          </div>
          <div className="widget-grid" style={{ marginTop: "1rem" }}>
            {indicators.charts.map((widget) => (
              <MetricWidgetChart key={widget.id} widget={widget} />
            ))}
          </div>
        </section>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <h2>Recursos publicados</h2>
          <ModuleRecordsTable records={resources} />
        </section>
      </main>
    </div>
  );
}
