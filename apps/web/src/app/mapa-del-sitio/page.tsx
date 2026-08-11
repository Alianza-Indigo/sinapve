import Link from "next/link";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";

const groups = [
  {
    title: "Institucional",
    links: [
      { href: "/", label: "Inicio" },
      { href: "/que-es", label: "¿Qué es SINAPVE?" },
      { href: "/transparencia", label: "Transparencia" },
      { href: "/noticias", label: "Noticias" }
    ]
  },
  {
    title: "Participación y atención",
    links: [
      { href: "/reporte", label: "Hacer un reporte" },
      { href: "/seguimiento", label: "Seguimiento de reporte" },
      { href: "/contacto", label: "Contacto" }
    ]
  },
  {
    title: "Recursos",
    links: [
      { href: "/recursos", label: "Recursos" },
      { href: "/accesibilidad", label: "Accesibilidad" }
    ]
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/aviso-privacidad", label: "Aviso de Privacidad" },
      { href: "/legal/terminos", label: "Términos de Uso" },
      { href: "/legal/cookies", label: "Política de Cookies" }
    ]
  },
  {
    title: "Acceso",
    links: [{ href: "/login", label: "Acceder" }]
  }
];

export default function MapaDelSitioPage() {
  return (
    <div className="page-shell">
      <a className="skip-link" href="#main">Saltar al contenido</a>
      <PublicHeader />
      <main id="main" className="landing section-block">
        <p className="eyebrow">Navegación</p>
        <h1 className="section-title">Mapa del sitio</h1>
        <p className="section-sub">Todas las secciones públicas de SINAPVE en un solo lugar.</p>

        <div className="action-cards" style={{ marginTop: "1.5rem" }}>
          {groups.map((group) => (
            <div className="panel" key={group.title}>
              <h2>{group.title}</h2>
              <ul>
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
