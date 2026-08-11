"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, GitBranch, PowerOff } from "lucide-react";

// Acciones de gobernanza sobre una version de protocolo: aprobar y activar,
// retirar, y migrar las corridas activas a la version vigente.
export function ProtocolVersionActions({ code, active }: { code: string; active: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const act = async (action: "approve" | "retire" | "migrate-runs", confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await fetch(`/api/v1/protocols/versions/${encodeURIComponent(code)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action })
      });
      const data = (await res.json().catch(() => ({}))) as { result?: { migrated?: number }; message?: string };
      if (!res.ok) {
        setNote(data.message ?? `Error ${res.status}`);
        return;
      }
      if (action === "migrate-runs") setNote(`Corridas migradas: ${data.result?.migrated ?? 0}`);
      router.refresh();
    } catch (error) {
      setNote(error instanceof Error ? error.message : "Fallo de red");
    } finally {
      setBusy(false);
    }
  };

  return (
    <span className="status-row" style={{ gap: 6, marginLeft: 6 }}>
      {active ? (
        <>
          <button type="button" className="button" onClick={() => act("migrate-runs")} disabled={busy} title="Migrar corridas activas a esta version">
            <GitBranch size={13} aria-hidden="true" /> Migrar
          </button>
          <button type="button" className="button" onClick={() => act("retire", `¿Retirar ${code}? Dejara de usarse en nuevas corridas.`)} disabled={busy} style={{ color: "var(--red)", borderColor: "rgba(201,54,62,0.3)" }}>
            <PowerOff size={13} aria-hidden="true" /> Retirar
          </button>
        </>
      ) : (
        <button type="button" className="button primary" onClick={() => act("approve", `¿Aprobar y activar ${code}?`)} disabled={busy}>
          <CheckCircle2 size={13} aria-hidden="true" /> Aprobar y activar
        </button>
      )}
      {note ? <span className="status-pill">{note}</span> : null}
    </span>
  );
}
