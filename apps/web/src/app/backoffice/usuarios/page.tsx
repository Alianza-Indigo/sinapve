import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, Lock } from "lucide-react";
import { BackofficeTopbar } from "@/components/BackofficeTopbar";
import { UserAdmin } from "@/components/UserAdmin";
import { resolveActor } from "@/server/auth/session-actor";
import { listOrganizations, listUsersWithAssignments } from "@/server/data/repository";
import { canReadModule } from "@/server/domain/access";

export const dynamic = "force-dynamic";

export default async function UsersAdminPage() {
  const actor = await resolveActor(await headers());
  if (!actor || !canReadModule(actor, "configuration")) {
    return (
      <div className="page-shell">
        <BackofficeTopbar />
        <main className="section">
          <Link className="button" href="/backoffice">
            <ArrowLeft size={18} aria-hidden="true" /> Regresar
          </Link>
          <section className="panel" style={{ marginTop: "1rem" }}>
            <p className="eyebrow">Acceso requerido</p>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>Administración de usuarios</h1>
            <p className="lead">Solo perfiles con permiso de configuración (administración técnica o superadministración) pueden dar de alta o retirar usuarios.</p>
            <div className="status-row">
              <span className="status-pill critical"><Lock size={16} aria-hidden="true" /> Sin permiso efectivo</span>
            </div>
            <div className="hero-actions">
              <Link className="button primary" href="/login">Ingresar</Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const [users, organizations] = await Promise.all([listUsersWithAssignments(), listOrganizations()]);

  return (
    <div className="page-shell">
      <BackofficeTopbar />
      <main className="section">
        <Link className="button" href="/backoffice">
          <ArrowLeft size={18} aria-hidden="true" /> Regresar
        </Link>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <p className="eyebrow">Identidad y accesos · EP-01</p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>Administración de usuarios</h1>
          <p className="lead">
            Provisión institucional: da de alta al personal (director, APVE, UEPE, EMIR, federal, auditoría) ligando su identidad del
            proveedor (sujeto externo) a un rol y una organización. Los roles y el alcance nunca se auto-asignan; toda alta y baja queda
            auditada.
          </p>
        </section>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <UserAdmin initialUsers={users} organizations={organizations} />
        </section>
      </main>
    </div>
  );
}
