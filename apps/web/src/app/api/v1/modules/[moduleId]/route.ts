import { z } from "zod";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { createCommunityInitiative, createGovernanceRecord, createTrainingProgram, listModuleRecords } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { canReadModule } from "@/server/domain/access";
import type { PlatformModuleId } from "@/server/domain/types";

const validModuleIds = [
  "reports",
  "cases",
  "protocols",
  "risk",
  "interventions",
  "escalations",
  "training",
  "community",
  "audit",
  "analytics",
  "informes",
  "configuration",
  "public-portal",
  "notifications"
] satisfies PlatformModuleId[];

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const actor = getActorFromHeaders(request.headers);
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
  title: z.string().min(3).max(240),
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
  startsAt: z.string().datetime().optional(),
  endsAt: z.string().datetime().optional()
});

export async function POST(request: Request, { params }: { params: Promise<{ moduleId: string }> }) {
  const actor = getActorFromHeaders(request.headers);
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

    if (["audit", "informes", "configuration", "public-portal", "notifications"].includes(moduleId)) {
      const data = await createGovernanceRecord(moduleId as PlatformModuleId, { ...parsed.data, actor });
      return Response.json({ data }, { status: 201 });
    }

    return Response.json({ error: "unsupported_module_operation" }, { status: 405 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    if (error instanceof Error && error.message === "ORGANIZATION_NOT_FOUND") {
      return Response.json({ error: "organization_not_found" }, { status: 422 });
    }
    throw error;
  }
}
