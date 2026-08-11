import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export default function QueEsPage() {
  return (
    <div className="page-shell">
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <PublicHeader current="/que-es" />
      <main id="main" className="landing section-block">
        <p className="eyebrow">Conoce la plataforma</p>
        <h1 className="section-title">¿Qué es SINAPVE?</h1>
        <p className="section-sub">
          Sistema Nacional Preventivo de Violencia Escolar
        </p>

        <section className="panel" style={{ marginTop: "1.5rem" }}>
          <p className="lead">
            SINAPVE es la plataforma nacional que coordina la prevención, detección, atención e intervención ante la
            violencia escolar en todo México. Articula a escuelas, familias, autoridades educativas y comunidad bajo un
            marco común, con enfoque de derechos humanos, inclusión y perspectiva de género.
          </p>
          <p className="muted">
            Su propósito es que niñas, niños, adolescentes y jóvenes cuenten con entornos escolares seguros, incluyentes
            y en paz, donde toda situación de violencia pueda reportarse y atenderse con confidencialidad, oportunidad y
            respeto a la dignidad de las personas.
          </p>
        </section>

        <section id="protocolos" className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>Protocolos nacionales</h2>
          <p className="muted">
            SINAPVE opera con protocolos nacionales estandarizados que orientan la actuación de las comunidades
            escolares en cada etapa, garantizando trato digno y no revictimización.
          </p>
          <div className="action-cards">
            <div className="action-card">
              <h3>Prevención</h3>
              <p>
                Acciones formativas y de convivencia para reducir factores de riesgo, promover la cultura de paz y
                fortalecer entornos protectores desde el aula y la comunidad.
              </p>
            </div>
            <div className="action-card">
              <h3>Detección</h3>
              <p>
                Criterios y señales para identificar oportunamente situaciones de violencia, así como canales seguros y
                confidenciales para reportarlas sin temor a represalias.
              </p>
            </div>
            <div className="action-card">
              <h3>Intervención escolar</h3>
              <p>
                Rutas de atención y canalización que activan el acompañamiento adecuado, con seguimiento de cada caso y
                coordinación entre las instancias responsables.
              </p>
            </div>
          </div>
        </section>

        <section id="formacion" className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>Formación y certificación de Agentes Preventivos (APVE)</h2>
          <p className="muted">
            El Agente Preventivo de Violencia Escolar (APVE) es una figura formada para impulsar la prevención y
            acompañar la aplicación de los protocolos en su comunidad escolar. El programa de formación y certificación
            fortalece competencias en derechos de la niñez, perspectiva de género, primeros auxilios psicológicos y
            manejo confidencial de la información.
          </p>
          <p className="muted">
            La certificación se otorga tras completar los itinerarios formativos y se actualiza de forma periódica para
            asegurar una actuación ética, empática y basada en evidencia.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
