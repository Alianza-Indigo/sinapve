import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

export default function AccesibilidadPage() {
  return (
    <div className="page-shell">
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <PublicHeader />
      <main id="main" className="landing section-block">
        <p className="eyebrow">Compromiso de inclusión</p>
        <h1 className="section-title">Accesibilidad</h1>
        <p className="section-sub">
          Trabajamos para que SINAPVE sea utilizable por todas las personas, sin barreras.
        </p>

        <section className="panel" style={{ marginTop: "1.5rem" }}>
          <p className="lead">
            SINAPVE asume la accesibilidad como parte de su compromiso con los derechos humanos y la inclusión.
            Diseñamos y mejoramos continuamente el portal siguiendo principios reconocidos de accesibilidad web, para
            que la información y los servicios estén al alcance de todas las personas, incluidas aquellas con
            discapacidad.
          </p>
        </section>

        <section className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>Medidas de accesibilidad</h2>
          <ul>
            <li className="muted">Navegación completa mediante teclado y un enlace para saltar al contenido principal.</li>
            <li className="muted">Modo de alto contraste para facilitar la lectura a personas con baja visión.</li>
            <li className="muted">Tamaño de texto ajustable sin pérdida de contenido ni funcionalidad.</li>
            <li className="muted">Compatibilidad con lectores de pantalla mediante estructura semántica y textos alternativos.</li>
            <li className="muted">Contenidos redactados en lenguaje claro y con enfoque incluyente.</li>
          </ul>
          <p className="muted">
            Puedes activar estas preferencias desde la barra de accesibilidad ubicada en la parte superior del sitio.
          </p>
        </section>

        <section className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>Reporta una barrera de accesibilidad</h2>
          <p className="muted">
            Si encuentras un obstáculo para usar el portal, queremos saberlo. Escríbenos a{" "}
            <a href="mailto:accesibilidad@sinapve.gob.mx">accesibilidad@sinapve.gob.mx</a> (ejemplo), describiendo la
            página, el problema y, de ser posible, el dispositivo o la tecnología de apoyo que utilizas. Atenderemos tu
            solicitud y buscaremos una alternativa mientras se corrige la barrera.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
