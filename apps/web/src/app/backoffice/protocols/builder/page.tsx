import Link from "next/link";
import { headers } from "next/headers";
import { ArrowLeft, Lock } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { ProtocolBuilder } from "@/components/ProtocolBuilder";
import { resolveActor } from "@/server/auth/session-actor";
import { getProtocolGraph, listAuthoredProtocolVersions } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";

export const dynamic = "force-dynamic";

export default async function ProtocolBuilderPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const actor = await resolveActor(await headers());
  if (!actor || !hasCapability(actor, "protocol:author")) {
    return (
      <div className="page-shell">
        <Topbar />
        <main className="section">
          <Link className="button" href="/backoffice">
            <ArrowLeft size={18} aria-hidden="true" />
            Regresar
          </Link>
          <section className="panel" style={{ marginTop: "1rem" }}>
            <p className="eyebrow">Acceso requerido</p>
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>Constructor de protocolos</h1>
            <p className="lead">Solo perfiles con permiso de autoria de protocolos (UEPE o superadministracion) pueden diseñar protocolos.</p>
            <div className="status-row">
              <span className="status-pill critical">
                <Lock size={16} aria-hidden="true" />
                Sin permiso de autoria
              </span>
            </div>
            <div className="hero-actions">
              <Link className="button primary" href="/login">
                Ingresar
              </Link>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const { code } = await searchParams;
  const [versions, graph] = await Promise.all([
    listAuthoredProtocolVersions(),
    code ? getProtocolGraph(code) : Promise.resolve(null)
  ]);

  return (
    <div className="page-shell">
      <Topbar />
      <main className="section">
        <Link className="button" href="/backoffice/protocols">
          <ArrowLeft size={18} aria-hidden="true" />
          Modulo de protocolos
        </Link>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <p className="eyebrow">Diseño operativo · EP-04</p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>Constructor visual de protocolos</h1>
          <p className="lead">
            Diseña el flujo de pasos y transiciones. El grafo se valida en vivo y, al publicar, se compila a la ruta lineal que ejecutan
            las corridas de casos. Cada publicacion crea una nueva version versionada con rastro de auditoria.
          </p>
          {versions.length > 0 ? (
            <div className="status-row" style={{ flexWrap: "wrap", marginTop: "0.5rem" }}>
              <span className="muted" style={{ fontSize: "0.85rem" }}>Abrir existente:</span>
              {versions.map((version) => (
                <Link
                  key={version.code}
                  className={`status-pill${version.code === code ? " safe" : ""}`}
                  href={`/backoffice/protocols/builder?code=${encodeURIComponent(version.code)}`}
                >
                  {version.title} · v{version.version}
                </Link>
              ))}
            </div>
          ) : null}
        </section>

        <section className="panel" style={{ marginTop: "1rem" }}>
          <ProtocolBuilder key={code ?? "nuevo"} initialGraph={graph ?? undefined} />
        </section>
      </main>
    </div>
  );
}
