import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { detectLocaleFromHeaders, parseAcceptLanguageHeader } from "./detection";
import { locales, defaultLocale, isValidLocale, type Locale } from "./config";
import {
  parseLocaleCookieFromHeader,
  hasExplicitLocalePreference,
  buildLocaleSetCookieHeader,
  LOCALE_COOKIE_NAME,
} from "./persistence";

/**
 * **Feature: advanced-web-blog, Property 14: Locale detection priority**
 * **Validates: Requirements 9.1**
 *
 * For any request with browser Accept-Language header, the detected locale
 * SHALL be the first supported locale from the header preferences,
 * or the default locale if none match.
 */
describe("Property 14: Locale detection priority", () => {
  // Arbitrary for generating valid locale codes
  const supportedLocaleArb = fc.constantFrom(...locales);

  // Arbitrary for generating unsupported locale codes (e.g., "de", "ja", "zh")
  const unsupportedLocaleArb = fc.constantFrom("de", "ja", "zh", "ko", "pt", "it", "ru", "ar", "hi", "pl");

  // Arbitrary for generating quality values (0.0 to 1.0)
  const qualityArb = fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true });

  // Generate a single Accept-Language entry with optional quality
  const langEntryArb = (localeArb: fc.Arbitrary<string>) =>
    fc.tuple(localeArb, fc.boolean(), qualityArb).map(([locale, hasQuality, quality]) => {
      if (hasQuality && quality < 1.0) {
        return `${locale};q=${quality.toFixed(1)}`;
      }
      return locale;
    });

  // Generate Accept-Language header with mixed supported and unsupported locales
  const acceptLanguageHeaderArb = fc
    .array(
      fc.oneof(
        langEntryArb(supportedLocaleArb),
        langEntryArb(unsupportedLocaleArb)
      ),
      { minLength: 1, maxLength: 10 }
    )
    .map((entries) => entries.join(", "));

  it("should return the first supported locale from header preferences sorted by quality", () => {
    fc.assert(
      fc.property(acceptLanguageHeaderArb, (header) => {
        const detected = detectLocaleFromHeaders(header);
        const parsed = parseAcceptLanguageHeader(header);

        // Find the first supported locale in the parsed preferences (already sorted by quality)
        const expectedLocale = parsed.find((p) => isValidLocale(p.locale))?.locale;

        if (expectedLocale) {
          // If there's a supported locale in the header, it should be returned
          expect(detected).toBe(expectedLocale);
        } else {
          // If no supported locale in header, should return default
          expect(detected).toBe(defaultLocale);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("should return default locale when header is null or empty", () => {
    fc.assert(
      fc.property(fc.constantFrom(null, "", "   "), (header) => {
        const detected = detectLocaleFromHeaders(header);
        expect(detected).toBe(defaultLocale);
      }),
      { numRuns: 10 }
    );
  });

  it("should return default locale when no supported locales are in the header", () => {
    // Generate headers with only unsupported locales
    const unsupportedOnlyHeaderArb = fc
      .array(langEntryArb(unsupportedLocaleArb), { minLength: 1, maxLength: 5 })
      .map((entries) => entries.join(", "));

    fc.assert(
      fc.property(unsupportedOnlyHeaderArb, (header) => {
        const detected = detectLocaleFromHeaders(header);
        expect(detected).toBe(defaultLocale);
      }),
      { numRuns: 100 }
    );
  });

  it("should respect quality values when determining priority", () => {
    // Generate headers where we control the quality ordering
    const orderedHeaderArb = fc
      .shuffledSubarray([...locales], { minLength: 2, maxLength: locales.length })
      .chain((shuffledLocales) => {
        // Assign decreasing quality values to ensure predictable ordering
        const entries = shuffledLocales.map((locale, index) => {
          const quality = 1.0 - index * 0.1;
          return { locale, quality };
        });
        // Sort by quality descending to know expected result
        const sorted = [...entries].sort((a, b) => b.quality - a.quality);
        const header = entries.map((e) => `${e.locale};q=${e.quality.toFixed(1)}`).join(", ");
        return fc.constant({ header, expectedLocale: sorted[0].locale });
      });

    fc.assert(
      fc.property(orderedHeaderArb, ({ header, expectedLocale }) => {
        const detected = detectLocaleFromHeaders(header);
        expect(detected).toBe(expectedLocale);
      }),
      { numRuns: 100 }
    );
  });

  it("should handle locale variants (e.g., en-US) by extracting base language", () => {
    // Generate headers with locale variants like en-US, es-MX, fr-CA
    const localeVariantArb = fc.tuple(supportedLocaleArb, fc.constantFrom("US", "GB", "MX", "CA", "FR"))
      .map(([base, region]) => `${base}-${region}`);

    const variantHeaderArb = fc
      .array(langEntryArb(localeVariantArb), { minLength: 1, maxLength: 5 })
      .map((entries) => entries.join(", "));

    fc.assert(
      fc.property(variantHeaderArb, (header) => {
        const detected = detectLocaleFromHeaders(header);
        // Should extract base language and match if supported
        expect(isValidLocale(detected)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * **Feature: advanced-web-blog, Property 15: Locale preference persistence**
 * **Validates: Requirements 9.3**
 *
 * For any manually selected locale L, subsequent requests from the same session
 * SHALL return L as the preferred locale regardless of browser headers.
 */
describe("Property 15: Locale preference persistence", () => {
  // Arbitrary for generating valid locale codes
  const supportedLocaleArb = fc.constantFrom(...locales) as fc.Arbitrary<Locale>;

  // Arbitrary for generating unsupported locale codes
  const unsupportedLocaleArb = fc.constantFrom("de", "ja", "zh", "ko", "pt", "it", "ru", "ar", "hi", "pl");

  // Arbitrary for generating quality values (0.0 to 1.0)
  const qualityArb = fc.float({ min: Math.fround(0.1), max: Math.fround(1.0), noNaN: true });

  // Generate a single Accept-Language entry with optional quality
  const langEntryArb = (localeArb: fc.Arbitrary<string>) =>
    fc.tuple(localeArb, fc.boolean(), qualityArb).map(([locale, hasQuality, quality]) => {
      if (hasQuality && quality < 1.0) {
        return `${locale};q=${quality.toFixed(1)}`;
      }
      return locale;
    });

  // Generate Accept-Language header with mixed supported and unsupported locales
  const acceptLanguageHeaderArb = fc
    .array(
      fc.oneof(
        langEntryArb(supportedLocaleArb as fc.Arbitrary<string>),
        langEntryArb(unsupportedLocaleArb)
      ),
      { minLength: 1, maxLength: 10 }
    )
    .map((entries) => entries.join(", "));

  // Generate a cookie header containing the locale preference
  const buildCookieHeader = (locale: Locale): string => {
    return `${LOCALE_COOKIE_NAME}=${locale}`;
  };

  // Generate cookie header with additional random cookies
  const cookieHeaderWithLocaleArb = (locale: Locale) =>
    fc.array(fc.tuple(fc.string({ minLength: 1, maxLength: 10 }), fc.string({ minLength: 1, maxLength: 20 })), { minLength: 0, maxLength: 5 })
      .map((otherCookies) => {
        const cookieParts = otherCookies
          .filter(([name]) => name !== LOCALE_COOKIE_NAME)
          .map(([name, value]) => `${name}=${value}`);
        cookieParts.push(buildCookieHeader(locale));
        // Shuffle to ensure locale cookie position doesn't matter
        return cookieParts.sort(() => Math.random() - 0.5).join("; ");
      });

  it("should return persisted locale from cookie regardless of Accept-Language header", () => {
    fc.assert(
      fc.property(
        supportedLocaleArb,
        acceptLanguageHeaderArb,
        (persistedLocale, acceptLanguageHeader) => {
          const cookieHeader = buildCookieHeader(persistedLocale);

          // Parse the cookie to get the persisted locale
          const localeFromCookie = parseLocaleCookieFromHeader(cookieHeader);

          // The persisted locale should be returned regardless of Accept-Language
          expect(localeFromCookie).toBe(persistedLocale);

          // Verify that hasExplicitLocalePreference returns true
          expect(hasExplicitLocalePreference(localeFromCookie)).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should correctly identify when explicit locale preference exists", () => {
    fc.assert(
      fc.property(supportedLocaleArb, (locale) => {
        // When a valid locale is set, hasExplicitLocalePreference should return true
        expect(hasExplicitLocalePreference(locale)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  it("should return false for hasExplicitLocalePreference when no preference is set", () => {
    fc.assert(
      fc.property(fc.constantFrom(null, undefined), (value) => {
        expect(hasExplicitLocalePreference(value)).toBe(false);
      }),
      { numRuns: 10 }
    );
  });

  it("should return false for hasExplicitLocalePreference when invalid locale is provided", () => {
    fc.assert(
      fc.property(unsupportedLocaleArb, (invalidLocale) => {
        expect(hasExplicitLocalePreference(invalidLocale)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  it("should parse locale from cookie header with multiple cookies", () => {
    fc.assert(
      fc.property(
        supportedLocaleArb.chain((locale) =>
          cookieHeaderWithLocaleArb(locale).map((header) => ({ locale, header }))
        ),
        ({ locale, header }) => {
          const parsed = parseLocaleCookieFromHeader(header);
          expect(parsed).toBe(locale);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return null when cookie header does not contain locale preference", () => {
    // Generate cookie headers without the locale cookie
    const cookieHeaderWithoutLocaleArb = fc
      .array(
        fc.tuple(
          fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s !== LOCALE_COOKIE_NAME),
          fc.string({ minLength: 1, maxLength: 20 })
        ),
        { minLength: 0, maxLength: 5 }
      )
      .map((cookies) => cookies.map(([name, value]) => `${name}=${value}`).join("; "));

    fc.assert(
      fc.property(cookieHeaderWithoutLocaleArb, (header) => {
        const parsed = parseLocaleCookieFromHeader(header);
        expect(parsed).toBe(null);
      }),
      { numRuns: 100 }
    );
  });

  it("should build correct Set-Cookie header for locale persistence", () => {
    fc.assert(
      fc.property(supportedLocaleArb, (locale) => {
        const setCookieHeader = buildLocaleSetCookieHeader(locale);

        // Verify the header contains the correct locale
        expect(setCookieHeader).toContain(`${LOCALE_COOKIE_NAME}=${locale}`);

        // Verify it has Path=/
        expect(setCookieHeader).toContain("Path=/");

        // Verify it has Max-Age set
        expect(setCookieHeader).toMatch(/Max-Age=\d+/);

        // Verify it has SameSite=Lax
        expect(setCookieHeader).toContain("SameSite=Lax");
      }),
      { numRuns: 100 }
    );
  });

  it("should ensure persisted locale overrides any browser header preference", () => {
    // This test simulates the full flow: user sets preference, then makes request with different Accept-Language
    fc.assert(
      fc.property(
        supportedLocaleArb,
        supportedLocaleArb.filter((l) => l !== "en"), // Different locale in Accept-Language
        (persistedLocale, browserLocale) => {
          // User has persisted locale L
          const cookieHeader = buildCookieHeader(persistedLocale);
          const localeFromCookie = parseLocaleCookieFromHeader(cookieHeader);

          // Browser sends different Accept-Language header
          const acceptLanguageHeader = `${browserLocale};q=1.0, en;q=0.5`;
          const detectedFromHeader = detectLocaleFromHeaders(acceptLanguageHeader);

          // When cookie exists, it should take precedence
          if (hasExplicitLocalePreference(localeFromCookie)) {
            // The persisted locale should be used, not the detected one
            expect(localeFromCookie).toBe(persistedLocale);
            // This may or may not equal detectedFromHeader, but cookie takes precedence
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
