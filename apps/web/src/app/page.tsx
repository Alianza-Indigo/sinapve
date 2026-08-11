import Link from "next/link";
import { ArrowRight, BarChart3, LockKeyhole, ShieldAlert } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { ReportForm } from "@/components/ReportForm";

export default function HomePage() {
  return (
    <div className="page-shell">
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <Topbar />
      <section className="hero-band">
        <p className="eyebrow">Proteccion escolar con trazabilidad humana</p>
        <h1>SINAPVE</h1>
        <p className="lead">
          Solicitudes de ayuda, protocolos, expedientes y metricas institucionales para prevenir y atender violencia escolar sin revictimizar.
        </p>
        <div className="hero-actions">
          <a className="button danger" href="tel:911">
            <ShieldAlert size={18} aria-hidden="true" />
            Emergencia inmediata
          </a>
          <Link className="button" href="/backoffice">
            <BarChart3 size={18} aria-hidden="true" />
            Ver operacion
          </Link>
        </div>
      </section>
      <main id="main" className="main-grid">
        <section className="panel" aria-labelledby="report-title">
          <p className="eyebrow">Reporte publico</p>
          <h2 id="report-title">Pedir ayuda sin crear cuenta</h2>
          <p className="muted">Formulario progresivo con folio opaco, pausa segura y confirmacion antes de compartir datos identificados.</p>
          <ReportForm />
        </section>
        <aside>
          <section className="panel">
            <p className="eyebrow">Privacidad desde diseno</p>
            <h2>Quien puede ver tus datos</h2>
            <p>
              Los reportes anonimos reciben seguimiento por folio. Los confidenciales limitan identidad a perfiles autorizados y todo acceso queda auditado.
            </p>
            <p className="status-pill safe">
              <LockKeyhole size={16} aria-hidden="true" />
              Sin Supabase · Datos reales en Neon
            </p>
          </section>
          <section className="panel">
            <p className="eyebrow">Datos reales</p>
            <h2>Operacion conectada</h2>
            <p>Los reportes se guardan en Neon y la evidencia sensible en Blob privado. Si el catalogo territorial no existe, la app no inventa planteles.</p>
            <Link className="button" href="/backoffice">
              Abrir tablero <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </section>
        </aside>
      </main>
    </div>
  );
}
