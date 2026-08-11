import { z } from "zod";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { createOrganization, listOrganizations } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { canReadModule } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const organizationSchema = z.object({
  publicId: z.string().min(2).max(120).optional(),
  name: z.string().min(2).max(180),
  type: z.enum(["federal", "state", "municipality", "zone", "school"]),
  stateCode: z.string().min(2).max(20).optional(),
  municipalityCode: z.string().min(2).max(40).optional()
});

export async function GET(request: Request) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!canReadModule(actor, "configuration")) return Response.json({ error: "forbidden" }, { status: 403 });

  const data = await listOrganizations();
  return Response.json({ data });
}

export async function POST(request: Request) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!canReadModule(actor, "configuration")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = organizationSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_organization", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await createOrganization({ ...parsed.data, actor });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    throw error;
  }
}
