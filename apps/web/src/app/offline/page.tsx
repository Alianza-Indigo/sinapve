import Link from "next/link";
import { ArrowLeft, WifiOff } from "lucide-react";
import { Topbar } from "@/components/Topbar";

export default function OfflinePage() {
  return (
    <div className="page-shell">
      <Topbar />
      <main className="section">
        <Link className="button" href="/">
          <ArrowLeft size={18} aria-hidden="true" />
          Regresar
        </Link>
        <section className="panel" style={{ marginTop: "1rem" }}>
          <p className="eyebrow">Baja conectividad</p>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>Captura offline segura</h1>
          <p className="lead">
            Si no hay red, prioriza seguridad inmediata. Esta vista sirve como ruta de contingencia y evita prometer una sincronizacion no confirmada.
          </p>
          <div className="status-row">
            <span className="status-pill critical">
              <WifiOff size={16} aria-hidden="true" />
              Sin sincronizacion automatica
            </span>
            <span className="status-pill">Usa telefono de emergencia si hay peligro inmediato</span>
          </div>
        </section>
      </main>
    </div>
  );
}
