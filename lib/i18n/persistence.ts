import { isValidLocale, type Locale } from "./config";

export const LOCALE_COOKIE_NAME = "NEXT_LOCALE";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year in seconds

/**
 * Get locale from cookie (client-side)
 */
export function getLocaleFromCookie(): Locale | null {
  if (typeof document === "undefined") {
    return null;
  }

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === LOCALE_COOKIE_NAME && value && isValidLocale(value)) {
      return value;
    }
  }
  return null;
}

/**
 * Set locale cookie (client-side)
 */
export function setLocaleCookie(locale: Locale): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${LOCALE_COOKIE_NAME}=${locale}; path=/; max-age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}

/**
 * Remove locale cookie (client-side)
 */
export function removeLocaleCookie(): void {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${LOCALE_COOKIE_NAME}=; path=/; max-age=0`;
}

/**
 * Build Set-Cookie header value for server-side response
 */
export function buildLocaleSetCookieHeader(locale: Locale): string {
  return `${LOCALE_COOKIE_NAME}=${locale}; Path=/; Max-Age=${LOCALE_COOKIE_MAX_AGE}; SameSite=Lax`;
}


/**
 * Parse cookie header string and extract locale
 */
export function parseLocaleCookieFromHeader(
  cookieHeader: string | null
): Locale | null {
  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === LOCALE_COOKIE_NAME && value && isValidLocale(value)) {
      return value;
    }
  }
  return null;
}

/**
 * Check if locale preference should override automatic detection
 * Returns true if user has explicitly set a preference (cookie exists)
 */
export function hasExplicitLocalePreference(
  cookieValue: string | null | undefined
): boolean {
  return cookieValue !== null && cookieValue !== undefined && isValidLocale(cookieValue);
}
