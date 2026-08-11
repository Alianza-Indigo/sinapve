"use client";

import { AlertTriangle, Pause, Send } from "lucide-react";
import { useState } from "react";
import { queueReportDraft } from "@/lib/offline/reports";

type SubmitState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; folio: string }
  | { status: "queued" }
  | { status: "error"; message: string };

export function ReportForm() {
  const [submitState, setSubmitState] = useState<SubmitState>({ status: "idle" });

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitState({ status: "submitting" });
    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries()) as Record<string, string>;

    // Sin conexión: guarda el borrador cifrado localmente y se enviará al
    // reconectar (13.1). No se pierde la solicitud de ayuda.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      try {
        await queueReportDraft(payload);
        setSubmitState({ status: "queued" });
        form.reset();
      } catch {
        setSubmitState({ status: "error", message: "No hay conexion y no se pudo guardar localmente. Usa el canal de emergencia." });
      }
      return;
    }

    try {
      const response = await fetch("/api/v1/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        setSubmitState({ status: "error", message: "No se pudo registrar. Intenta de nuevo o usa el canal de emergencia." });
        return;
      }
      const data = (await response.json()) as { folio: string };
      setSubmitState({ status: "success", folio: data.folio });
      form.reset();
    } catch {
      // Falla de red durante el envío: se guarda offline para reintento.
      try {
        await queueReportDraft(payload);
        setSubmitState({ status: "queued" });
        form.reset();
      } catch {
        setSubmitState({ status: "error", message: "No se pudo registrar ni guardar localmente. Usa el canal de emergencia." });
      }
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <div className="status-row">
        <a className="button danger" href="tel:911">
          <AlertTriangle size={18} aria-hidden="true" />
          Emergencia o peligro inmediato
        </a>
        <button className="button" type="button">
          <Pause size={18} aria-hidden="true" />
          Necesito una pausa
        </button>
      </div>

      <div className="form-row">
        <div className="field" style={{ flex: "1 1 180px" }}>
          <label htmlFor="mode">Tipo de reporte</label>
          <select id="mode" name="mode" defaultValue="anonimo" required>
            <option value="anonimo">Anonimo</option>
            <option value="confidencial">Confidencial</option>
            <option value="identificado">Identificado</option>
          </select>
        </div>
        <div className="field" style={{ flex: "1 1 180px" }}>
          <label htmlFor="reporterType">Quien reporta</label>
          <select id="reporterType" name="reporterType" defaultValue="estudiante" required>
            <option value="estudiante">Estudiante</option>
            <option value="familia">Familia o tutor</option>
            <option value="personal">Personal escolar</option>
            <option value="comunidad">Comunidad</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="organizationPublicId">ID publico del plantel</label>
        <input id="organizationPublicId" name="organizationPublicId" placeholder="Ej. SEP-CHH-CUU-0001" required />
      </div>

      <div className="field">
        <label htmlFor="schoolName">Plantel o ubicacion</label>
        <input id="schoolName" name="schoolName" placeholder="Ej. Secundaria Norte" required />
      </div>

      <div className="field">
        <label htmlFor="safetyNow">Seguridad actual</label>
        <select id="safetyNow" name="safetyNow" defaultValue="segura" required>
          <option value="segura">La persona esta segura ahora</option>
          <option value="riesgo">Hay riesgo o puede repetirse pronto</option>
          <option value="emergencia">Hay peligro inmediato</option>
        </select>
      </div>

      <div className="field">
        <label htmlFor="description">Que paso o que senal preocupa</label>
        <textarea id="description" name="description" minLength={12} placeholder="Puedes contar solo lo necesario. No tienes que repetirlo despues." required />
      </div>

      <p className="muted">Antes de enviar, el sistema registra folio y alcance. La identidad confidencial solo se muestra a perfiles autorizados.</p>

      <button className="button primary" type="submit" disabled={submitState.status === "submitting"}>
        <Send size={18} aria-hidden="true" />
        {submitState.status === "submitting" ? "Registrando..." : "Enviar solicitud"}
      </button>

      {submitState.status === "success" ? (
        <p className="status-pill safe" role="status">
          Folio seguro: {submitState.folio}
        </p>
      ) : null}
      {submitState.status === "queued" ? (
        <p className="status-pill safe" role="status">
          Sin conexion: tu solicitud quedo guardada de forma cifrada y se enviara automaticamente al recuperar la red.
        </p>
      ) : null}
      {submitState.status === "error" ? (
        <p className="status-pill critical" role="alert">
          {submitState.message}
        </p>
      ) : null}
    </form>
  );
}
