import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import {
  createAiGovernanceRecord,
  createAnalyticsGovernanceRecord,
  createCommunicationCampaign,
  createCommunityInitiative,
  createCommunityProposal,
  createContextualAdaptation,
  createEmirDispatch,
  createGovernanceRecord,
  createInstitutionalBody,
  createIntegrationEvent,
  createNotificationTemplate,
  createPrivacyRequest,
  createPrivacyGovernanceRecord,
  createProtocolGovernanceRecord,
  createServiceDirectoryEntry,
  createTrainingOperationsRecord,
  createTrainingProgram,
  listModuleRecords
} from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { canReadModule } from "@/server/domain/access";
import type { PlatformModuleId } from "@/server/domain/types";
import { FieldEncryptionNotConfiguredError } from "@/server/security/field-crypto";

const validModuleIds = [
  "reports",
  "cases",
  "protocols",
  "risk",
  "map",
  "interventions",
  "escalations",
  "institutions",
  "directory",
  "training",
  "community",
  "communications",
  "audit",
  "analytics",
  "informes",
  "privacy",
  "adaptations",
  "configuration",
  "public-portal",
  "notifications",
  "integrations"
] satisfies PlatformModuleId[];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) {
    return Response.json({ error: "unauthorized", message: "Falta identidad institucional en encabezados seguros." }, { status: 401 });
  }

  const { moduleId } = await params;
  if (!validModuleIds.includes(moduleId as PlatformModuleId)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (!canReadModule(actor, moduleId)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const data = await listModuleRecords(moduleId as PlatformModuleId);
  return Response.json({ data });
}

const moduleRecordSchema = z.object({
  title: z.string().min(3).max(240).optional(),
  audienceRole: z.string().min(2).max(120).optional(),
  requiredForCertification: z.boolean().optional(),
  organizationPublicId: z.string().min(2).max(120).optional(),
  initiativeType: z.string().min(2).max(120).optional(),
  status: z.string().min(2).max(80).optional(),
  metadata: z.record(z.unknown()).optional(),
  resourceType: z.string().min(2).max(120).optional(),
  resourceId: z.string().min(2).max(160).optional(),
  severity: z.string().min(2).max(80).optional(),
  reportType: z.string().min(2).max(120).optional(),
  narrative: z.string().max(8000).optional(),
  value: z.record(z.unknown()).optional(),
  audience: z.string().min(2).max(120).optional(),
  priority: z.string().min(2).max(80).optional(),
  channel: z.string().min(2).max(80).optional(),
  requestType: z.string().min(2).max(120).optional(),
  requesterContact: z.string().min(4).max(240).optional(),
  scope: z.record(z.unknown()).optional(),
  name: z.string().min(2).max(220).optional(),
  bodyType: z.string().min(2).max(80).optional(),
  teamName: z.string().min(2).max(220).optional(),
  serviceType: z.string().min(2).max(120).optional(),
  population: z.string().min(2).max(220).optional(),
  justification: z.string().min(8).max(4000).optional(),
  language: z.string().min(2).max(40).optional(),
  safeBody: z.string().min(2).max(2000).optional(),
  idempotencyKey: z.string().min(4).max(200).optional(),
  source: z.string().min(2).max(120).optional(),
  eventType: z.string().min(2).max(120).optional(),
  signatureDigest: z.string().max(240).optional(),
  payload: z.record(z.unknown()).optional(),
  territory: z.record(z.unknown()).optional(),
  contactPolicy: z.record(z.unknown()).optional(),
  channelPlan: z.record(z.unknown()).optional(),
  contentPolicy: z.record(z.unknown()).optional(),
  annualPlan: z.record(z.unknown()).optional(),
  quorumRules: z.record(z.unknown()).optional(),
  risks: z.record(z.unknown()).optional(),
  evidence: z.record(z.unknown()).optional(),
  recordType: z.string().min(2).max(80).optional(),
  protocolCode: z.string().min(2).max(120).optional(),
  fromProtocolCode: z.string().min(2).max(120).optional(),
  toProtocolCode: z.string().min(2).max(120).optional(),
  approvalType: z.string().min(2).max(120).optional(),
  scenario: z.record(z.unknown()).optional(),
  result: z.record(z.unknown()).optional(),
  programPublicId: z.string().min(2).max(120).optional(),
  modality: z.string().min(2).max(120).optional(),
  enrollmentId: z.string().uuid().optional(),
  assessmentType: z.string().min(2).max(120).optional(),
  score: z.number().int().min(0).max(100).optional(),
  anomalyFlags: z.array(z.string().min(2).max(120)).optional(),
  body: z.string().min(2).max(8000).optional(),
  widgets: z.array(z.record(z.unknown())).optional(),
  filters: z.record(z.unknown()).optional(),
  metricCode: z.string().min(2).max(120).optional(),
  exportType: z.string().min(2).max(120).optional(),
  purpose: z.string().min(2).max(240).optional(),
  provider: z.string().min(2).max(120).optional(),
  model: z.string().min(2).max(160).optional(),
  owner: z.string().min(2).max(160).optional(),
  evaluation: z.record(z.unknown()).optional(),
  modelPublicId: z.string().min(2).max(120).optional(),
  prompt: z.string().min(1).max(8000).optional(),
  response: z.string().min(1).max(8000).optional(),
  humanDecision: z.string().max(500).optional(),
  dataCategories: z.array(z.string().min(2).max(120)).optional(),
  legalBasis: z.string().min(2).max(240).optional(),
  retentionRule: z.string().min(2).max(240).optional(),
  category: z.string().min(2).max(120).optional(),
  jurisdiction: z.string().min(2).max(120).optional(),
  retentionDays: z.number().int().positive().optional(),
  legalHold: z.boolean().optional(),
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const actor = await resolveActor(request.headers);
  if (!actor) {
    return Response.json({ error: "unauthorized", message: "Falta identidad institucional en encabezados seguros." }, { status: 401 });
  }

  const { moduleId } = await params;
  if (!validModuleIds.includes(moduleId as PlatformModuleId)) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (!canReadModule(actor, moduleId)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = moduleRecordSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_module_record", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (moduleId === "training") {
      if (parsed.data.recordType === "cohort") {
        if (!parsed.data.programPublicId) return Response.json({ error: "missing_program" }, { status: 400 });
        if (!parsed.data.modality) return Response.json({ error: "missing_modality" }, { status: 400 });
        const data = await createTrainingOperationsRecord({
          recordType: "cohort",
          programPublicId: parsed.data.programPublicId,
          modality: parsed.data.modality,
          startsAt: parsed.data.startsAt,
          endsAt: parsed.data.endsAt,
          accessibilityEvidence: parsed.data.evidence,
          actor
        });
        return Response.json({ data }, { status: 201 });
      }
      if (parsed.data.recordType === "assessment") {
        if (!parsed.data.enrollmentId) return Response.json({ error: "missing_enrollment" }, { status: 400 });
        if (!parsed.data.assessmentType) return Response.json({ error: "missing_assessment_type" }, { status: 400 });
        const data = await createTrainingOperationsRecord({
          recordType: "assessment",
          enrollmentId: parsed.data.enrollmentId,
          assessmentType: parsed.data.assessmentType,
          score: parsed.data.score,
          status: parsed.data.status,
          anomalyFlags: parsed.data.anomalyFlags,
          actor
        });
        return Response.json({ data }, { status: 201 });
      }
      if (!parsed.data.title) return Response.json({ error: "missing_title" }, { status: 400 });
      if (!parsed.data.audienceRole) return Response.json({ error: "missing_audience_role" }, { status: 400 });
      const data = await createTrainingProgram({
        title: parsed.data.title,
        audienceRole: parsed.data.audienceRole,
        requiredForCertification: parsed.data.requiredForCertification,
        metadata: parsed.data.metadata,
        actor
      });
      return Response.json({ data }, { status: 201 });
    }

    if (moduleId === "community") {
      if (parsed.data.recordType === "proposal") {
        if (!parsed.data.title) return Response.json({ error: "missing_title" }, { status: 400 });
        if (!parsed.data.body) return Response.json({ error: "missing_body" }, { status: 400 });
        const data = await createCommunityProposal({
          title: parsed.data.title,
          body: parsed.data.body,
          organizationPublicId: parsed.data.organizationPublicId,
          actor
        });
        return Response.json({ data }, { status: 201 });
      }
      if (!parsed.data.title) return Response.json({ error: "missing_title" }, { status: 400 });
      if (!parsed.data.initiativeType) return Response.json({ error: "missing_initiative_type" }, { status: 400 });
      const data = await createCommunityInitiative({
        title: parsed.data.title,
        initiativeType: parsed.data.initiativeType,
        organizationPublicId: parsed.data.organizationPublicId,
        safeguards: parsed.data.metadata,
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
        actor
      });
      return Response.json({ data }, { status: 201 });
    }

    if (moduleId === "privacy") {
      if (parsed.data.recordType === "processing") {
        if (!parsed.data.purpose || !parsed.data.audience || !parsed.data.legalBasis || !parsed.data.retentionRule) {
          return Response.json({ error: "missing_processing_fields" }, { status: 400 });
        }
        const data = await createPrivacyGovernanceRecord({
          recordType: "processing",
          purpose: parsed.data.purpose,
          audience: parsed.data.audience,
          dataCategories: parsed.data.dataCategories,
          legalBasis: parsed.data.legalBasis,
          retentionRule: parsed.data.retentionRule,
          actor
        });
        return Response.json({ data }, { status: 201 });
      }
      if (parsed.data.recordType === "retention") {
        if (!parsed.data.category || !parsed.data.jurisdiction || !parsed.data.retentionDays) {
          return Response.json({ error: "missing_retention_fields" }, { status: 400 });
        }
        const data = await createPrivacyGovernanceRecord({
          recordType: "retention",
          category: parsed.data.category,
          jurisdiction: parsed.data.jurisdiction,
          retentionDays: parsed.data.retentionDays,
          legalHold: parsed.data.legalHold,
          actor
        });
        return Response.json({ data }, { status: 201 });
      }
      if (!parsed.data.requestType) return Response.json({ error: "missing_request_type" }, { status: 400 });
      if (!parsed.data.requesterContact) return Response.json({ error: "missing_requester_contact" }, { status: 400 });
      const data = await createPrivacyRequest({
        requestType: parsed.data.requestType,
        requesterContact: parsed.data.requesterContact,
        scope: parsed.data.scope ?? parsed.data.metadata
      });
      return Response.json({ data }, { status: 201 });
    }

    if (moduleId === "institutions") {
      if (parsed.data.teamName) {
        const data = await createEmirDispatch({
          teamName: parsed.data.teamName,
          organizationPublicId: parsed.data.organizationPublicId,
          caseId: typeof parsed.data.resourceId === "string" ? parsed.data.resourceId : undefined,
          coverageArea: parsed.data.territory,
          capacitySnapshot: parsed.data.metadata,
          actor
        });
        return Response.json({ data }, { status: 201 });
      }
      const name = parsed.data.name ?? parsed.data.title;
      if (!name) return Response.json({ error: "missing_institution_name" }, { status: 400 });
      if (!parsed.data.organizationPublicId) return Response.json({ error: "missing_organization" }, { status: 400 });
      const data = await createInstitutionalBody({
        name,
        bodyType: parsed.data.bodyType ?? "CEC",
        organizationPublicId: parsed.data.organizationPublicId,
        quorumRules: parsed.data.quorumRules,
        annualPlan: parsed.data.annualPlan,
        actor
      });
      return Response.json({ data }, { status: 201 });
    }

    if (moduleId === "directory") {
      const name = parsed.data.name ?? parsed.data.title;
      if (!name) return Response.json({ error: "missing_service_name" }, { status: 400 });
      if (!parsed.data.serviceType) return Response.json({ error: "missing_service_type" }, { status: 400 });
      const data = await createServiceDirectoryEntry({
        name,
        serviceType: parsed.data.serviceType,
        organizationPublicId: parsed.data.organizationPublicId,
        territory: parsed.data.territory,
        contactPolicy: parsed.data.contactPolicy,
        metadata: parsed.data.metadata,
        actor
      });
      return Response.json({ data }, { status: 201 });
    }

    if (moduleId === "communications") {
      if (!parsed.data.title) return Response.json({ error: "missing_title" }, { status: 400 });
      if (!parsed.data.audience) return Response.json({ error: "missing_audience" }, { status: 400 });
      const data = await createCommunicationCampaign({
        title: parsed.data.title,
        audience: parsed.data.audience,
        territory: parsed.data.territory,
        language: parsed.data.language,
        channelPlan: parsed.data.channelPlan,
        contentPolicy: parsed.data.contentPolicy,
        startsAt: parsed.data.startsAt,
        endsAt: parsed.data.endsAt,
        actor
      });
      return Response.json({ data }, { status: 201 });
    }

    if (moduleId === "protocols") {
      if (parsed.data.recordType === "approval") {
        if (!parsed.data.protocolCode || !parsed.data.approvalType) return Response.json({ error: "missing_protocol_approval_fields" }, { status: 400 });
        const data = await createProtocolGovernanceRecord({
          recordType: "approval",
          protocolCode: parsed.data.protocolCode,
          approvalType: parsed.data.approvalType,
          status: parsed.data.status,
          actor
        });
        return Response.json({ data }, { status: 201 });
      }
      if (parsed.data.recordType === "simulation") {
        if (!parsed.data.protocolCode) return Response.json({ error: "missing_protocol_code" }, { status: 400 });
        const data = await createProtocolGovernanceRecord({
          recordType: "simulation",
          protocolCode: parsed.data.protocolCode,
          scenario: parsed.data.scenario,
          result: parsed.data.result,
          actor
        });
        return Response.json({ data }, { status: 201 });
      }
      if (parsed.data.recordType === "migration") {
        if (!parsed.data.resourceId || !parsed.data.toProtocolCode || !parsed.data.justification) {
          return Response.json({ error: "missing_protocol_migration_fields" }, { status: 400 });
        }
        const data = await createProtocolGovernanceRecord({
          recordType: "migration",
          caseId: parsed.data.resourceId,
          fromProtocolCode: parsed.data.fromProtocolCode,
          toProtocolCode: parsed.data.toProtocolCode,
          reason: parsed.data.justification,
          actor
        });
        return Response.json({ data }, { status: 201 });
      }
    }

    if (moduleId === "analytics") {
      if (parsed.data.recordType === "dashboard") {
        if (!parsed.data.title || !parsed.data.audience) return Response.json({ error: "missing_dashboard_fields" }, { status: 400 });
        const data = await createAnalyticsGovernanceRecord({
          recordType: "dashboard",
          title: parsed.data.title,
          audience: parsed.data.audience,
          widgets: parsed.data.widgets,
          filters: parsed.data.filters,
          actor
        });
        return Response.json({ data }, { status: 201 });
      }
      if (parsed.data.recordType === "metric_export") {
        if (!parsed.data.metricCode || !parsed.data.exportType || !parsed.data.purpose) return Response.json({ error: "missing_metric_export_fields" }, { status: 400 });
        const data = await createAnalyticsGovernanceRecord({
          recordType: "metric_export",
          metricCode: parsed.data.metricCode,
          exportType: parsed.data.exportType,
          filters: parsed.data.filters,
          purpose: parsed.data.purpose,
          actor
        });
        return Response.json({ data }, { status: 201 });
      }
      if (parsed.data.recordType === "ai_model") {
        if (!parsed.data.provider || !parsed.data.model || !parsed.data.purpose || !parsed.data.owner) return Response.json({ error: "missing_ai_model_fields" }, { status: 400 });
        const data = await createAiGovernanceRecord({
          recordType: "model",
          provider: parsed.data.provider,
          model: parsed.data.model,
          purpose: parsed.data.purpose,
          owner: parsed.data.owner,
          status: parsed.data.status,
          evaluation: parsed.data.evaluation,
          actor
        });
        return Response.json({ data }, { status: 201 });
      }
      if (parsed.data.recordType === "ai_decision") {
        if (!parsed.data.resourceType || !parsed.data.resourceId || !parsed.data.prompt || !parsed.data.response) return Response.json({ error: "missing_ai_decision_fields" }, { status: 400 });
        const data = await createAiGovernanceRecord({
          recordType: "decision",
          modelPublicId: parsed.data.modelPublicId,
          resourceType: parsed.data.resourceType,
          resourceId: parsed.data.resourceId,
          prompt: parsed.data.prompt,
          response: parsed.data.response,
          humanDecision: parsed.data.humanDecision,
          actor
        });
        return Response.json({ data }, { status: 201 });
      }
    }

    if (moduleId === "adaptations") {
      if (!parsed.data.title) return Response.json({ error: "missing_title" }, { status: 400 });
      if (!parsed.data.population) return Response.json({ error: "missing_population" }, { status: 400 });
      if (!parsed.data.justification) return Response.json({ error: "missing_justification" }, { status: 400 });
      const data = await createContextualAdaptation({
        title: parsed.data.title,
        organizationPublicId: parsed.data.organizationPublicId,
        territory: parsed.data.territory,
        population: parsed.data.population,
        justification: parsed.data.justification,
        risks: parsed.data.risks,
        evidence: parsed.data.evidence,
        effectiveFrom: parsed.data.startsAt,
        effectiveTo: parsed.data.endsAt,
        actor
      });
      return Response.json({ data }, { status: 201 });
    }

    if (moduleId === "integrations") {
      if (!parsed.data.idempotencyKey) return Response.json({ error: "missing_idempotency_key" }, { status: 400 });
      if (!parsed.data.source) return Response.json({ error: "missing_source" }, { status: 400 });
      if (!parsed.data.eventType) return Response.json({ error: "missing_event_type" }, { status: 400 });
      const data = await createIntegrationEvent({
        idempotencyKey: parsed.data.idempotencyKey,
        source: parsed.data.source,
        eventType: parsed.data.eventType,
        signatureDigest: parsed.data.signatureDigest,
        payload: parsed.data.payload,
        actor
      });
      return Response.json({ data }, { status: 201 });
    }

    if (moduleId === "notifications" && parsed.data.safeBody) {
      if (!parsed.data.name && !parsed.data.title) return Response.json({ error: "missing_template_name" }, { status: 400 });
      const data = await createNotificationTemplate({
        name: parsed.data.name ?? parsed.data.title ?? "Plantilla",
        channel: parsed.data.channel ?? "in_app",
        priority: parsed.data.priority ?? "informativa",
        safeBody: parsed.data.safeBody,
        actor
      });
      return Response.json({ data }, { status: 201 });
    }

    if (["audit", "informes", "configuration", "public-portal", "notifications"].includes(moduleId)) {
      if (!parsed.data.title) return Response.json({ error: "missing_title" }, { status: 400 });
      const data = await createGovernanceRecord(moduleId as PlatformModuleId, { ...parsed.data, title: parsed.data.title, actor });
      return Response.json({ data }, { status: 201 });
    }

    return Response.json({ error: "unsupported_module_operation" }, { status: 405 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    if (error instanceof FieldEncryptionNotConfiguredError) {
      return Response.json({ error: "field_encryption_not_configured", message: error.message }, { status: 503 });
    }
    if (error instanceof Error && error.message === "ORGANIZATION_NOT_FOUND") {
      return Response.json({ error: "organization_not_found" }, { status: 422 });
    }
    throw error;
  }
}
