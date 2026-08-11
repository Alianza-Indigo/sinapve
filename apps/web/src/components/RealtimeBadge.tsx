"use client";

import { useEffect, useState } from "react";
import { Activity, AlertTriangle, Bell, Clock } from "lucide-react";

type Snapshot = {
  pendingNotifications: number;
  overdueReferrals: number;
  pendingJobs: number;
  criticalCases: number;
};

// EP / 11.6: indicador en vivo alimentado por SSE. EventSource reconecta solo;
// en cada conexión el servidor reenvía el snapshot (recarga de estado).
export function RealtimeBadge() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/v1/realtime/stream");
    const onData = (event: MessageEvent) => {
      try {
        setSnap(JSON.parse(event.data) as Snapshot);
        setLive(true);
      } catch {
        /* ignora frames no-JSON (ping) */
      }
    };
    source.addEventListener("snapshot", onData as EventListener);
    source.addEventListener("update", onData as EventListener);
    source.onerror = () => setLive(false); // EventSource reintenta automáticamente
    return () => source.close();
  }, []);

  if (!snap) return null;

  return (
    <div className="status-row" aria-live="polite" aria-label="Indicadores en vivo">
      <span className="status-pill" title={live ? "En vivo" : "Reconectando"}>
        <Activity size={14} aria-hidden="true" /> {live ? "En vivo" : "Reconectando"}
      </span>
      {snap.criticalCases > 0 ? (
        <span className="status-pill critical">
          <AlertTriangle size={14} aria-hidden="true" /> {snap.criticalCases} criticos
        </span>
      ) : null}
      <span className="status-pill">
        <Bell size={14} aria-hidden="true" /> {snap.pendingNotifications} avisos
      </span>
      <span className="status-pill">
        <Clock size={14} aria-hidden="true" /> {snap.overdueReferrals} acuses vencidos
      </span>
    </div>
  );
}
