import Link from "next/link";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Ambulance,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  Gauge,
  GraduationCap,
  HeartPulse,
  Layers,
  Map as MapIcon,
  MapPin,
  Network,
  PieChart,
  School,
  Settings,
  SlidersHorizontal,
  Truck,
  Users
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MetricWidget, PlatformModuleId } from "@/server/domain/types";
import type { DashboardKpiKey, DashboardPanel, DashboardPreset, ResolvedKpi } from "@/server/domain/dashboard-presets";
import { KpiCard } from "./KpiCard";
import { EChartWidget } from "./EChartWidget";

type Model = {
  preset: DashboardPreset;
  kpis: ResolvedKpi[];
  panels: DashboardPanel[];
  widgets: MetricWidget[];
  updatedAt: string;
  databaseConfigured: boolean;
  scopeLabel: string;
};

const KPI_ICON: Record<DashboardKpiKey, LucideIcon> = {
  casos_activos: Layers,
  casos_criticos: AlertTriangle,
  sla_por_vencer: Clock,
  sla_cumplimiento: CheckCircle2,
  inre: Gauge,
  intervenciones_activas: HeartPulse,
  reportes_mes: FileText,
  casos_asignados: Briefcase,
  mis_criticos: AlertTriangle,
  carga_trabajo: Gauge,
  escuelas_alcance: School,
  municipios: MapPin,
  estados: MapIcon,
  escuelas_evaluadas: School,
  emir_disponibles: Ambulance,
  despachos: Ambulance,
  en_traslado: Truck,
  en_atencion: Activity,
  disponibilidad: Gauge,
  redes_activas: Network,
  cobertura: PieChart,
  auditorias_activas: ClipboardCheck,
  cumplimiento: CheckCircle2,
  hallazgos: AlertCircle
};

const KPI_ACCENT: Record<string, string> = {
  casos_activos: "#34208c",
  casos_criticos: "#c9363e",
  mis_criticos: "#c9363e",
  sla_por_vencer: "#c87a00",
  sla_cumplimiento: "#168a5b",
  inre: "#d8a815",
  intervenciones_activas: "#6d4bd1",
  reportes_mes: "#6d4bd1",
  casos_asignados: "#34208c",
  carga_trabajo: "#6d4bd1",
  emir_disponibles: "#c9363e",
  despachos: "#c9363e",
  en_traslado: "#c87a00",
  en_atencion: "#34208c",
  disponibilidad: "#168a5b",
  cobertura: "#34208c",
  auditorias_activas: "#34208c",
  cumplimiento: "#168a5b",
  hallazgos: "#c87a00"
};

function accentFor(key: string) {
  return KPI_ACCENT[key] ?? "#6d4bd1";
}

const MODULE_META: Record<PlatformModuleId, { label: string; sub: string; href: string; icon: LucideIcon }> = {
  reports: { label: "Reportes", sub: "Nuevo reporte", href: "/backoffice/reports", icon: FileText },
  cases: { label: "Expedientes", sub: "Buscar casos", href: "/backoffice/cases", icon: Briefcase },
  protocols: { label: "Protocolos", sub: "Consultar", href: "/backoffice/protocols", icon: ClipboardCheck },
  risk: { label: "Riesgo", sub: "Alertas", href: "/backoffice/risk", icon: AlertTriangle },
  map: { label: "Mapa", sub: "Territorial", href: "/backoffice/map", icon: MapIcon },
  interventions: { label: "Intervenciones", sub: "Ver planes", href: "/backoffice/interventions", icon: HeartPulse },
  escalations: { label: "Escalamiento", sub: "Referencias", href: "/backoffice/escalations", icon: Network },
  institutions: { label: "Instituciones", sub: "Directorio", href: "/backoffice/institutions", icon: Building2 },
  directory: { label: "Directorio", sub: "Servicios", href: "/backoffice/directory", icon: Building2 },
  training: { label: "Formación", sub: "Capacitación", href: "/backoffice/training", icon: GraduationCap },
  community: { label: "Comunidad", sub: "Recursos", href: "/backoffice/community", icon: Users },
  communications: { label: "Comunicación", sub: "Mensajes", href: "/backoffice/communications", icon: Bell },
  audit: { label: "Auditoría", sub: "Cumplimiento", href: "/backoffice/audit", icon: ClipboardCheck },
  analytics: { label: "Analítica", sub: "Indicadores", href: "/backoffice/analytics", icon: BarChart3 },
  informes: { label: "Informes", sub: "Generar reporte", href: "/backoffice/informes", icon: FileText },
  privacy: { label: "Privacidad", sub: "Accesos", href: "/backoffice/privacy", icon: CheckCircle2 },
  adaptations: { label: "Ajustes", sub: "Razonables", href: "/backoffice/adaptations", icon: BookOpen },
  configuration: { label: "Configuración", sub: "Plantel", href: "/backoffice/configuration", icon: Settings },
  "public-portal": { label: "Portal público", sub: "Transparencia", href: "/transparencia", icon: Building2 },
  notifications: { label: "Notificaciones", sub: "Avisos", href: "/backoffice/notifications", icon: Bell },
  integrations: { label: "Integraciones", sub: "Conectores", href: "/backoffice/integrations", icon: Network }
};

