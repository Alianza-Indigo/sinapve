import Link from "next/link";
import { Activity, BrainCircuit, FileText, Map, ShieldCheck } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { KpiCard } from "@/components/KpiCard";
import { ReportQueue } from "@/components/ReportQueue";
import { cases, demoActor, reports } from "@/server/data/demo";
import { explainAccess } from "@/server/domain/access";
import { buildCertifiedWidgets } from "@/server/domain/metrics";

export default function BackofficePage() {
  const widgets = buildCertifiedWidgets(reports, cases);

  return (
    <div className="page-shell">
      <Topbar />
      <main className="section">
        <div className="toolbar" style={{ justifyContent: "space-between" }}>
          <div>
            <p className="eyebrow">Backoffice sintetico</p>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.4rem)" }}>Centro de proteccion escolar</h1>
            <p className="lead">{explainAccess(demoActor, "analytics")}</p>
          </div>
          <Link className="button primary" href="/backoffice/cases/case_001">
            <FileText size={18} aria-hidden="true" />
            Abrir expediente
          </Link>
        </div>

        <section className="widget-grid" aria-label="Indicadores certificados">
          {widgets.map((widget) => (
            <KpiCard key={widget.id} widget={widget} />
          ))}
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
              <div className="map-visual" role="img" aria-label="Mapa sintetico de riesgo por zonas con privacidad aplicada">
                <span className="map-cell">41</span>
                <span className="map-cell">58</span>
                <span className="map-cell">36</span>
                <span className="map-cell">49</span>
                <span className="map-cell">62</span>
                <span className="map-cell">44</span>
              </div>
              <p className="muted">Celdas pequenas suprimidas antes de llegar al navegador.</p>
            </section>
            <section className="panel">
              <p className="eyebrow">IA supervisada</p>
              <h2>Centro de asistencia</h2>
              <p>Clasificacion, resumen y recomendacion de protocolos permanecen desactivables y requieren confirmacion humana.</p>
              <div className="status-row">
                <span className="status-pill safe"><BrainCircuit size={16} aria-hidden="true" /> Fallback humano</span>
                <span className="status-pill"><Activity size={16} aria-hidden="true" /> Auditoria activa</span>
                <span className="status-pill"><Map size={16} aria-hidden="true" /> Alcance escolar</span>
                <span className="status-pill"><ShieldCheck size={16} aria-hidden="true" /> MFA verificado</span>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
