// EP-02 / 6.2: transcripción de audio del reporte. Activable por configuración
// (SINAPVE_TRANSCRIPTION_URL). La transcripción es un BORRADOR que requiere
// confirmación humana; nunca sustituye el relato sin revisión.

export class TranscriptionNotConfiguredError extends Error {
  constructor() {
    super("SINAPVE_TRANSCRIPTION_URL es requerido para transcribir audio.");
    this.name = "TranscriptionNotConfiguredError";
  }
}

export function isTranscriptionConfigured() {
  return Boolean(process.env.SINAPVE_TRANSCRIPTION_URL);
}

export async function transcribeAudio(input: { buffer: Buffer; contentType: string; language?: string }) {
  if (!isTranscriptionConfigured()) throw new TranscriptionNotConfiguredError();

  const response = await fetch(process.env.SINAPVE_TRANSCRIPTION_URL!, {
    method: "POST",
    headers: {
      "content-type": input.contentType || "application/octet-stream",
      ...(process.env.SINAPVE_TRANSCRIPTION_KEY ? { authorization: `Bearer ${process.env.SINAPVE_TRANSCRIPTION_KEY}` } : {}),
      ...(input.language ? { "x-language": input.language } : {})
    },
    body: new Uint8Array(input.buffer)
  });
  if (!response.ok) throw new Error(`TRANSCRIPTION_ERROR_${response.status}`);
  const data = (await response.json().catch(() => ({}))) as { text?: string; transcript?: string; confidence?: number };
  return { text: String(data.text ?? data.transcript ?? ""), confidence: typeof data.confidence === "number" ? data.confidence : null };
}
