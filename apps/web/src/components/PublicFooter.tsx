import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Twitter, Youtube } from "lucide-react";
import { InstallAppButton } from "./InstallAppButton";

const columns = [
  {
    title: "Enlaces",
    links: [
      { href: "/que-es", label: "¿Qué es SINAPVE?" },
      { href: "/que-es#protocolos", label: "Protocolos" },
      { href: "/que-es#formacion", label: "Formación" },
      { href: "/transparencia", label: "Transparencia" },
      { href: "/mapa-del-sitio", label: "Mapa del sitio" }
    ]
  },
  {
    title: "Recursos",
    links: [
      { href: "/recursos#guias", label: "Guías y documentos" },
      { href: "/recursos#materiales", label: "Materiales de apoyo" },
      { href: "/recursos#faq", label: "Preguntas frecuentes" },
      { href: "/recursos#glosario", label: "Glosario" },
      { href: "/contacto", label: "Contacto" }
    ]
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/aviso-privacidad", label: "Aviso de privacidad" },
      { href: "/legal/terminos", label: "Términos de uso" },
      { href: "/legal/cookies", label: "Política de cookies" },
      { href: "/accesibilidad", label: "Accesibilidad" }
    ]
  }
];

// Pie institucional: enlaces, instalación PWA (en vez de tiendas nativas) y redes.
export function PublicFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-grid">
          <div className="footer-brand">
            <Link className="site-brand" href="/" style={{ gap: 10 }}>
              <Image src="/brand/logo.png" alt="SINAPVE" width={40} height={40} />
              <span className="brand-word">SINAPVE</span>
            </Link>
            <p>
              Plataforma nacional impulsada por instituciones públicas para promover la convivencia escolar y proteger los derechos de
              niñas, niños y jóvenes.
            </p>
            <div className="social-row">
              <a href="https://facebook.com" aria-label="Facebook" target="_blank" rel="noreferrer noopener"><Facebook size={20} aria-hidden="true" /></a>
              <a href="https://x.com" aria-label="X" target="_blank" rel="noreferrer noopener"><Twitter size={20} aria-hidden="true" /></a>
              <a href="https://instagram.com" aria-label="Instagram" target="_blank" rel="noreferrer noopener"><Instagram size={20} aria-hidden="true" /></a>
              <a href="https://youtube.com" aria-label="YouTube" target="_blank" rel="noreferrer noopener"><Youtube size={20} aria-hidden="true" /></a>
            </div>
          </div>

          {columns.map((column) => (
            <div className="footer-col" key={column.title}>
              <h4>{column.title}</h4>
              {column.links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>
          ))}

          <div className="footer-col">
            <h4>Instala la app</h4>
            <p style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: 12 }}>
              Reporta, da seguimiento y recibe notificaciones desde tu dispositivo, incluso con baja conectividad.
            </p>
            <div className="install-badges">
              <InstallAppButton />
            </div>
          </div>
        </div>

        <div className="footer-legal">
          <span>© 2026 SINAPVE. Todos los derechos reservados.</span>
          <span>Hecho con 💜 en México</span>
        </div>
      </div>
    </footer>
  );
}
