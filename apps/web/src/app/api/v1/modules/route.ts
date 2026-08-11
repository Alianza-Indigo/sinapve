import { resolveActor } from "@/server/auth/session-actor";
import { listPlatformModules } from "@/server/data/repository";
import { canReadModule } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) {
    return Response.json({ error: "unauthorized", message: "Falta identidad institucional en encabezados seguros." }, { status: 401 });
  }

  const modules = await listPlatformModules();
  return Response.json({ data: modules.filter((module) => canReadModule(actor, module.id)) });
}
