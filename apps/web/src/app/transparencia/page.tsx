import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { ModuleRecordsTable } from "@/components/ModuleRecordsTable";
import { MetricWidgetChart } from "@/components/MetricWidgetChart";
import { getPublicIndicators, listPublishedResources } from "@/server/data/repository";
import { getTranslator } from "@/i18n/server";

export const dynamic = "force-dynamic";

export default async function PublicPortalPage() {
  const [resources, indicators, t] = await Promise.all([listPublishedResources(), getPublicIndicators(), getTranslator()]);

  return (
    <div className="page-shell">
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <PublicHeader current="/transparencia" />
      <main id="main" className="landing section-block">
        <p className="eyebrow" style={{ textAlign: "center" }}>Portal público</p>
        <h1 className="section-title">{t("portal.transparency.title")}</h1>
        <p className="section-sub">
          Materiales publicados y datos no sensibles. Los expedientes individuales nunca se exponen en este portal.
        </p>

        <section className="panel" style={{ marginTop: "1rem" }}>
          <h2>{t("portal.indicators.title")}</h2>
          <p className="muted">
            Cifras agregadas con umbral de privacidad de {indicators.minimumCellCount}. Los grupos pequeños se reservan para no
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
      <PublicFooter />
    </div>
  );
}
