import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Lock, ShieldCheck } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { CaseTimeline } from "@/components/CaseTimeline";
import { ProtocolStepper } from "@/components/ProtocolStepper";
import { resolveActor } from "@/server/auth/session-actor";
import { getCase } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { canReadCase, explainAccess } from "@/server/domain/access";
import { createProtocolRun } from "@/server/domain/protocols";

export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const actor = await resolveActor(await headers());
  if (!actor) {
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
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>Falta identidad institucional</h1>
            <p className="lead">
              Para abrir expedientes el gateway de identidad debe enviar encabezados verificados de usuario, roles,
              alcance territorial y politica de sensibilidad. No se usa un actor de prueba.
            </p>
            <div className="status-row">
              <span className="status-pill critical">
                <Lock size={16} aria-hidden="true" />
                Sin sesion verificada
              </span>
            </div>
          </section>
        </main>
      </div>
    );
  }

  let caseFile;
  try {
    caseFile = await getCase(caseId);
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return (
        <div className="page-shell">
          <Topbar />
          <main className="section">
            <Link className="button" href="/backoffice">
              <ArrowLeft size={18} aria-hidden="true" />
              Regresar
            </Link>
            <section className="panel" style={{ marginTop: "1rem" }}>
              <p className="eyebrow">Base requerida</p>
              <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>Base de datos no configurada</h1>
              <p className="lead">
                Vincula la variable de la base existente para consultar expedientes reales. Esta vista no muestra datos de ejemplo.
              </p>
            </section>
          </main>
        </div>
      );
    }
    throw error;
  }

  if (!caseFile) notFound();
  if (!canReadCase(actor, caseFile)) notFound();

  const protocolRun = createProtocolRun(caseFile.id, caseFile.severity);

  return (
    <div className="page-shell">
      <Topbar />
      <main className="section">
        <Link className="button" href="/backoffice">
          <ArrowLeft size={18} aria-hidden="true" />
          Regresar
        </Link>
        <div className="main-grid" style={{ paddingInline: 0 }}>
          <section>
            <article className="panel">
              <p className="eyebrow">{caseFile.folio}</p>
              <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>{caseFile.title}</h1>
              <p className="lead">{caseFile.protectionSummary}</p>
              <div className="status-row">
                <span className="status-pill critical">{caseFile.severity}</span>
                <span className="status-pill">{caseFile.state}</span>
                <span className="status-pill">
                  <Clock size={16} aria-hidden="true" />
                  {caseFile.firstResponseMinutes}/{caseFile.slaMinutes} min
                </span>
                <span className="status-pill safe">
                  <ShieldCheck size={16} aria-hidden="true" />
                  {caseFile.assignedTo}
                </span>
              </div>
            </article>
            <article className="panel">
              <p className="eyebrow">Linea de tiempo</p>
              <h2>Eventos verificables</h2>
              <CaseTimeline caseFile={caseFile} />
            </article>
          </section>
          <aside>
            <section className="panel">
              <p className="eyebrow">Permiso efectivo</p>
              <h2>Acceso explicado</h2>
              <p>{explainAccess(actor, "case")}</p>
            </section>
            <section className="panel">
              <p className="eyebrow">Protocolo</p>
              <h2>Ruta activa</h2>
              <ProtocolStepper run={protocolRun} />
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
