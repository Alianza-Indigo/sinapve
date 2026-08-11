import { describe, expect, it } from "vitest";
import { resolveLocale, defaultLocale } from "./config";
import { translate } from "./dictionaries";

describe("resolveLocale", () => {
  it("prioriza la cookie de locale válida", () => {
    expect(resolveLocale("es-MX,es;q=0.9", "en")).toBe("en");
  });
  it("usa Accept-Language cuando no hay cookie", () => {
    expect(resolveLocale("en-US,en;q=0.9", null)).toBe("en");
  });
  it("cae al locale por defecto ante valores no soportados", () => {
    expect(resolveLocale("fr-FR", null)).toBe(defaultLocale);
    expect(resolveLocale(null, "zz")).toBe(defaultLocale);
  });
});

describe("translate", () => {
  it("traduce por locale", () => {
    expect(translate("en", "report.submit")).toBe("Submit request");
    expect(translate("es", "report.submit")).toBe("Enviar solicitud");
  });
  it("cae a español y luego a la clave", () => {
    expect(translate("en", "clave.inexistente")).toBe("clave.inexistente");
  });
});
