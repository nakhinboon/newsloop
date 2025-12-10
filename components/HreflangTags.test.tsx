import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { generateHreflangAlternates } from "./HreflangTags";
import { generateHreflangTags, siteUrl } from "@/lib/seo";
import { locales, type Locale } from "@/lib/i18n/config";

/**
 * **Feature: advanced-web-blog, Property 18: Hreflang tag completeness**
 * **Validates: Requirements 10.3**
 *
 * For any post with N available locale versions, the rendered page SHALL contain
 * exactly N hreflang link tags, one for each available locale.
 *
 * This test validates the hreflang generation functions that produce the data
 * used by the HreflangTags component. The component itself renders link tags
 * based on this data, so validating the data generation ensures correctness.
 */
describe("Property 18: Hreflang tag completeness", () => {
  // Arbitrary for generating valid locale codes from supported locales
  const supportedLocaleArb = fc.constantFrom(...locales) as fc.Arbitrary<Locale>;

  // Arbitrary for generating valid slug strings
  const slugArb = fc
    .string({ minLength: 1, maxLength: 50 })
    .map((s) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "post"
    );

  // Arbitrary for generating available locales array (non-empty, unique locales)
  const availableLocalesArb = fc
    .shuffledSubarray([...locales], { minLength: 1, maxLength: locales.length })
    .chain((selectedLocales) =>
      fc.tuple(
        fc.constant(selectedLocales as Locale[]),
        fc.array(slugArb, { minLength: selectedLocales.length, maxLength: selectedLocales.length })
      ).map(([locs, slugs]) =>
        locs.map((locale, index) => ({
          locale,
          slug: slugs[index],
        }))
      )
    );

  describe("generateHreflangTags function", () => {
    it("should return exactly N hreflang entries for N available locales", () => {
      fc.assert(
        fc.property(slugArb, availableLocalesArb, (slug, availableLocales) => {
          const result = generateHreflangTags(slug, availableLocales);

          // Property: The number of hreflang tags should equal the number of available locales
          expect(result.length).toBe(availableLocales.length);
        }),
        { numRuns: 100 }
      );
    });

    it("should have one hreflang entry for each available locale", () => {
      fc.assert(
        fc.property(slugArb, availableLocalesArb, (slug, availableLocales) => {
          const result = generateHreflangTags(slug, availableLocales);

          // Property: Each available locale should have exactly one corresponding hreflang entry
          const resultLocales = result.map((r) => r.locale);
          const inputLocales = availableLocales.map((a) => a.locale);

          // Check that all input locales are present in result
          for (const locale of inputLocales) {
            expect(resultLocales).toContain(locale);
          }

          // Check that result has no duplicate locales
          const uniqueResultLocales = new Set(resultLocales);
          expect(uniqueResultLocales.size).toBe(result.length);
        }),
        { numRuns: 100 }
      );
    });

    it("should generate correct URLs for each locale", () => {
      fc.assert(
        fc.property(slugArb, availableLocalesArb, (slug, availableLocales) => {
          const result = generateHreflangTags(slug, availableLocales);

          // Property: Each hreflang entry should have a correctly formatted URL
          for (const entry of result) {
            const expectedLocale = availableLocales.find((a) => a.locale === entry.locale);
            expect(expectedLocale).toBeDefined();

            const expectedUrl = `${siteUrl}/${entry.locale}/blog/${expectedLocale!.slug}`;
            expect(entry.url).toBe(expectedUrl);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should preserve locale-slug mapping from input", () => {
      fc.assert(
        fc.property(slugArb, availableLocalesArb, (slug, availableLocales) => {
          const result = generateHreflangTags(slug, availableLocales);

          // Property: Each result entry should use the correct slug for its locale
          for (const entry of result) {
            const inputEntry = availableLocales.find((a) => a.locale === entry.locale);
            expect(inputEntry).toBeDefined();
            expect(entry.url).toContain(`/blog/${inputEntry!.slug}`);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("generateHreflangAlternates function", () => {
    it("should return exactly N entries for N available locales", () => {
      fc.assert(
        fc.property(availableLocalesArb, (availableLocales) => {
          const result = generateHreflangAlternates(availableLocales);

          // Property: The number of entries should equal the number of available locales
          expect(Object.keys(result).length).toBe(availableLocales.length);
        }),
        { numRuns: 100 }
      );
    });

    it("should have one entry for each available locale", () => {
      fc.assert(
        fc.property(availableLocalesArb, (availableLocales) => {
          const result = generateHreflangAlternates(availableLocales);

          // Property: Each available locale should have exactly one corresponding entry
          for (const alt of availableLocales) {
            expect(result[alt.locale]).toBeDefined();
            expect(result[alt.locale]).toBe(`${siteUrl}/${alt.locale}/blog/${alt.slug}`);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should have unique keys for each locale", () => {
      fc.assert(
        fc.property(availableLocalesArb, (availableLocales) => {
          const result = generateHreflangAlternates(availableLocales);

          // Property: All keys should be unique (object keys are inherently unique)
          // and should match the input locales
          const resultKeys = Object.keys(result);
          const inputLocales = availableLocales.map((a) => a.locale);

          expect(resultKeys.length).toBe(inputLocales.length);
          for (const locale of inputLocales) {
            expect(resultKeys).toContain(locale);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should generate valid URLs for all locales", () => {
      fc.assert(
        fc.property(availableLocalesArb, (availableLocales) => {
          const result = generateHreflangAlternates(availableLocales);

          // Property: All URLs should be valid and follow the expected pattern
          for (const [locale, url] of Object.entries(result)) {
            expect(url).toMatch(new RegExp(`^${siteUrl}/${locale}/blog/.+$`));
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Hreflang completeness invariants", () => {
    it("should ensure bijection between input locales and output entries", () => {
      fc.assert(
        fc.property(slugArb, availableLocalesArb, (slug, availableLocales) => {
          const tagsResult = generateHreflangTags(slug, availableLocales);
          const alternatesResult = generateHreflangAlternates(availableLocales);

          // Property: Both functions should produce the same number of entries
          expect(tagsResult.length).toBe(Object.keys(alternatesResult).length);

          // Property: Both should cover exactly the same locales
          const tagsLocales = new Set(tagsResult.map((t) => t.locale));
          const alternatesLocales = new Set(Object.keys(alternatesResult));

          expect(tagsLocales.size).toBe(alternatesLocales.size);
          for (const locale of tagsLocales) {
            expect(alternatesLocales.has(locale)).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should handle all supported locales when all are available", () => {
      fc.assert(
        fc.property(
          slugArb,
          fc.array(slugArb, { minLength: locales.length, maxLength: locales.length }),
          (slug, slugs) => {
            // Create available locales with all supported locales
            const availableLocales = locales.map((locale, index) => ({
              locale,
              slug: slugs[index],
            }));

            const result = generateHreflangTags(slug, availableLocales);

            // Property: When all locales are available, result should have entries for all
            expect(result.length).toBe(locales.length);

            const resultLocales = new Set(result.map((r) => r.locale));
            for (const locale of locales) {
              expect(resultLocales.has(locale)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle single locale correctly", () => {
      fc.assert(
        fc.property(supportedLocaleArb, slugArb, slugArb, (locale, mainSlug, localeSlug) => {
          const availableLocales = [{ locale, slug: localeSlug }];

          const tagsResult = generateHreflangTags(mainSlug, availableLocales);
          const alternatesResult = generateHreflangAlternates(availableLocales);

          // Property: Single locale should produce exactly one entry
          expect(tagsResult.length).toBe(1);
          expect(Object.keys(alternatesResult).length).toBe(1);

          // Property: The entry should be for the correct locale
          expect(tagsResult[0].locale).toBe(locale);
          expect(alternatesResult[locale]).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });
  });
});
