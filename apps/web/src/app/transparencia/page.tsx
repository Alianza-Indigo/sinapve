import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { ModuleRecordsTable } from "@/components/ModuleRecordsTable";
import { listPublishedResources } from "@/server/data/repository";

export const dynamic = "force-dynamic";

export default async function PublicPortalPage() {
  const resources = await listPublishedResources();

  return (
    <div className="page-shell">
      <Topbar />
      <main className="section">
        <Link className="button" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          Regresar
        </Link>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <p className="eyebrow">Portal publico</p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>Transparencia y recursos</h1>
          <p className="lead">
            Materiales publicados y datos no sensibles. Los expedientes individuales nunca se exponen en este portal.
          </p>
        </section>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <h2>Recursos publicados</h2>
          <ModuleRecordsTable records={resources} />
        </section>
      </main>
    </div>
  );
}
