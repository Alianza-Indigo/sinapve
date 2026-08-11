import { z } from "zod";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { createAccessSession } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const sessionSchema = z.object({
  sessionToken: z.string().min(16).max(4096),
  source: z.string().min(2).max(80).optional(),
  expiresAt: z.string().datetime().optional()
});

export async function POST(request: Request) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) {
    return Response.json({ error: "unauthorized", message: "Falta identidad institucional en encabezados seguros." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = sessionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "invalid_session", issues: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const data = await createAccessSession({ ...parsed.data, actor });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    if (error instanceof Error && error.message === "USER_NOT_FOUND") {
      return Response.json({ error: "user_not_found" }, { status: 422 });
    }
    throw error;
  }
}
