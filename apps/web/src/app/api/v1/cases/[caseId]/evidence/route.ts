import { buildAuditEvent } from "@/server/audit";
import { demoActor } from "@/server/data/demo";
import { getCase } from "@/server/data/repository";
import { canReadCase, hasCapability } from "@/server/domain/access";
import { EvidenceBlobValidationError, PrivateBlobNotConfiguredError, readPrivateEvidenceBlob, uploadPrivateEvidenceBlob } from "@/server/storage/private-blob";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const caseFile = await getCase(caseId);

  if (!caseFile) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (!canReadCase(demoActor, caseFile) || !hasCapability(demoActor, "case:update")) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "missing_file" }, { status: 400 });
  }

  try {
    const evidence = await uploadPrivateEvidenceBlob(caseFile.id, file);
    const audit = buildAuditEvent({
      actorId: demoActor.id,
      action: "evidence.upload_private_blob",
      resourceType: "case",
      resourceId: caseFile.id,
      reason: "case_evidence",
      metadata: { pathname: evidence.pathname, contentType: evidence.contentType, size: evidence.size }
    });

    return Response.json({ evidence, audit }, { status: 201 });
  } catch (error) {
    if (error instanceof PrivateBlobNotConfiguredError) {
      return Response.json({ error: "private_blob_not_configured", message: error.message }, { status: 503 });
    }

    if (error instanceof EvidenceBlobValidationError) {
      return Response.json({ error: "invalid_evidence_file", message: error.message }, { status: 400 });
    }

    throw error;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  const caseFile = await getCase(caseId);

  if (!caseFile) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  if (!canReadCase(demoActor, caseFile)) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const pathname = searchParams.get("pathname");

  if (!pathname || !pathname.startsWith(`cases/${caseFile.id}/evidence/`)) {
    return Response.json({ error: "invalid_pathname" }, { status: 400 });
  }

  try {
    const result = await readPrivateEvidenceBlob(pathname, request.headers.get("if-none-match"));

    if (!result) {
      return Response.json({ error: "not_found" }, { status: 404 });
    }

    if (result.statusCode === 304) {
      return new Response(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "private, no-cache"
        }
      });
    }

    const audit = buildAuditEvent({
      actorId: demoActor.id,
      action: "evidence.read_private_blob",
      resourceType: "case",
      resourceId: caseFile.id,
      reason: "authorized_case_access",
      metadata: { pathname: result.blob.pathname, contentType: result.blob.contentType, size: result.blob.size }
    });

    return new Response(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType,
        "X-Content-Type-Options": "nosniff",
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
        "X-SINAPVE-Audit-Event": audit.action
      }
    });
  } catch (error) {
    if (error instanceof PrivateBlobNotConfiguredError) {
      return Response.json({ error: "private_blob_not_configured", message: error.message }, { status: 503 });
    }

    throw error;
  }
}
