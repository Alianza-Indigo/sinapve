"use client";

import { useState } from "react";
import { CheckCircle2, CircleDot, GitBranch, Lock, Play, ShieldAlert } from "lucide-react";
import type { ProtocolRunState, ProtocolRunStepStatus } from "@sinapve/domain/protocol-graph";

type RunState = ProtocolRunState & {
  runId: string;
  caseId: string;
  protocolCode: string | null;
  protocolVersion: number | null;
  protocolTitle: string | null;
};

const STATUS_LABEL: Record<ProtocolRunStepStatus, string> = {
  pendiente: "Pendiente",
  en_progreso: "En progreso",
  completado: "Completado",
  bloqueado: "Bloqueado",
  omitido: "Omitido"
};

const STATUS_CLASS: Record<ProtocolRunStepStatus, string> = {
  pendiente: "",
  en_progreso: "",
  completado: "safe",
  bloqueado: "critical",
  omitido: ""
};

export function ProtocolRunConsole({ caseId, initialRun, canRun }: { caseId: string; initialRun: RunState | null; canRun: boolean }) {
  const [run, setRun] = useState<RunState | null>(initialRun);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branch, setBranch] = useState<string>("");

  const refresh = async (runId: string) => {
    const res = await fetch(`/api/v1/protocol-runs/${runId}`);
    if (res.ok) {
      const data = (await res.json()) as { run: RunState };
      setRun(data.run);
      setBranch("");
    }
  };

  const startRun = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/cases/${caseId}/protocol-runs`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { run?: { id: string }; message?: string };
      if (!res.ok || !data.run) {
        setError(data.message ?? `No se pudo iniciar (error ${res.status}).`);
        return;
      }
      await refresh(data.run.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fallo de red");
    } finally {
      setBusy(false);
    }
  };

  const act = async (stepId: string, status: "completado" | "bloqueado", chosenNext?: string) => {
    if (!run) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/protocol-runs/${run.runId}/steps/${stepId}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, ...(chosenNext ? { chosenNext } : {}) })
      });
      const data = (await res.json().catch(() => ({}))) as { data?: { state: RunState }; message?: string };
      if (!res.ok) {
        setError(data.message ?? `No se pudo registrar el paso (error ${res.status}).`);
        return;
      }
      await refresh(run.runId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Fallo de red");
    } finally {
      setBusy(false);
    }
  };

  if (!run) {
    return (
      <div>
        <p className="muted" style={{ fontSize: "0.9rem" }}>
          Aun no hay una corrida de protocolo para este expediente.
        </p>
        {canRun ? (
          <button type="button" className="button primary" onClick={startRun} disabled={busy} style={{ marginTop: "0.5rem" }}>
            <Play size={16} aria-hidden="true" /> {busy ? "Iniciando..." : "Iniciar protocolo"}
          </button>
        ) : (
          <span className="status-pill">
            <Lock size={14} aria-hidden="true" /> Requiere permiso de ejecucion
          </span>
        )}
        {error ? <p className="status-pill critical" style={{ marginTop: "0.5rem" }}>{error}</p> : null}
      </div>
    );
  }

  const active = run.steps.find((step) => step.id === run.activeStepId) ?? null;
  const isDecision = run.branches.length > 1;

  return (
    <div aria-label={`Corrida de protocolo ${run.protocolCode ?? ""}`}>
      <div className="status-row" style={{ marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <span className={`status-pill ${run.status === "completado" ? "safe" : run.status === "bloqueado" ? "critical" : ""}`}>
          {run.status === "completado" ? <CheckCircle2 size={14} aria-hidden="true" /> : run.status === "bloqueado" ? <ShieldAlert size={14} aria-hidden="true" /> : <CircleDot size={14} aria-hidden="true" />}
          {run.status === "completado" ? "Protocolo completado" : run.status === "bloqueado" ? "Protocolo bloqueado" : "En curso"}
        </span>
        {run.protocolVersion ? <span className="status-pill">v{run.protocolVersion}</span> : null}
      </div>

      {run.steps.map((step, index) => {
        const isActive = step.id === run.activeStepId;
        return (
          <div className="protocol-step" key={step.id} style={isActive ? { outline: "2px solid var(--brand, #0f766e)", borderRadius: "10px" } : undefined}>
            <span className="step-index">{index + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <p className="muted">
                {step.kind === "decision" ? "Decision · " : ""}T+{step.dueMinute} min · Evidencia {step.requiredEvidence ? "requerida" : "opcional"}
                {step.ownerRole ? ` · ${step.ownerRole}` : ""}
              </p>
            </div>
            <span className={`status-pill ${STATUS_CLASS[step.status]}`}>{STATUS_LABEL[step.status]}</span>
          </div>
        );
      })}

      {active && run.status === "activo" ? (
        <div className="panel" style={{ marginTop: "0.75rem", background: "rgba(15,118,110,0.06)" }}>
          <p className="eyebrow" style={{ margin: 0 }}>Paso activo</p>
          <strong>{active.title}</strong>
          {isDecision ? (
            <div style={{ marginTop: "0.5rem" }}>
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                <GitBranch size={14} aria-hidden="true" style={{ verticalAlign: "middle" }} /> Elige la rama para avanzar:
              </p>
              <div className="status-row" style={{ flexWrap: "wrap", gap: "0.4rem" }}>
                {run.branches.map((option) => {
                  const target = run.steps.find((step) => step.id === option.to);
                  const label = option.condition ?? target?.title ?? option.to;
                  return (
                    <button
                      key={option.to}
                      type="button"
                      className={`button${branch === option.to ? " primary" : ""}`}
                      onClick={() => setBranch(option.to)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                className="button primary"
                style={{ marginTop: "0.6rem" }}
                disabled={busy || !branch}
                onClick={() => act(active.id, "completado", branch)}
              >
                <CheckCircle2 size={16} aria-hidden="true" /> Completar y seguir rama
              </button>
            </div>
          ) : (
            <div className="status-row" style={{ marginTop: "0.6rem", gap: "0.5rem" }}>
              <button type="button" className="button primary" disabled={busy} onClick={() => act(active.id, "completado")}>
                <CheckCircle2 size={16} aria-hidden="true" /> Completar paso
              </button>
            </div>
          )}
          <button type="button" className="button" style={{ marginTop: "0.6rem" }} disabled={busy} onClick={() => act(active.id, "bloqueado")}>
            <ShieldAlert size={16} aria-hidden="true" /> Marcar bloqueado
          </button>
          {error ? <p className="status-pill critical" style={{ marginTop: "0.5rem" }}>{error}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
