import Image from "next/image";
import Link from "next/link";
import { Bell, HelpCircle, Search } from "lucide-react";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// Barra superior del centro de mando: marca, buscador, notificaciones y perfil.
export function DashboardTopbar({ name, roleLabel, notifCount }: { name: string; roleLabel: string; notifCount: number }) {
  return (
    <header className="dash-topbar">
      <Link className="dash-brand" href="/backoffice">
        <Image src="/brand/logo.png" alt="SINAPVE" width={38} height={38} />
        <span>
          <span className="dash-brand-word">SINAPVE</span>
          <span className="dash-brand-sub">Sistema Nacional de Prevención de Violencia Escolar</span>
        </span>
      </Link>

      <div className="dash-search">
        <Search size={16} aria-hidden="true" />
        <input type="search" placeholder="Buscar casos, reportes, estudiantes…" aria-label="Buscar" />
      </div>

      <div className="dash-topbar-actions">
        <span className="dash-icon-btn" title="Notificaciones">
          <Bell size={18} aria-hidden="true" />
          {notifCount > 0 ? <span className="dash-badge">{notifCount > 99 ? "99+" : notifCount}</span> : null}
        </span>
        <Link className="dash-icon-btn" href="/recursos#faq" title="Ayuda">
          <HelpCircle size={18} aria-hidden="true" />
        </Link>
        <span className="dash-profile">
          <span className="dash-avatar" aria-hidden="true">{initials(name)}</span>
          <span className="dash-profile-text">
            <strong>{name}</strong>
            <span className="muted">{roleLabel}</span>
          </span>
        </span>
      </div>
    </header>
  );
}
