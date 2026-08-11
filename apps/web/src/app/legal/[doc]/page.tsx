import { notFound } from "next/navigation";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

type LegalDoc = {
  title: string;
  intro: string;
  sections: { heading: string; body: string }[];
};

const docs: Record<string, LegalDoc> = {
  "aviso-privacidad": {
    title: "Aviso de Privacidad",
    intro:
      "SINAPVE trata los datos personales de las personas usuarias con estricto apego a los principios de licitud, consentimiento, información, calidad, finalidad, lealtad, proporcionalidad y responsabilidad.",
    sections: [
      {
        heading: "Finalidad del tratamiento",
        body: "Los datos se recaban únicamente para recibir y atender reportes de violencia escolar, dar seguimiento a los casos y generar estadística agregada y no identificable. No se utilizan para finalidades distintas ni incompatibles con las aquí señaladas."
      },
      {
        heading: "Limitación de finalidad y minimización",
        body: "Solicitamos solo los datos necesarios para la atención del caso. Cuando la persona opta por el anonimato, no se requieren datos que la identifiquen."
      },
      {
        heading: "Derechos ARCO",
        body: "Puedes ejercer tus derechos de Acceso, Rectificación, Cancelación y Oposición, así como revocar tu consentimiento, a través de los canales de contacto institucionales, conforme a la normativa aplicable en materia de protección de datos personales."
      },
      {
        heading: "Acceso auditado y confidencialidad",
        body: "El acceso a la información es restringido al personal autorizado, queda registrado y es auditable. Toda persona que interviene está obligada a la confidencialidad."
      },
      {
        heading: "No venta ni comercialización",
        body: "SINAPVE no vende, renta ni comercializa datos personales, ni los transfiere salvo los supuestos previstos por la ley para la debida atención de los casos."
      }
    ]
  },
  terminos: {
    title: "Términos de Uso",
    intro:
      "El uso del portal SINAPVE implica la aceptación de estos términos, orientados a garantizar un espacio seguro, respetuoso y al servicio de la comunidad escolar.",
    sections: [
      {
        heading: "Uso aceptable",
        body: "El portal debe utilizarse de buena fe y con fines legítimos. Los reportes deben corresponder a situaciones reales; el envío de información falsa o malintencionada puede afectar la atención de casos genuinos y derivar en responsabilidades."
      },
      {
        heading: "Respeto y no discriminación",
        body: "Toda interacción debe realizarse con respeto a la dignidad de las personas, sin discriminación ni violencia, en congruencia con el enfoque de derechos humanos, inclusión y perspectiva de género de la plataforma."
      },
      {
        heading: "Propiedad de los contenidos",
        body: "Los contenidos institucionales publicados en el portal son de carácter público y educativo, y deben citarse con su fuente cuando se reutilicen."
      },
      {
        heading: "Disponibilidad del servicio",
        body: "Procuramos la continuidad del servicio; sin embargo, el portal puede presentar interrupciones por mantenimiento o causas ajenas. Ante una emergencia, comunícate siempre al 911."
      }
    ]
  },
  cookies: {
    title: "Política de Cookies",
    intro:
      "SINAPVE utiliza cookies estrictamente necesarias para el funcionamiento del portal, sin fines publicitarios ni de perfilamiento comercial.",
    sections: [
      {
        heading: "Cookies de sesión",
        body: "Permiten mantener una sesión activa de forma segura mientras usas el portal y protegen la integridad de las operaciones."
      },
      {
        heading: "Preferencias de idioma",
        body: "Guardan el idioma seleccionado para mostrarte el contenido en la lengua de tu preferencia en futuras visitas."
      },
      {
        heading: "Preferencias de accesibilidad",
        body: "Recuerdan ajustes como el modo de alto contraste o el tamaño de texto, para conservar una experiencia accesible."
      },
      {
        heading: "Gestión de cookies",
        body: "Puedes administrar o eliminar las cookies desde la configuración de tu navegador. Deshabilitar las cookies necesarias puede afectar el funcionamiento del portal."
      }
    ]
  }
};

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const content = docs[doc];

  if (!content) {
    notFound();
  }

  return (
    <div className="page-shell">
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <PublicHeader />
      <main id="main" className="landing section-block">
        <p className="eyebrow">Marco legal</p>
        <h1 className="section-title">{content.title}</h1>
        <p className="lead">{content.intro}</p>
        <div className="panel" style={{ marginTop: "1.5rem" }}>
          {content.sections.map((section) => (
            <div key={section.heading} style={{ marginTop: "1rem" }}>
              <h2>{section.heading}</h2>
              <p className="muted">{section.body}</p>
            </div>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
