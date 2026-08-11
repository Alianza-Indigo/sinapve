// EP / 13: arquitectura i18n desde el inicio. Español base, con resolución de
// locale por cookie o Accept-Language. La localización de rutas ([locale]) puede
// añadirse encima de esta base sin reescribir el producto.
export const locales = ["es", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "es";

export function isLocale(value: string | null | undefined): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}

export function resolveLocale(acceptLanguage?: string | null, cookieLocale?: string | null): Locale {
  if (isLocale(cookieLocale)) return cookieLocale;
  const first = acceptLanguage?.split(",")[0]?.split("-")[0]?.trim();
  return isLocale(first) ? first : defaultLocale;
}
