import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, ShieldCheck } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { CaseTimeline } from "@/components/CaseTimeline";
import { ProtocolStepper } from "@/components/ProtocolStepper";
import { demoActor } from "@/server/data/demo";
import { getCase } from "@/server/data/repository";
import { canReadCase, explainAccess } from "@/server/domain/access";
import { createProtocolRun } from "@/server/domain/protocols";

export default async function CasePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const caseFile = await getCase(caseId);
  if (!caseFile) notFound();
  if (!canReadCase(demoActor, caseFile)) notFound();

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
              <p>{explainAccess(demoActor, "case")}</p>
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
