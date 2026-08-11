import Link from "next/link";
import Image from "next/image";
import { LogIn, PhoneCall } from "lucide-react";
import { AccessibilityControls } from "./AccessibilityControls";

const navItems = [
  { href: "/", label: "Inicio" },
  { href: "/que-es", label: "¿Qué es SINAPVE?" },
  { href: "/transparencia", label: "Transparencia" },
  { href: "/recursos", label: "Recursos" },
  { href: "/noticias", label: "Noticias" },
  { href: "/contacto", label: "Contacto" }
];

// Encabezado institucional del portal público: barra de accesibilidad (con
// emergencia siempre visible), marca con logo PNG intercambiable y navegación.
export function PublicHeader({ current }: { current?: string }) {
  return (
    <>
      <div className="util-bar">
        <div className="util-inner">
          <Link href="/accesibilidad">Accesibilidad</Link>
          <div className="util-group">
            <AccessibilityControls />
            <a className="util-emergency" href="tel:911" aria-label="Llamar a emergencias 911">
              <PhoneCall size={14} aria-hidden="true" /> Emergencia 911
            </a>
          </div>
        </div>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link className="site-brand" href="/">
            <Image src="/brand/logo.png" alt="SINAPVE" width={44} height={44} priority />
            <span>
              <span className="brand-word">SINAPVE</span>
              <span className="brand-sub">Sistema Nacional del Agente Preventivo de Violencia Escolar</span>
            </span>
          </Link>
          <nav className="site-nav" aria-label="Navegación principal">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} aria-current={current === item.href ? "page" : undefined}>
                {item.label}
              </Link>
            ))}
          </nav>
          <Link className="btn-acceder" href="/login">
            <LogIn size={16} aria-hidden="true" /> Acceder
          </Link>
        </div>
      </header>
    </>
  );
}
