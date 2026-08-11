import { z } from "zod";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { createCaseControlRecord, getCase } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { canReadCase, hasCapability } from "@/server/domain/access";
import { FieldEncryptionNotConfiguredError } from "@/server/security/field-crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const controlSchema = z.discriminatedUnion("controlType", [
  z.object({
    controlType: z.literal("participant"),
    relationship: z.string().min(2).max(120),
    displayLabel: z.string().min(2).max(180),
    details: z.string().max(4000).optional()
  }),
  z.object({
    controlType: z.literal("protection_measure"),
    measureType: z.string().min(2).max(120),
    summary: z.string().min(2).max(4000),
    status: z.string().min(2).max(80).optional()
  }),
  z.object({
    controlType: z.literal("consent"),
    subjectLabel: z.string().min(2).max(180),
    consentType: z.string().min(2).max(120),
    legalBasis: z.string().max(240).optional(),
    status: z.string().min(2).max(80).optional(),
    evidence: z.string().max(4000).optional()
  }),
  z.object({
    controlType: z.literal("clinical_compartment"),
    authorizedRole: z.string().min(2).max(120),
    summary: z.string().min(2).max(4000),
    status: z.string().min(2).max(80).optional()
  }),
  z.object({
    controlType: z.literal("adendum"),
    fieldName: z.string().min(2).max(120),
    value: z.string().min(1).max(8000),
    reason: z.string().min(4).max(1000)
  }),
  z.object({
    controlType: z.literal("mediation_review"),
    eligible: z.boolean(),
    blockedReasons: z.array(z.string().min(2).max(200)).optional()
  })
]);

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) {
    return Response.json({ error: "unauthorized", message: "Falta identidad institucional en encabezados seguros." }, { status: 401 });
  }

  const { caseId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = controlSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_case_control", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const caseFile = await getCase(caseId);
    if (!caseFile) return Response.json({ error: "not_found" }, { status: 404 });
    if (!canReadCase(actor, caseFile) || !hasCapability(actor, "case:update")) {
      return Response.json({ error: "forbidden" }, { status: 403 });
    }

    const data = await createCaseControlRecord({ ...parsed.data, caseId, actor });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    if (error instanceof FieldEncryptionNotConfiguredError) {
      return Response.json({ error: "field_encryption_not_configured", message: error.message }, { status: 503 });
    }
    throw error;
  }
}
