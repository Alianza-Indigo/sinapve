export const runtime = "nodejs";

export async function GET(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  const receivedSecret = request.headers.get("authorization")?.replace("Bearer ", "");

  if (configuredSecret && receivedSecret !== configuredSecret) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  return Response.json({
    status: "accepted",
    job: "sla-review",
    note: "This endpoint is stateless. Production fan-out belongs in Vercel Queues/Workflows."
  });
}
