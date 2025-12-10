import { locales, defaultLocale, isValidLocale, type Locale } from "./config";
import type { LocalePreference } from "../types";

/**
 * Parse Accept-Language header and return ordered list of preferred locales
 * Format: "en-US,en;q=0.9,es;q=0.8,fr;q=0.7"
 */
export function parseAcceptLanguageHeader(
  acceptLanguage: string | null
): { locale: string; quality: number }[] {
  if (!acceptLanguage) {
    return [];
  }

  return acceptLanguage
    .split(",")
    .map((lang) => {
      const trimmed = lang.trim();
      const [localeStr, qualityStr = "q=1"] = trimmed.split(";");
      const quality = parseFloat(qualityStr.replace("q=", "").trim()) || 1;
      // Extract base language code (e.g., "en" from "en-US")
      const locale = localeStr.split("-")[0].toLowerCase().trim();
      return { locale, quality };
    })
    .filter((item) => item.locale.length > 0)
    .sort((a, b) => b.quality - a.quality);
}

/**
 * Detect locale from Accept-Language header
 * Returns the first supported locale from the header preferences, or default locale if none match
 */
export function detectLocaleFromHeaders(
  acceptLanguage: string | null
): Locale {
  const preferences = parseAcceptLanguageHeader(acceptLanguage);

  for (const { locale } of preferences) {
    if (isValidLocale(locale)) {
      return locale;
    }
  }

  return defaultLocale;
}

/**
 * Detect locale from cookie value
 */
export function detectLocaleFromCookie(
  cookieValue: string | null | undefined
): Locale | null {
  if (cookieValue && isValidLocale(cookieValue)) {
    return cookieValue;
  }
  return null;
}


/**
 * Get the preferred locale with source tracking
 * Priority: cookie > header > default
 */
export function getPreferredLocale(
  cookieValue: string | null | undefined,
  acceptLanguage: string | null
): LocalePreference {
  // 1. Check cookie first (user's explicit preference)
  const cookieLocale = detectLocaleFromCookie(cookieValue);
  if (cookieLocale) {
    return { locale: cookieLocale, source: "cookie" };
  }

  // 2. Check Accept-Language header
  const headerLocale = detectLocaleFromHeaders(acceptLanguage);
  if (headerLocale !== defaultLocale) {
    return { locale: headerLocale, source: "header" };
  }

  // 3. Check if header actually specified the default locale
  const preferences = parseAcceptLanguageHeader(acceptLanguage);
  const hasExplicitDefault = preferences.some(
    (p) => isValidLocale(p.locale) && p.locale === defaultLocale
  );

  if (hasExplicitDefault) {
    return { locale: defaultLocale, source: "header" };
  }

  // 4. Fall back to default
  return { locale: defaultLocale, source: "default" };
}

/**
 * Check if a pathname already contains a locale prefix
 */
export function pathnameHasLocale(pathname: string): boolean {
  return locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );
}

/**
 * Extract locale from pathname if present
 */
export function extractLocaleFromPathname(pathname: string): Locale | null {
  for (const locale of locales) {
    if (pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`) {
      return locale;
    }
  }
  return null;
}

/**
 * Build a localized pathname
 */
export function buildLocalizedPathname(
  pathname: string,
  locale: Locale
): string {
  // Remove existing locale prefix if present
  let cleanPath = pathname;
  for (const loc of locales) {
    if (pathname.startsWith(`/${loc}/`)) {
      cleanPath = pathname.slice(loc.length + 1);
      break;
    } else if (pathname === `/${loc}`) {
      cleanPath = "/";
      break;
    }
  }

  // Add new locale prefix
  if (cleanPath === "/") {
    return `/${locale}`;
  }
  return `/${locale}${cleanPath}`;
}
