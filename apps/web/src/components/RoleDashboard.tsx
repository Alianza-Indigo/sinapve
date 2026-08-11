import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import type { MetricWidget, PlatformModuleId } from "@/server/domain/types";
import type { DashboardPanel, DashboardPreset, ResolvedKpi } from "@/server/domain/dashboard-presets";
import { KpiCard } from "./KpiCard";
import { EChartWidget } from "./EChartWidget";

type Model = {
  preset: DashboardPreset;
  kpis: ResolvedKpi[];
  panels: DashboardPanel[];
  widgets: MetricWidget[];
  updatedAt: string;
  databaseConfigured: boolean;
};

const MODULE_META: Record<PlatformModuleId, { label: string; href: string }> = {
  reports: { label: "Reportes", href: "/backoffice/reports" },
  cases: { label: "Expedientes", href: "/backoffice/cases" },
  protocols: { label: "Protocolos", href: "/backoffice/protocols" },
  risk: { label: "Riesgo", href: "/backoffice/risk" },
  map: { label: "Mapa", href: "/backoffice/map" },
  interventions: { label: "Intervenciones", href: "/backoffice/interventions" },
  escalations: { label: "Escalamiento", href: "/backoffice/escalations" },
  institutions: { label: "Instituciones", href: "/backoffice/institutions" },
  directory: { label: "Directorio", href: "/backoffice/directory" },
  training: { label: "Formación", href: "/backoffice/training" },
  community: { label: "Comunidad", href: "/backoffice/community" },
  communications: { label: "Comunicación", href: "/backoffice/communications" },
  audit: { label: "Auditoría", href: "/backoffice/audit" },
  analytics: { label: "Analítica", href: "/backoffice/analytics" },
  informes: { label: "Informes", href: "/backoffice/informes" },
  privacy: { label: "Privacidad", href: "/backoffice/privacy" },
  adaptations: { label: "Ajustes razonables", href: "/backoffice/adaptations" },
  configuration: { label: "Configuración", href: "/backoffice/configuration" },
  "public-portal": { label: "Portal público", href: "/transparencia" },
  notifications: { label: "Notificaciones", href: "/backoffice/notifications" },
  integrations: { label: "Integraciones", href: "/backoffice/integrations" }
};

const toneClass: Record<string, string> = { critical: "dash-kpi--critical", warn: "dash-kpi--warn", safe: "dash-kpi--safe", default: "" };

export function RoleDashboard({ model }: { model: Model }) {
  const { preset, kpis, panels, widgets } = model;

  return (
    <>
      <div className="dash-context">
        <div className="dash-context-left">
          <span className="dash-role">{preset.label}</span>
          <span className="muted">{preset.scopeHint}</span>
        </div>
        <span className="muted dash-updated">
          <Clock size={14} aria-hidden="true" /> Actualizado: {new Date(model.updatedAt).toLocaleString("es-MX", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>

      <section className="dash-kpi-grid" aria-label="Indicadores clave">
        {kpis.map((kpi) => (
          <article className={`dash-kpi ${toneClass[kpi.tone] ?? ""}`} key={kpi.key}>
            <p className="dash-kpi-label">{kpi.label}</p>
            <div className="dash-kpi-value">{kpi.display}</div>
            {kpi.hint ? <p className="dash-kpi-hint">{kpi.hint}</p> : null}
          </article>
        ))}
      </section>

      {widgets.length > 0 ? (
        <section className="widget-grid dash-analysis" aria-label="Análisis">
          {widgets.map((widget) => (widget.series.length > 0 ? <EChartWidget key={widget.id} widget={widget} /> : <KpiCard key={widget.id} widget={widget} />))}
        </section>
      ) : null}

      {panels.length > 0 ? (
        <section className="dash-panels" aria-label="Paneles operativos">
          {panels.map((panel) => (
            <article className="panel dash-panel" key={panel.key}>
              <div className="dash-panel-head">
                <h3>{panel.title}</h3>
                {panel.href && panel.items.length > 0 ? (
                  <Link className="link-more" href={panel.href}>
                    Ver todos <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
              {panel.items.length > 0 ? (
                <ul className="dash-list">
                  {panel.items.map((item) => (
                    <li key={item.id} className={item.tone ? `dash-list-item dash-list-item--${item.tone}` : "dash-list-item"}>
                      <div>
                        <strong>{item.primary}</strong>
                        {item.secondary ? <span className="muted"> · {item.secondary}</span> : null}
                      </div>
                      {item.meta ? <span className="dash-list-meta">{item.meta}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted dash-empty">{panel.emptyText}</p>
              )}
            </article>
          ))}
        </section>
      ) : null}

      {preset.quickActions.length > 0 ? (
        <section className="panel dash-quick" aria-label="Accesos rápidos">
          <p className="eyebrow">Accesos rápidos</p>
          <div className="dash-quick-grid">
            {preset.quickActions.map((action) => {
              const meta = MODULE_META[action];
              if (!meta) return null;
              return (
                <Link className="dash-quick-item" href={meta.href} key={action}>
                  {meta.label}
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
