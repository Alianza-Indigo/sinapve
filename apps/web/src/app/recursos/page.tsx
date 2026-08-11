import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

const faqs = [
  {
    q: "¿Cómo hago un reporte?",
    a: "Ingresa a la sección Reporte y completa el formulario con la información disponible. No necesitas contar con todos los datos: describe la situación con tus palabras y el sistema la canalizará al equipo responsable."
  },
  {
    q: "¿Puedo reportar de forma anónima?",
    a: "Sí. Puedes optar por el anonimato al enviar tu reporte. En ese caso no se solicitan datos que te identifiquen, aunque proporcionar un medio de contacto facilita el seguimiento y la atención."
  },
  {
    q: "¿Cómo doy seguimiento a un reporte?",
    a: "Al enviar un reporte recibes un folio único. En la sección Seguimiento puedes consultar el estatus y las acciones registradas usando ese folio, sin exponer información sensible."
  },
  {
    q: "¿Quién puede ver la información de mi reporte?",
    a: "Solo el personal autorizado y capacitado que interviene en la atención del caso. El acceso es restringido, auditado y sujeto a confidencialidad conforme al aviso de privacidad."
  }
];

const glossary = [
  { term: "SINAPVE", def: "Sistema Nacional Preventivo de Violencia Escolar; plataforma que coordina la prevención, detección, atención e intervención de la violencia escolar." },
  { term: "APVE", def: "Agente Preventivo de Violencia Escolar; figura formada y certificada para impulsar la prevención y acompañar la aplicación de los protocolos." },
  { term: "INRE", def: "Instancia Nacional de Registro de Expedientes; concentra de forma segura y confidencial los expedientes generados por los reportes." },
  { term: "UEPE", def: "Unidad Escolar de Prevención y Enlace; equipo en cada plantel que recibe, canaliza y da seguimiento a las situaciones reportadas." },
  { term: "EMIR", def: "Equipo Multidisciplinario de Intervención y Respuesta; personal especializado que atiende los casos con enfoque integral." },
  { term: "CMCE", def: "Comité Municipal de Convivencia Escolar; instancia de coordinación local entre escuelas y autoridades." },
  { term: "Protocolo", def: "Conjunto de procedimientos estandarizados que orientan la actuación ante situaciones de violencia escolar, sin revictimización." }
];

export default function RecursosPage() {
  return (
    <div className="page-shell">
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <PublicHeader current="/recursos" />
      <main id="main" className="landing section-block">
        <p className="eyebrow">Materiales y consultas</p>
        <h1 className="section-title">Recursos</h1>
        <p className="section-sub">Guías, materiales, preguntas frecuentes y glosario para toda la comunidad escolar.</p>

        <section id="guias" className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>Guías y documentos</h2>
          <p className="muted">
            Documentos orientadores sobre prevención, detección e intervención, elaborados con enfoque de derechos
            humanos y perspectiva de género. Las versiones publicadas se difunden en la sección de transparencia y en
            noticias conforme estén disponibles.
          </p>
          <div className="action-cards">
            <div className="action-card">
              <h3>Guía de convivencia escolar</h3>
              <p>Principios y prácticas para construir entornos incluyentes y libres de violencia.</p>
            </div>
            <div className="action-card">
              <h3>Guía de aplicación de protocolos</h3>
              <p>Rutas de actuación para las comunidades escolares en cada etapa del proceso.</p>
            </div>
            <div className="action-card">
              <h3>Guía para familias</h3>
              <p>Recomendaciones para acompañar, detectar señales y dar seguimiento a los casos.</p>
            </div>
          </div>
        </section>

        <section id="materiales" className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>Materiales de apoyo</h2>
          <p className="muted">
            Recursos didácticos para el aula y la comunidad: infografías, carteles, fichas de actividades y materiales
            audiovisuales que promueven la cultura de paz, la inclusión y el respeto a la diversidad.
          </p>
        </section>

        <section id="faq" className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>Preguntas frecuentes</h2>
          {faqs.map((item) => (
            <div key={item.q} style={{ marginTop: "1rem" }}>
              <h3>{item.q}</h3>
              <p className="muted">{item.a}</p>
            </div>
          ))}
        </section>

        <section id="glosario" className="panel" style={{ marginTop: "1.5rem" }}>
          <h2>Glosario</h2>
          <dl>
            {glossary.map((item) => (
              <div key={item.term} style={{ marginTop: "0.75rem" }}>
                <dt><strong>{item.term}</strong></dt>
                <dd className="muted">{item.def}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
