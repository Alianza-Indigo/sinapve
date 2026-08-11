import { describe, expect, it } from "vitest";
import { sanitizeBlobFileName, toEvidenceBlobMetadata, validateEvidenceFile } from "./private-blob";

describe("private blob storage policy", () => {
  it("sanitizes evidence filenames before building blob paths", () => {
    expect(sanitizeBlobFileName("../../reporte final.pdf")).toBe("reporte_final.pdf");
  });

  it("rejects file types outside the evidence allowlist", () => {
    const file = new File(["x"], "script.js", { type: "application/javascript" });
    expect(() => validateEvidenceFile(file)).toThrow("Tipo de archivo no permitido");
  });

  it("returns server delivery paths instead of client-facing blob URLs", () => {
    const metadata = toEvidenceBlobMetadata(
      "case_001",
      {
        pathname: "cases/case_001/evidence/2026-08-10/a.pdf",
        url: "https://store.private.blob.vercel-storage.com/cases/case_001/evidence/2026-08-10/a.pdf",
        downloadUrl: "https://store.private.blob.vercel-storage.com/cases/case_001/evidence/2026-08-10/a.pdf?download=1",
        contentType: "application/pdf",
        contentDisposition: "attachment",
        etag: "evidence-etag"
      },
      12,
      "sha256",
      "not_applicable"
    );

    expect(metadata.deliveryPath).toBe("/api/v1/cases/case_001/evidence?pathname=cases%2Fcase_001%2Fevidence%2F2026-08-10%2Fa.pdf");
    expect(metadata.sha256).toBe("sha256");
    expect(metadata.scanStatus).toBe("passed");
    expect(metadata).not.toHaveProperty("url");
    expect(metadata).not.toHaveProperty("downloadUrl");
  });
});
