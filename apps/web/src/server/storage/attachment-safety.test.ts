import { describe, expect, it } from "vitest";
import { MalwareDetectedError, MalwareScannerUnavailableError, scanForMalware, stripExif } from "./attachment-safety";

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";

describe("scanForMalware", () => {
  it("acepta contenido limpio con el heuristico local", async () => {
    await expect(scanForMalware(Buffer.from("contenido de expediente"))).resolves.toBe("passed_heuristic");
  });

  it("rechaza archivos sin antivirus durante operacion de produccion", async () => {
    const before = process.env.NODE_ENV;
    const scanner = process.env.SINAPVE_AV_SCAN_URL;
    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      delete process.env.SINAPVE_AV_SCAN_URL;
      await expect(scanForMalware(Buffer.from("contenido aparentemente limpio"))).rejects.toBeInstanceOf(MalwareScannerUnavailableError);
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = before;
      if (scanner === undefined) delete process.env.SINAPVE_AV_SCAN_URL;
      else process.env.SINAPVE_AV_SCAN_URL = scanner;
    }
  });

  it("rechaza un veredicto ambiguo del proveedor", async () => {
    const url = process.env.SINAPVE_AV_SCAN_URL;
    const previousFetch = globalThis.fetch;
    try {
      process.env.SINAPVE_AV_SCAN_URL = "https://scanner.example.test/scan";
      globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 200 });
      await expect(scanForMalware(Buffer.from("contenido limpio"))).rejects.toBeInstanceOf(MalwareScannerUnavailableError);
    } finally {
      globalThis.fetch = previousFetch;
      if (url === undefined) delete process.env.SINAPVE_AV_SCAN_URL;
      else process.env.SINAPVE_AV_SCAN_URL = url;
    }
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
