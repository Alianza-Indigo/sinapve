import Link from "next/link";
import { PhoneCall, Mail, MessageSquare, LifeBuoy } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export default function ContactoPage() {
  return (
    <div className="page-shell">
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <PublicHeader current="/contacto" />
      <main id="main" className="landing section-block">
        <p className="eyebrow">Estamos para escucharte</p>
        <h1 className="section-title">Contacto</h1>
        <p className="section-sub">
          Canales institucionales de SINAPVE para dudas, orientación y colaboración.
        </p>

        <section className="panel" style={{ marginTop: "1.5rem", borderColor: "var(--violet)" }}>
          <p className="eyebrow"><LifeBuoy size={16} aria-hidden="true" /> En caso de emergencia</p>
          <h2>Si hay riesgo inmediato, llama al 911</h2>
          <p className="muted">
            Ante una situación de peligro para la vida o la integridad de una persona, comunícate de inmediato al{" "}
            <a href="tel:911"><strong>911</strong></a>. SINAPVE no sustituye a los servicios de emergencia.
          </p>
          <p className="muted">
            Para reportar una situación de violencia escolar y activar la ruta de atención, utiliza el formulario de
            reporte. Recibirás un folio para dar seguimiento de forma confidencial.
          </p>
          <Link className="button primary" href="/reporte">
            <MessageSquare size={16} aria-hidden="true" /> Ir al formulario de reporte
          </Link>
        </section>

        <section className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>Canales de contacto</h2>
          <p className="muted">
            Para consultas generales, orientación institucional o propuestas de colaboración, puedes escribirnos. Estos
            datos son ilustrativos; los canales oficiales se difunden en el portal.
          </p>
          <div className="action-cards">
            <div className="action-card">
              <h3><Mail size={18} aria-hidden="true" /> Correo</h3>
              <p>contacto@sinapve.gob.mx (ejemplo)</p>
            </div>
            <div className="action-card">
              <h3><PhoneCall size={18} aria-hidden="true" /> Línea de orientación</h3>
              <p>Línea de atención institucional en horario hábil (número de ejemplo).</p>
            </div>
            <div className="action-card">
              <h3><MessageSquare size={18} aria-hidden="true" /> Reporte en línea</h3>
              <p>El medio recomendado para situaciones de violencia escolar es el formulario de reporte.</p>
            </div>
          </div>
          <p className="muted" style={{ marginTop: "1rem" }}>
            El tratamiento de tus datos se realiza conforme al{" "}
            <Link href="/legal/aviso-privacidad">Aviso de Privacidad</Link>.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
