import { defaultLocale, isValidLocale, type Locale } from "./config";

// Import translation files
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import fr from "../../messages/fr.json";
import th from "../../messages/th.json";

type TranslationMessages = typeof en;
type NestedKeyOf<T> = T extends object
  ? {
      [K in keyof T]: K extends string
        ? T[K] extends object
          ? `${K}.${NestedKeyOf<T[K]>}`
          : K
        : never;
    }[keyof T]
  : never;

export type TranslationKey = NestedKeyOf<TranslationMessages>;

const messages: Record<Locale, TranslationMessages> = {
  en,
  es,
  fr,
  th,
};

/**
 * Get a nested value from an object using dot notation
 */
function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    if (typeof current === "object" && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }

  return typeof current === "string" ? current : undefined;
}

/**
 * Translate a key to the specified locale
 * Supports parameter interpolation with {paramName} syntax
 */
export function t(
  key: string,
  locale: Locale | string,
  params?: Record<string, string | number>
): string {
  const validLocale = isValidLocale(locale) ? locale : defaultLocale;
  const translation = getNestedValue(messages[validLocale], key);


  // Fallback to default locale if translation not found
  let result =
    translation ?? getNestedValue(messages[defaultLocale], key) ?? key;

  // Interpolate parameters
  if (params) {
    for (const [paramKey, paramValue] of Object.entries(params)) {
      result = result.replace(
        new RegExp(`\\{${paramKey}\\}`, "g"),
        String(paramValue)
      );
    }
  }

  return result;
}

/**
 * Get all translations for a locale
 */
export function getTranslations(locale: Locale | string): TranslationMessages {
  const validLocale = isValidLocale(locale) ? locale : defaultLocale;
  return messages[validLocale];
}

/**
 * Check if a translation key exists for a locale
 */
export function hasTranslation(key: string, locale: Locale | string): boolean {
  const validLocale = isValidLocale(locale) ? locale : defaultLocale;
  return getNestedValue(messages[validLocale], key) !== undefined;
}

/**
 * Create a scoped translator for a specific namespace
 */
export function createScopedTranslator(
  namespace: string,
  locale: Locale | string
) {
  return (key: string, params?: Record<string, string | number>): string => {
    return t(`${namespace}.${key}`, locale, params);
  };
}
