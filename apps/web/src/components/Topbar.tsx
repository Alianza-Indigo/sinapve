import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SensoryModeToggle } from "./SensoryModeToggle";

export function Topbar() {
  return (
    <header className="topbar">
      <Link className="brand" href="/">
        <span className="brand-mark" aria-hidden="true">
          <ShieldCheck size={22} />
        </span>
        <span>SINAPVE</span>
      </Link>
      <nav className="nav" aria-label="Navegacion principal">
        <Link href="/">Ayuda</Link>
        <Link href="/seguimiento">Seguimiento</Link>
        <Link href="/transparencia">Transparencia</Link>
        <Link href="/backoffice">Backoffice</Link>
        <Link href="/backoffice/reports">Reportes</Link>
        <Link href="/backoffice/cases">Casos</Link>
        <Link href="/backoffice/analytics">Analitica</Link>
      </nav>
      <SensoryModeToggle />
    </header>
  );
}
