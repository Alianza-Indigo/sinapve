import { verifyCertification } from "@/server/data/repository";
import { DatabaseNotConfiguredError } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ publicCode: string }> }) {
  const { publicCode } = await params;
  try {
    const data = await verifyCertification(publicCode);
    if (!data) return Response.json({ error: "not_found" }, { status: 404 });
    return Response.json({ data });
  } catch (error) {
    if (error instanceof DatabaseNotConfiguredError) return Response.json({ error: "database_not_configured", message: error.message }, { status: 503 });
    throw error;
  }
}
