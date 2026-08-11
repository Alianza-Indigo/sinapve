import { getActorFromHeaders } from "@/server/auth/current-actor";
import { listModuleRecords } from "@/server/data/repository";
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
