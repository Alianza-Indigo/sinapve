import Link from "next/link";
import { ArrowRight, LockKeyhole } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { ReportForm } from "@/components/ReportForm";

export const dynamic = "force-dynamic";

export default function ReportePage() {
  return (
    <div className="page-shell">
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <PublicHeader />
      <main id="main" className="main-grid">
        <section className="panel" aria-labelledby="report-title">
          <p className="eyebrow">Reporte público</p>
          <h2 id="report-title">Pedir ayuda sin crear cuenta</h2>
          <p className="muted">
            Formulario progresivo con folio opaco, pausa segura y confirmación antes de compartir datos identificados.
          </p>
          <ReportForm />
        </section>
        <aside>
          <section className="panel">
            <p className="eyebrow">Privacidad desde diseño</p>
            <h2>Quién puede ver tus datos</h2>
            <p>
              Los reportes anónimos reciben seguimiento por folio. Los confidenciales limitan la identidad a perfiles autorizados y todo
              acceso queda auditado.
            </p>
            <p className="status-pill safe">
              <LockKeyhole size={16} aria-hidden="true" /> Datos protegidos y auditados
            </p>
          </section>
          <section className="panel">
            <p className="eyebrow">Seguimiento</p>
            <h2>¿Ya hiciste un reporte?</h2>
            <p>Consulta el estatus con tu folio, sin necesidad de crear una cuenta.</p>
            <div className="status-row">
              <Link className="button" href="/seguimiento">
                Dar seguimiento <ArrowRight size={18} aria-hidden="true" />
              </Link>
            </div>
          </section>
        </aside>
      </main>
      <PublicFooter />
    </div>
  );
}
