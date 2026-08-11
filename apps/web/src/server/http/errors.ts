import { DatabaseNotConfiguredError } from "../db";
import { FieldEncryptionNotConfiguredError } from "../security/field-crypto";
import { StepUpRequiredError } from "../domain/mfa";

// Mapeo central de errores de dominio a respuestas HTTP seguras. No expone
// datos sensibles ni trazas internas (12.1).
const notFoundMessages = new Set([
  "CASE_NOT_FOUND",
  "REPORT_NOT_FOUND",
  "REFERRAL_NOT_FOUND",
  "USER_NOT_FOUND",
  "SESSION_NOT_FOUND",
  "EMIR_DISPATCH_NOT_FOUND",
  "INSTITUTIONAL_BODY_NOT_FOUND",
  "INSTITUTIONAL_SESSION_NOT_FOUND",
  "TRAINING_PROGRAM_NOT_FOUND",
  "TRAINING_ENROLLMENT_NOT_FOUND",
  "INTERVENTION_PLAN_NOT_FOUND",
  "CAMPAIGN_NOT_FOUND",
  "CONTEXTUAL_ADAPTATION_NOT_FOUND",
  "GENERATED_REPORT_NOT_FOUND",
  "DASHBOARD_NOT_FOUND",
  "PROTOCOL_RUN_NOT_FOUND",
  "PROTOCOL_VERSION_NOT_FOUND",
  "NOTIFICATION_NOT_FOUND"
]);

const unprocessableMessages = new Set([
  "ORGANIZATION_NOT_FOUND",
  "INVALID_DISPATCH_TRANSITION",
  "INVALID_ADAPTATION_REVIEW",
  "TRAINING_INCOMPLETE",
  "CAMPAIGN_APPROVAL_INCOMPLETE",
  "ADAPTATION_REVIEW_INCOMPLETE",
  "DASHBOARD_VALIDATION_FAILED"
]);

export function mapDomainError(error: unknown): Response | null {
  if (error instanceof DatabaseNotConfiguredError) {
    return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
  }
  if (error instanceof FieldEncryptionNotConfiguredError) {
    return Response.json({ error: "field_encryption_not_configured", message: error.message }, { status: 503 });
  }
  if (error instanceof StepUpRequiredError) {
    return Response.json(
      { error: "step_up_required", message: "Operacion elevada: requiere segundo factor vigente (x-sinapve-mfa-verified)." },
      { status: 401 }
    );
  }
  if (error instanceof Error) {
    if (notFoundMessages.has(error.message)) {
      return Response.json({ error: error.message.toLowerCase() }, { status: 404 });
    }
    if (unprocessableMessages.has(error.message)) {
      const details = (error as Error & { details?: string[] }).details;
      return Response.json({ error: error.message.toLowerCase(), details }, { status: 422 });
    }
  }
  return null;
}
