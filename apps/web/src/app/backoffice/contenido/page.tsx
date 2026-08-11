import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, Lock } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { ContentPublisher } from "@/components/ContentPublisher";
import { resolveActor } from "@/server/auth/session-actor";
import { listContentPostsForAdmin } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";

export const dynamic = "force-dynamic";

export default async function ContentAdminPage() {
  const actor = await resolveActor(await headers());
  if (!actor || !hasCapability(actor, "content:publish")) {
    return (
      <div className="page-shell">
        <Topbar />
        <main className="section">
          <Link className="button" href="/backoffice">
            <ArrowLeft size={18} aria-hidden="true" /> Regresar
          </Link>
          <section className="panel" style={{ marginTop: "1rem" }}>
            <p className="eyebrow">Acceso requerido</p>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>Publicaciones del portal</h1>
            <p className="lead">Solo perfiles con permiso de publicación (federal/estatal o superadministración) pueden gestionar el contenido público.</p>
            <div className="status-row">
              <span className="status-pill critical"><Lock size={16} aria-hidden="true" /> Sin permiso de publicación</span>
            </div>
            <div className="hero-actions">
              <Link className="button primary" href="/login">Ingresar</Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const posts = await listContentPostsForAdmin();

  return (
    <div className="page-shell">
      <Topbar />
      <main className="section">
        <Link className="button" href="/backoffice">
          <ArrowLeft size={18} aria-hidden="true" /> Regresar
        </Link>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <p className="eyebrow">Portal público · Publicaciones</p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>Comunicados, noticias y recursos</h1>
          <p className="lead">
            Lo que publiques aquí alimenta la sección &quot;Lo más reciente&quot; de la portada y la página de noticias. Solo contenido
            público: sin datos personales ni operativos.
          </p>
        </section>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <ContentPublisher initialPosts={posts} />
        </section>
      </main>
    </div>
  );
}
