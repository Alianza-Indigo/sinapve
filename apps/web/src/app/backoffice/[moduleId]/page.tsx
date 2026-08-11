import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowLeft, Lock } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { ModuleCreateForm } from "@/components/ModuleCreateForm";
import { ModuleRecordsTable } from "@/components/ModuleRecordsTable";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { listModuleRecords, listPlatformModules } from "@/server/data/repository";
import { canReadModule } from "@/server/domain/access";
import type { PlatformModuleId } from "@/server/domain/types";

const validModuleIds = [
  "reports",
  "cases",
  "protocols",
  "risk",
  "map",
  "interventions",
  "escalations",
  "institutions",
  "directory",
  "training",
  "community",
  "communications",
  "audit",
  "analytics",
  "informes",
  "privacy",
  "adaptations",
  "configuration",
  "public-portal",
  "notifications",
  "integrations"
] satisfies PlatformModuleId[];

export const dynamic = "force-dynamic";

export default async function BackofficeModulePage({ params }: { params: Promise<{ moduleId: string }> }) {
  const { moduleId } = await params;
  if (!validModuleIds.includes(moduleId as PlatformModuleId)) notFound();

  const actor = getActorFromHeaders(await headers());
  if (!actor || !canReadModule(actor, moduleId)) {
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
            <h1 style={{ fontSize: "clamp(2rem, 5vw, 3rem)" }}>Modulo protegido</h1>
            <p className="lead">Tu identidad institucional no tiene permiso efectivo para consultar esta area.</p>
            <div className="status-row">
              <span className="status-pill critical">
                <Lock size={16} aria-hidden="true" />
                Sin permiso efectivo
              </span>
            </div>
          </section>
        </main>
      </div>
    );
  }

  const [modules, records] = await Promise.all([listPlatformModules(), listModuleRecords(moduleId as PlatformModuleId)]);
  const module = modules.find((item) => item.id === moduleId);
  if (!module) notFound();

  return (
    <div className="page-shell">
      <Topbar />
      <main className="section">
        <Link className="button" href="/backoffice">
          <ArrowLeft size={18} aria-hidden="true" />
          Regresar
        </Link>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <p className="eyebrow">{module.statusLabel}</p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>{module.title}</h1>
          <p className="lead">{module.description}</p>
        </section>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <p className="eyebrow">Operacion</p>
          <h2>Crear registro</h2>
          <ModuleCreateForm moduleId={moduleId as PlatformModuleId} />
        </section>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <h2>Registros</h2>
          <ModuleRecordsTable records={records} />
        </section>
      </main>
    </div>
  );
}
