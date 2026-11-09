import { describe, expect, it } from "vitest";
import { MalwareDetectedError, scanForMalware, stripExif } from "./attachment-safety";

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

describe("scanForMalware", () => {
  it("acepta contenido limpio con el heuristico local", async () => {
    await expect(scanForMalware(Buffer.from("contenido de expediente"))).resolves.toBe("passed_heuristic");
  });

  it("bloquea la firma EICAR", async () => {
    await expect(scanForMalware(Buffer.from(EICAR))).rejects.toBeInstanceOf(MalwareDetectedError);
  });
});

describe("stripExif", () => {
  it("no altera archivos que no son imagen", async () => {
    const buffer = Buffer.from("%PDF-1.7 documento");
    const result = await stripExif(buffer, "application/pdf");
    expect(result.policy).toBe("not_applicable");
    expect(result.buffer).toBe(buffer);
  });
});
