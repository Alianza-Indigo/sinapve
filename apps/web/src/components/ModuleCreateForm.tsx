"use client";

import { useMemo, useState } from "react";
import type { PlatformModuleId } from "@/server/domain/types";

const creatableModules: PlatformModuleId[] = [
  "protocols",
  "analytics",
  "institutions",
  "directory",
  "training",
  "community",
  "communications",
  "audit",
  "informes",
  "privacy",
  "adaptations",
  "configuration",
  "public-portal",
  "notifications",
  "integrations"
];

export function ModuleCreateForm({ moduleId }: { moduleId: PlatformModuleId }) {
  const [status, setStatus] = useState<string>("");
  const canCreate = creatableModules.includes(moduleId);
  const fields = useMemo(() => fieldConfig(moduleId), [moduleId]);

  if (!canCreate) return null;

  async function submit(formData: FormData) {
    setStatus("Guardando...");
    const body: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value.trim()) body[key] = value.trim();
    }
    if (body.requiredForCertification === "on") body.requiredForCertification = true;
    if (typeof body.metadata === "string") {
      body.metadata = parseJsonObject(body.metadata);
    }
  if (typeof body.value === "string") {
    body.value = parseJsonObject(body.value);
  }
  if (typeof body.scope === "string") {
    body.scope = parseJsonObject(body.scope);
  }
  for (const key of ["metadata", "territory", "contactPolicy", "channelPlan", "contentPolicy", "annualPlan", "quorumRules", "risks", "evidence", "payload", "scenario", "result", "filters", "evaluation"]) {
    if (typeof body[key] === "string") body[key] = parseJsonObject(body[key]);
  }
  for (const key of ["widgets", "dataCategories", "anomalyFlags"]) {
    if (typeof body[key] === "string") body[key] = parseJsonArray(body[key]);
  }
  for (const key of ["score", "retentionDays"]) {
    if (typeof body[key] === "string") body[key] = Number(body[key]);
  }

    const response = await fetch(`/api/v1/modules/${moduleId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      setStatus(`No se pudo guardar (${response.status})`);
      return;
    }

    setStatus("Registro guardado. Recarga para ver la lista actualizada.");
  }

  return (
    <form className="form" action={submit}>
      {fields.map((field) => (
        <div className="field" key={field.name}>
          <label htmlFor={field.name}>{field.label}</label>
          {field.kind === "textarea" ? (
            <textarea id={field.name} name={field.name} placeholder={field.placeholder} />
          ) : field.kind === "checkbox" ? (
            <input id={field.name} name={field.name} type="checkbox" />
          ) : (
            <input id={field.name} name={field.name} type={field.kind} placeholder={field.placeholder} />
          )}
        </div>
      ))}
      <button className="button primary" type="submit">
        Crear registro
      </button>
      {status ? <p className="muted">{status}</p> : null}
    </form>
  );
}

function parseJsonObject(value: string) {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseJsonArray(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function fieldConfig(moduleId: PlatformModuleId) {
  const base = [{ name: "title", label: "Titulo", kind: "text", placeholder: "Nombre del registro" }];
  if (moduleId === "protocols") {
    return [
      { name: "recordType", label: "Tipo", kind: "text", placeholder: "approval, simulation o migration" },
      { name: "protocolCode", label: "Protocolo", kind: "text", placeholder: "school_protection_v1" },
      { name: "approvalType", label: "Aprobacion", kind: "text", placeholder: "tecnica, legal, accesibilidad" },
      { name: "resourceId", label: "Caso", kind: "text", placeholder: "Solo migration" },
      { name: "toProtocolCode", label: "Nuevo protocolo", kind: "text", placeholder: "Solo migration" },
      { name: "justification", label: "Justificacion", kind: "textarea", placeholder: "Motivo de migracion" },
      { name: "scenario", label: "Escenario JSON", kind: "textarea", placeholder: "{\"riesgo\":\"grave\"}" },
      { name: "result", label: "Resultado JSON", kind: "textarea", placeholder: "{\"sla\":\"ok\"}" }
    ];
  }
  if (moduleId === "analytics") {
    return [
      { name: "recordType", label: "Tipo", kind: "text", placeholder: "dashboard, metric_export, ai_model o ai_decision" },
      ...base,
      { name: "audience", label: "Audiencia", kind: "text", placeholder: "federal, estatal, auditoria" },
      { name: "widgets", label: "Widgets JSON", kind: "textarea", placeholder: "[{\"metricCodes\":[\"sla\"]}]" },
      { name: "metricCode", label: "Metrica", kind: "text", placeholder: "SLA_PRIMERA_RESPUESTA" },
      { name: "exportType", label: "Exportacion", kind: "text", placeholder: "csv, pdf, dashboard" },
      { name: "purpose", label: "Proposito", kind: "text", placeholder: "Evaluacion autorizada" },
      { name: "provider", label: "Proveedor IA", kind: "text", placeholder: "gateway, openai..." },
      { name: "model", label: "Modelo IA", kind: "text", placeholder: "Modelo registrado" },
      { name: "owner", label: "Responsable", kind: "text", placeholder: "Unidad responsable" },
      { name: "evaluation", label: "Evaluacion JSON", kind: "textarea", placeholder: "{\"precision\":0.9}" }
    ];
  }
  if (moduleId === "training") {
    return [
      ...base,
      { name: "audienceRole", label: "Rol destinatario", kind: "text", placeholder: "APVE, UEPE, DIRECTOR..." },
      { name: "requiredForCertification", label: "Requerido para certificacion", kind: "checkbox", placeholder: "" },
      { name: "metadata", label: "Metadatos JSON", kind: "textarea", placeholder: "{\"duracion\":\"20h\"}" }
    ];
  }
  if (moduleId === "community") {
    return [
      ...base,
      { name: "initiativeType", label: "Tipo de iniciativa", kind: "text", placeholder: "brigada, campana, familia" },
      { name: "organizationPublicId", label: "Organizacion", kind: "text", placeholder: "ID publico opcional" },
      { name: "metadata", label: "Salvaguardas JSON", kind: "textarea", placeholder: "{\"moderacion\":true}" }
    ];
  }
  if (moduleId === "institutions") {
    return [
      { name: "title", label: "Nombre", kind: "text", placeholder: "CEC Plantel / Equipo EMIR..." },
      { name: "organizationPublicId", label: "Organizacion", kind: "text", placeholder: "ID publico" },
      { name: "bodyType", label: "Tipo de cuerpo", kind: "text", placeholder: "CEC, UAT, UEPE, CMCE, EMIR" },
      { name: "teamName", label: "Equipo EMIR", kind: "text", placeholder: "Solo si es despacho/guardia EMIR" },
      { name: "quorumRules", label: "Quorum JSON", kind: "textarea", placeholder: "{\"minimo\":3}" },
      { name: "annualPlan", label: "Plan anual JSON", kind: "textarea", placeholder: "{\"acciones\":[]}" }
    ];
  }
  if (moduleId === "directory") {
    return [
      { name: "title", label: "Servicio", kind: "text", placeholder: "DIF municipal, salud mental..." },
      { name: "serviceType", label: "Tipo", kind: "text", placeholder: "DIF, salud, fiscalia, emergencia" },
      { name: "organizationPublicId", label: "Organizacion", kind: "text", placeholder: "ID publico opcional" },
      { name: "territory", label: "Territorio JSON", kind: "textarea", placeholder: "{\"estado\":\"CHH\"}" },
      { name: "contactPolicy", label: "Politica de contacto JSON", kind: "textarea", placeholder: "{\"canal\":\"api\"}" }
    ];
  }
  if (moduleId === "communications") {
    return [
      ...base,
      { name: "audience", label: "Audiencia", kind: "text", placeholder: "familias, estudiantes, personal" },
      { name: "language", label: "Idioma", kind: "text", placeholder: "es, rarámuri..." },
      { name: "territory", label: "Territorio JSON", kind: "textarea", placeholder: "{\"nivel\":\"secundaria\"}" },
      { name: "channelPlan", label: "Canales JSON", kind: "textarea", placeholder: "{\"web\":true,\"sms\":false}" }
    ];
  }
  if (moduleId === "audit") {
    return [
      ...base,
      { name: "resourceType", label: "Tipo de recurso", kind: "text", placeholder: "case, report, platform" },
      { name: "resourceId", label: "ID recurso", kind: "text", placeholder: "folio o ID" },
      { name: "severity", label: "Severidad", kind: "text", placeholder: "baja, media, alta, critica" },
      { name: "metadata", label: "Plan correctivo JSON", kind: "textarea", placeholder: "{\"accion\":\"...\"}" }
    ];
  }
  if (moduleId === "informes") {
    return [
      ...base,
      { name: "reportType", label: "Tipo de informe", kind: "text", placeholder: "ejecutivo, auditoria, publico" },
      { name: "narrative", label: "Narrativa", kind: "textarea", placeholder: "Resumen sujeto a aprobacion humana" }
    ];
  }
  if (moduleId === "privacy") {
    return [
      { name: "recordType", label: "Tipo", kind: "text", placeholder: "request, processing o retention" },
      { name: "requestType", label: "Tipo de solicitud", kind: "text", placeholder: "acceso, rectificacion, cancelacion, oposicion" },
      { name: "requesterContact", label: "Contacto del titular", kind: "text", placeholder: "Medio seguro de contacto" },
      { name: "scope", label: "Alcance JSON", kind: "textarea", placeholder: "{\"folio\":\"...\"}" },
      { name: "purpose", label: "Finalidad", kind: "text", placeholder: "Atencion de reportes" },
      { name: "audience", label: "Audiencia", kind: "text", placeholder: "APVE, privacidad, auditoria" },
      { name: "dataCategories", label: "Categorias JSON", kind: "textarea", placeholder: "[\"reportes\",\"evidencia\"]" },
      { name: "legalBasis", label: "Base legal", kind: "text", placeholder: "Interes superior / obligacion legal" },
      { name: "retentionRule", label: "Regla de retencion", kind: "text", placeholder: "casos_sensibles_v1" },
      { name: "category", label: "Categoria", kind: "text", placeholder: "expediente, evidencia, auditoria" },
      { name: "jurisdiction", label: "Jurisdiccion", kind: "text", placeholder: "MX" },
      { name: "retentionDays", label: "Dias de retencion", kind: "number", placeholder: "1825" }
    ];
  }
  if (moduleId === "adaptations") {
    return [
      ...base,
      { name: "organizationPublicId", label: "UEPE solicitante", kind: "text", placeholder: "ID publico opcional" },
      { name: "population", label: "Poblacion", kind: "text", placeholder: "contexto rural, lengua indigena..." },
      { name: "justification", label: "Justificacion", kind: "textarea", placeholder: "Motivo, riesgos y evidencia" },
      { name: "territory", label: "Territorio JSON", kind: "textarea", placeholder: "{\"estado\":\"CHH\"}" },
      { name: "risks", label: "Riesgos JSON", kind: "textarea", placeholder: "{\"privacidad\":\"...\"}" },
      { name: "evidence", label: "Evidencia JSON", kind: "textarea", placeholder: "{\"fuentes\":[]}" }
    ];
  }
  if (moduleId === "configuration") {
    return [
      ...base,
      { name: "value", label: "Valor JSON", kind: "textarea", placeholder: "{\"activo\":true}" },
      { name: "metadata", label: "Alcance JSON", kind: "textarea", placeholder: "{\"estado\":\"CHH\"}" }
    ];
  }
  if (moduleId === "public-portal") {
    return [
      ...base,
      { name: "resourceType", label: "Tipo de recurso", kind: "text", placeholder: "guia, protocolo, informe" },
      { name: "audience", label: "Audiencia", kind: "text", placeholder: "publico, familias, estudiantes" },
      { name: "status", label: "Estado", kind: "text", placeholder: "borrador o publicado" }
    ];
  }
  if (moduleId === "integrations") {
    return [
      { name: "title", label: "Nombre", kind: "text", placeholder: "Evento externo" },
      { name: "idempotencyKey", label: "Idempotency key", kind: "text", placeholder: "clave unica del emisor" },
      { name: "source", label: "Fuente", kind: "text", placeholder: "directorio_estatal, dif..." },
      { name: "eventType", label: "Tipo de evento", kind: "text", placeholder: "service.updated" },
      { name: "signatureDigest", label: "Firma/digest", kind: "text", placeholder: "sha256=..." },
      { name: "payload", label: "Payload JSON", kind: "textarea", placeholder: "{\"id\":\"...\"}" }
    ];
  }
  return [
    ...base,
    { name: "priority", label: "Prioridad", kind: "text", placeholder: "informativa, urgente, critica" },
    { name: "channel", label: "Canal", kind: "text", placeholder: "in_app, email, sms" },
    { name: "safeBody", label: "Plantilla segura", kind: "textarea", placeholder: "Texto sin datos sensibles para canales externos" }
  ];
}
