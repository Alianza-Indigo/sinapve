import { get, put, type PutBlobResult } from "@vercel/blob";
import { nanoid } from "nanoid";

const maxEvidenceBytes = 25 * 1024 * 1024;
const allowedEvidenceTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/plain",
  "audio/mpeg",
  "audio/mp4",
  "video/mp4"
]);

export class PrivateBlobNotConfiguredError extends Error {
  constructor() {
    super("BLOB_READ_WRITE_TOKEN is required to use Vercel private Blob storage.");
  }
}

export class EvidenceBlobValidationError extends Error {
  constructor(message: string) {
    super(message);
  }
}

export type EvidenceBlobMetadata = {
  pathname: string;
  contentType: string;
  size: number;
  uploadedAt: string;
  deliveryPath: string;
  etag?: string;
};

export function isPrivateBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export function sanitizeBlobFileName(fileName: string) {
  const baseName = fileName.split(/[\\/]/).pop() ?? fileName;
  const safe = baseName
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^\.+/g, "")
    .replace(/^_+|_+$/g, "")
    .slice(0, 96);

  return safe || "evidence.bin";
}

export function buildEvidencePath(caseId: string, fileName: string, now = new Date()) {
  const datePart = now.toISOString().slice(0, 10);
  return `cases/${caseId}/evidence/${datePart}/${nanoid(10)}-${sanitizeBlobFileName(fileName)}`;
}

export function validateEvidenceFile(file: File) {
  if (file.size <= 0) {
    throw new EvidenceBlobValidationError("El archivo esta vacio.");
  }

  if (file.size > maxEvidenceBytes) {
    throw new EvidenceBlobValidationError("El archivo supera el limite inicial de 25 MB para evidencia sensible.");
  }

  if (!allowedEvidenceTypes.has(file.type)) {
    throw new EvidenceBlobValidationError(`Tipo de archivo no permitido: ${file.type || "desconocido"}.`);
  }
}

export function toEvidenceBlobMetadata(caseId: string, blob: PutBlobResult, size: number): EvidenceBlobMetadata {
  return {
    pathname: blob.pathname,
    contentType: blob.contentType,
    size,
    uploadedAt: new Date().toISOString(),
    deliveryPath: `/api/v1/cases/${caseId}/evidence?pathname=${encodeURIComponent(blob.pathname)}`,
    etag: "etag" in blob ? String(blob.etag) : undefined
  };
}

export async function uploadPrivateEvidenceBlob(caseId: string, file: File): Promise<EvidenceBlobMetadata> {
  validateEvidenceFile(file);

  if (!isPrivateBlobConfigured()) {
    throw new PrivateBlobNotConfiguredError();
  }

  const blob = await put(buildEvidencePath(caseId, file.name), file, {
    access: "private",
    addRandomSuffix: true,
    contentType: file.type,
    cacheControlMaxAge: 60
  });

  return toEvidenceBlobMetadata(caseId, blob, file.size);
}

export async function readPrivateEvidenceBlob(pathname: string, ifNoneMatch?: string | null) {
  if (!isPrivateBlobConfigured()) {
    throw new PrivateBlobNotConfiguredError();
  }

  return get(pathname, {
    access: "private",
    useCache: false,
    ifNoneMatch: ifNoneMatch ?? undefined
  });
}
