import { createReport } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { FieldEncryptionNotConfiguredError } from "@/server/security/field-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EP-02 / 6.2: recepción de reportes por SMS entrante (webhook del proveedor).
// Activable por configuración: requiere SINAPVE_SMS_INBOUND_TOKEN (verificación
// del webhook) y SINAPVE_SMS_INTAKE_ORG (plantel/ingreso institucional al que se
// asocia). Sin configurar, responde not_configured. No exige registro (6.2).
export async function POST(request: Request) {
  const token = process.env.SINAPVE_SMS_INBOUND_TOKEN;
  const intakeOrg = process.env.SINAPVE_SMS_INTAKE_ORG;
  if (!token || !intakeOrg) {
    return Response.json({ error: "sms_inbound_not_configured" }, { status: 503 });
  }

  const provided = request.headers.get("x-sms-token") ?? new URL(request.url).searchParams.get("token");
  if (provided !== token) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  // Acepta JSON o form-urlencoded (formatos típicos de pasarelas SMS).
  const contentType = request.headers.get("content-type") ?? "";
  let from = "";
  let text = "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => ({}))) as { from?: string; text?: string; body?: string; Body?: string; From?: string };
    from = String(body.from ?? body.From ?? "");
    text = String(body.text ?? body.body ?? body.Body ?? "");
  } else {
    const form = await request.formData().catch(() => null);
    from = String(form?.get("From") ?? form?.get("from") ?? "");
    text = String(form?.get("Body") ?? form?.get("text") ?? "");
  }

  text = text.trim();
  if (text.length < 12) {
    return Response.json({ error: "message_too_short", message: "El mensaje debe describir la situacion (min 12 caracteres)." }, { status: 400 });
  }

  try {
    const report = await createReport({
      mode: "confidencial",
      reporterType: "comunidad",
      organizationPublicId: intakeOrg,
      schoolName: "Ingreso por SMS",
      description: text,
      safetyNow: "segura",
      contactPreference: { channel: "sms", from: from ? "presente" : "ausente" }
    });
    return Response.json({ id: report.id, folio: report.folio, status: report.status }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured" }, { status: 503 });
    if (error instanceof FieldEncryptionNotConfiguredError) return Response.json({ error: "field_encryption_not_configured" }, { status: 503 });
    if (error instanceof Error && error.message === "ORGANIZATION_NOT_FOUND") return Response.json({ error: "intake_org_not_found" }, { status: 422 });
    throw error;
  }
}
