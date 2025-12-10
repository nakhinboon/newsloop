export const locales = ["en", "es", "fr", "th"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  th: "Thai",
};

export const localeNativeNames: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
  th: "ไทย",
};

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale);
}
