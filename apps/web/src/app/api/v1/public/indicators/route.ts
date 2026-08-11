import { getPublicIndicators } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EP-18: indicadores publicos agregados. Endpoint sin autenticacion; solo
// devuelve cifras agregadas con umbral de privacidad aplicado en servidor.
export async function GET() {
  try {
    const data = await getPublicIndicators();
    return Response.json({ data });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) {
      return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    }
    throw error;
  }
}
