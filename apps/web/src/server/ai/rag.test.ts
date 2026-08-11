import { describe, expect, it } from "vitest";
import { rankDocuments, tokenize, type ApprovedDoc } from "./rag";

const docs: ApprovedDoc[] = [
  {
    publicId: "d1",
    title: "Protocolo de violencia digital",
    version: 3,
    docType: "protocolo",
    sourceRef: "PNVE-DIG-3",
    body: "Actuacion ante ciberacoso y difusion de imagenes sin consentimiento en el entorno escolar.",
    keywords: "ciberacoso digital imagenes"
  },
  {
    publicId: "d2",
    title: "Protocolo de crisis y autolesiones",
    version: 2,
    docType: "protocolo",
    sourceRef: "PNVE-CRISIS-2",
    body: "Ruta de contencion y derivacion ante riesgo de autolesion.",
    keywords: "crisis autolesion contencion"
  }
];

describe("tokenize", () => {
  it("normaliza acentos y descarta palabras vacias", () => {
    expect(tokenize("La difusión de imágenes")).toEqual(["difusion", "imagenes"]);
  });
});

describe("rankDocuments", () => {
  it("prioriza el documento con mas coincidencias de termino", () => {
    const ranked = rankDocuments("como actuar ante ciberacoso digital", docs);
    expect(ranked[0].publicId).toBe("d1");
    expect(ranked[0].score).toBeGreaterThan(0);
  });

  it("devuelve vacio cuando no hay coincidencias", () => {
    expect(rankDocuments("presupuesto anual de mobiliario", docs)).toHaveLength(0);
  });

  it("no puntua consultas vacias", () => {
    expect(rankDocuments("   ", docs)).toHaveLength(0);
  });
});
