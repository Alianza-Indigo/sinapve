import { z } from "zod";
import { resolveActor } from "@/server/auth/session-actor";
import { createTerritorialPoint, findNearbyTerritorialPoints } from "@/server/data/repository";
import { hasCapability } from "@/server/domain/access";
import { mapDomainError } from "@/server/http/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  label: z.string().min(2).max(240),
  kind: z.string().min(2).max(80),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  organizationPublicId: z.string().min(2).max(120).optional()
});

// Alta de recurso territorial geolocalizado (PostGIS).
export async function POST(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "referral:read") && !hasCapability(actor, "analytics:read")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid_point", issues: parsed.error.flatten() }, { status: 400 });
  try {
    const data = await createTerritorialPoint({ ...parsed.data, actor });
    return Response.json({ data }, { status: 201 });
  } catch (error) {
    const mapped = mapDomainError(error);
    if (mapped) return mapped;
    throw error;
  }
}

// Consulta de proximidad: /api/v1/maps/points?lat=..&lng=..&radius=..&kind=..
export async function GET(request: Request) {
  const actor = await resolveActor(request.headers);
  if (!actor) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!hasCapability(actor, "analytics:read") && !hasCapability(actor, "referral:read")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const radius = Number(searchParams.get("radius") ?? "5000");
  const kind = searchParams.get("kind") ?? undefined;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "invalid_coordinates" }, { status: 400 });
  }
  const data = await findNearbyTerritorialPoints({ lat, lng, radiusMeters: Math.min(Math.max(radius, 1), 100000), kind });
  return Response.json({ data });
}
