import sharp from "sharp";

// EP-02 / 6.2 / 12.1: saneo de adjuntos antes de almacenar. Elimina metadatos
// EXIF de imagenes (no solo los rechaza) y ejecuta un escaneo antivirus. El
// escaneo usa un heuristico local (EICAR) mas un escaner externo cuando esta
// enlazado (SINAPVE_AV_SCAN_URL); sin el, no bloquea pero deja constancia del
// estado.

export type ExifPolicy = "stripped_on_ingest" | "not_applicable";
export type ScanStatus = "passed_external" | "passed_heuristic" | "infected";

export class MalwareDetectedError extends Error {
  constructor() {
    super("El archivo no paso el escaneo antivirus.");
    this.name = "MalwareDetectedError";
  }
}

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

// Reescribe imagenes eliminando todos los metadatos (EXIF/GPS/orientacion) y
// preservando la orientacion visual. Devuelve el buffer saneado.
export async function stripExif(buffer: Buffer, contentType: string): Promise<{ buffer: Buffer; policy: ExifPolicy }> {
  if (!imageTypes.has(contentType)) {
    return { buffer, policy: "not_applicable" };
  }
  // sharp no copia metadatos salvo que se pida .withMetadata(); rotate() aplica
  // la orientacion EXIF antes de descartarla para no voltear la imagen.
  const sanitized = await sharp(buffer).rotate().toBuffer();
  return { buffer: sanitized, policy: "stripped_on_ingest" };
}

function hasEicarSignature(buffer: Buffer) {
  const head = buffer.subarray(0, Math.min(buffer.length, 8192)).toString("ascii");
  return head.includes("EICAR-STANDARD-ANTIVIRUS-TEST-FILE");
}

export function isExternalScannerConfigured() {
  return Boolean(process.env.SINAPVE_AV_SCAN_URL);
}

// Escanea el buffer. El heuristico EICAR siempre corre; si hay escaner externo,
// se le envia el contenido y su veredicto manda. Lanza MalwareDetectedError si
// se detecta amenaza.
export async function scanForMalware(buffer: Buffer): Promise<ScanStatus> {
  if (hasEicarSignature(buffer)) {
    throw new MalwareDetectedError();
  }

  if (isExternalScannerConfigured()) {
    const response = await fetch(process.env.SINAPVE_AV_SCAN_URL!, {
      method: "POST",
      headers: {
        "content-type": "application/octet-stream",
        ...(process.env.SINAPVE_AV_SCAN_KEY ? { authorization: `Bearer ${process.env.SINAPVE_AV_SCAN_KEY}` } : {})
      },
      body: new Uint8Array(buffer)
    });
    if (!response.ok) {
      // Un escaner caido no debe permitir contenido sin revisar.
      throw new MalwareDetectedError();
    }
    const verdict = (await response.json().catch(() => ({}))) as { infected?: boolean; status?: string };
    if (verdict.infected || verdict.status === "infected") {
      throw new MalwareDetectedError();
    }
    return "passed_external";
  }

  return "passed_heuristic";
}
