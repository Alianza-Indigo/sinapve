import QRCode from "qrcode";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// EP-10 / 6.9: código QR verificable del certificado. Codifica la URL pública de
// verificación (no datos personales) como SVG. Público: cualquiera puede validar
// un certificado escaneándolo.
export async function GET(request: Request, { params }: { params: Promise<{ publicCode: string }> }) {
  const { publicCode } = await params;
  if (!/^[A-Za-z0-9-]{4,80}$/.test(publicCode)) {
    return Response.json({ error: "invalid_code" }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const verifyUrl = `${origin}/api/v1/certifications/verify/${publicCode}`;
  const svg = await QRCode.toString(verifyUrl, { type: "svg", errorCorrectionLevel: "M", margin: 1, width: 240 });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
