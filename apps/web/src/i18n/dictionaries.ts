import type { Locale } from "./config";

// Diccionarios por locale. El español es la base; las claves faltantes en otro
// locale caen a español y, en último caso, a la propia clave.
const es: Record<string, string> = {
  "app.title": "SINAPVE",
  "nav.followUp": "Seguimiento",
  "nav.transparency": "Transparencia",
  "portal.transparency.title": "Transparencia y datos abiertos",
  "portal.indicators.title": "Indicadores agregados",
  "report.submit": "Enviar solicitud",
  "report.emergency": "Emergencia o peligro inmediato",
  "auth.signIn": "Ingresar a la consola"
};

const en: Record<string, string> = {
  "app.title": "SINAPVE",
  "nav.followUp": "Follow-up",
  "nav.transparency": "Transparency",
  "portal.transparency.title": "Transparency and open data",
  "portal.indicators.title": "Aggregated indicators",
  "report.submit": "Submit request",
  "report.emergency": "Emergency or immediate danger",
  "auth.signIn": "Sign in to the console"
};

export const dictionaries: Record<Locale, Record<string, string>> = { es, en };

export function translate(locale: Locale, key: string): string {
  return dictionaries[locale]?.[key] ?? dictionaries.es[key] ?? key;
}
