import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { createUserWithAssignment } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { canReadModule } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const userSchema = z.object({
  externalSubject: z.string().min(2).max(180),
  displayName: z.string().min(2).max(180),
  email: z.string().email().optional(),
  organizationPublicId: z.string().min(2).max(120),
  role: z.string().min(2).max(80)
});

export async function POST(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!canReadModule(actor, "configuration")) return Response.json({ error: "forbidden" }, { status: 403 });

  const body = await request.json().catch(() => null);
  const parsed = userSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_user", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await createUserWithAssignment({ ...parsed.data, actor });
    return Response.json({ data }, { status: 201 });
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