const toneClass: Record<string, string> = { critical: "dash-kpi--critical", warn: "dash-kpi--warn", safe: "dash-kpi--safe", default: "" };
const dotClass: Record<string, string> = { critical: "dot-critical", warn: "dot-warn", safe: "dot-safe", default: "dot-default" };

export function RoleDashboard({ model }: { model: Model }) {
  const { preset, kpis, panels, widgets } = model;
  const updated = new Date(model.updatedAt).toLocaleString("es-MX", { hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <div className="dash-scopebar">
        <span className="dash-role">{preset.label}</span>
        <label className="dash-scope-field">
          <span>Alcance:</span>
          <select disabled defaultValue="scope">
            <option value="scope">{model.scopeLabel}</option>
          </select>
        </label>
        <label className="dash-scope-field">
          <select disabled defaultValue="ciclo">
            <option value="ciclo">Ciclo escolar 2024–2025</option>
          </select>
        </label>
        <span className="dash-updated muted">
          <Clock size={14} aria-hidden="true" /> Actualizado: hoy, {updated}
        </span>
        <button type="button" className="button dash-filtros" disabled title="Filtros avanzados (próximamente)">
          <SlidersHorizontal size={15} aria-hidden="true" /> Filtros
        </button>
      </div>

      <section className="dash-kpi-grid" aria-label="Indicadores clave">
        {kpis.map((kpi) => {
          const Icon = KPI_ICON[kpi.key] ?? Activity;
          const accent = accentFor(kpi.key);
          return (
            <article className={`dash-kpi ${toneClass[kpi.tone] ?? ""}`} key={kpi.key}>
              <div className="dash-kpi-top">
                <span className="dash-kpi-icon" style={{ color: accent, background: `${accent}1f` }}>
                  <Icon size={18} aria-hidden="true" />
                </span>
                {kpi.delta ? (
                  <span className={`dash-delta ${kpi.delta.direction === "up" ? "up" : "down"}`}>
                    {kpi.delta.direction === "up" ? <ArrowUpRight size={13} aria-hidden="true" /> : <ArrowDownRight size={13} aria-hidden="true" />}
                    {kpi.delta.pct}%
                  </span>
                ) : null}
              </div>
              <p className="dash-kpi-label">{kpi.label}</p>
              <div className="dash-kpi-value">{kpi.display}</div>
              <p className="dash-kpi-hint">{kpi.delta ? "vs mes anterior" : kpi.hint ?? " "}</p>
            </article>
          );
        })}
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
                    <li key={item.id} className="dash-list-item">
                      <span className={`dash-dot ${dotClass[item.tone ?? "default"]}`} aria-hidden="true" />
                      <div className="dash-list-text">
                        <strong>{item.primary}</strong>
                        {item.secondary ? <span className="muted">{item.secondary}</span> : null}
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
        <section className="dash-quick" aria-label="Accesos rápidos">
          <p className="eyebrow" style={{ marginBottom: 10 }}>Accesos rápidos</p>
          <div className="dash-quick-grid">
            {preset.quickActions.map((action) => {
              const meta = MODULE_META[action];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <Link className="dash-quick-item" href={meta.href} key={action}>
                  <span className="dash-quick-icon"><Icon size={18} aria-hidden="true" /></span>
                  <span className="dash-quick-text">
                    <strong>{meta.label}</strong>
                    <span className="muted">{meta.sub}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}
    </>
  );
}
