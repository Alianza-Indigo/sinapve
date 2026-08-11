import { cookies, headers } from "next/headers";
import { resolveLocale, type Locale } from "./config";
import { translate } from "./dictionaries";

// Resolutor de locale del lado del servidor (cookie `sinapve_locale` o
// Accept-Language) y ayudante de traducción para server components.
export async function getLocale(): Promise<Locale> {
  const cookieLocale = (await cookies()).get("sinapve_locale")?.value ?? null;
  const acceptLanguage = (await headers()).get("accept-language");
  return resolveLocale(acceptLanguage, cookieLocale);
}

export async function getTranslator(): Promise<(key: string) => string> {
  const locale = await getLocale();
  return (key: string) => translate(locale, key);
}
