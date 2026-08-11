import type { ProtocolRun } from "@/server/domain/types";

export function ProtocolStepper({ run }: { run: ProtocolRun }) {
  return (
    <div aria-label={`Protocolo ${run.protocolCode} version ${run.version}`}>
      {run.steps.map((step, index) => (
        <div className="protocol-step" key={step.id}>
          <span className="step-index">{index + 1}</span>
          <div>
            <strong>{step.title}</strong>
            <p className="muted">T+{step.dueMinute} min · Evidencia {step.requiredEvidence ? "requerida" : "opcional"}</p>
          </div>
          <span className="status-pill">{step.status}</span>
        </div>
      ))}
    </div>
  );
}
