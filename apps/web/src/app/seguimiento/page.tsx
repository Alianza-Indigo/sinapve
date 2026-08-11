import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Topbar } from "@/components/Topbar";
import { getReportStatus } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";

export const dynamic = "force-dynamic";

export default async function TrackingPage({ searchParams }: { searchParams: Promise<{ folio?: string }> }) {
  const { folio } = await searchParams;
  let status:
    | Awaited<ReturnType<typeof getReportStatus>>
    | { error: "database_not_configured" }
    | null = null;

  if (folio) {
    try {
      status = await getReportStatus(folio);
    } catch (error) {
      if (error instanceof DatabaseNotConfiguredError) {
        status = { error: "database_not_configured" };
      } else {
        throw error;
      }
    }
  }

  return (
    <div className="page-shell">
      <Topbar />
      <main className="section">
        <Link className="button" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          Regresar
        </Link>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <p className="eyebrow">Seguimiento seguro</p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>Consulta por folio</h1>
          <p className="lead">Consulta avance sin revelar datos sensibles del expediente.</p>
          <form className="form" action="/seguimiento" method="get">
            <div className="field">
              <label htmlFor="folio">Folio</label>
              <input id="folio" name="folio" placeholder="SNPV-..." defaultValue={folio ?? ""} />
            </div>
            <button className="button primary" type="submit">
              Consultar
            </button>
          </form>
        </section>
        {folio ? (
          <section className="panel" style={{ marginTop: "1rem" }}>
            <h2>Resultado</h2>
            {status && "error" in status ? (
              <p>La conexion de datos reales no esta enlazada en este entorno.</p>
            ) : status ? (
              <div className="status-row">
                <span className="status-pill safe">{status.folio}</span>
                <span className="status-pill">{status.status}</span>
                <span className="status-pill">{status.safeMessage}</span>
              </div>
            ) : (
              <p>No se encontro un reporte con ese folio.</p>
            )}
          </section>
        ) : null}
      </main>
    </div>
  );
}
