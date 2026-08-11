import { isTranscriptionConfigured, transcribeAudio, TranscriptionNotConfiguredError } from "@/server/ai/transcribe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;
const allowed = new Set(["audio/mpeg", "audio/mp4", "audio/wav", "audio/webm", "audio/ogg"]);

// EP-02: transcripción de audio con confirmación humana. Activable por
// configuración; sin proveedor responde 503. El transcript es borrador.
export async function POST(request: Request) {
  if (!isTranscriptionConfigured()) {
    return Response.json({ error: "transcription_not_configured", message: "La transcripcion no esta activa. Continua con el relato en texto." }, { status: 503 });
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  const language = typeof form?.get("language") === "string" ? String(form.get("language")) : undefined;
  if (!(file instanceof File)) return Response.json({ error: "missing_audio" }, { status: 400 });
  if (file.size <= 0 || file.size > MAX_AUDIO_BYTES) return Response.json({ error: "invalid_audio_size" }, { status: 400 });
  if (!allowed.has(file.type)) return Response.json({ error: "unsupported_audio_type", type: file.type }, { status: 400 });

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await transcribeAudio({ buffer, contentType: file.type, language });
    return Response.json({ transcript: result.text, confidence: result.confidence, requiresHumanConfirmation: true });
  } catch (error) {
    if (error instanceof TranscriptionNotConfiguredError) return Response.json({ error: "transcription_not_configured" }, { status: 503 });
    return Response.json({ error: "transcription_failed" }, { status: 502 });
  }
}
