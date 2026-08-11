import { z } from "zod";
import { getActorFromHeaders } from "@/server/auth/current-actor";
import { createPrivacyRequest, listPrivacyRequests } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";
import { canReadModule } from "@/server/domain/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const privacyRequestSchema = z.object({
  requestType: z.string().min(2).max(120),
  requesterContact: z.string().min(4).max(240),
  scope: z.record(z.unknown()).optional()
});

export async function GET(request: Request) {
  const actor = getActorFromHeaders(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!canReadModule(actor, "privacy")) return Response.json({ error: "forbidden" }, { status: 403 });

  const data = await listPrivacyRequests();
  return Response.json({ data });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = privacyRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_privacy_request", issues: parsed.error.flatten() }, { status: 400 });

  try {
    const data = await createPrivacyRequest(parsed.data);
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    throw error;
  }
}
