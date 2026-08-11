import { findPublicSchoolChannels } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EP-18: buscador público de Agente Preventivo y canales del plantel.
// GET /api/v1/public/agents?school=<publicId o nombre>. Sin autenticación; solo
// datos seguros (no expone riesgo, expedientes ni personas).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("school") ?? "").trim();
  if (query.length < 2) {
    return Response.json({ error: "invalid_query", message: "Indica el plantel (nombre o identificador)." }, { status: 400 });
  }
  try {
    const data = await findPublicSchoolChannels(query);
    return Response.json({ data });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    throw error;
  }
}
