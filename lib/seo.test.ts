import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  generatePostMetadata,
  generateCategoryMetadata,
  generateTagMetadata,
  generateSearchMetadata,
  generateHomeMetadata,
  generateHreflangTags,
  siteUrl,
} from "./seo";
import { locales, type Locale } from "./i18n/config";
import type { Post, LocalizedPost } from "./types";

/**
 * **Feature: advanced-web-blog, Property 16: Locale URL structure**
 * **Validates: Requirements 11.1**
 *
 * For any locale L and post slug S, the generated URL SHALL follow the pattern `/{L}/blog/{S}`.
 *
 * This property validates that all URL generation functions in the SEO module
 * produce URLs that follow the locale-prefixed URL structure required by the
 * internationalization requirements.
 */
describe("Property 16: Locale URL structure", () => {
  // Arbitrary for generating valid locale codes from supported locales
  const localeArb = fc.constantFrom(...locales) as fc.Arbitrary<Locale>;

  // Arbitrary for generating valid slug strings (URL-safe, lowercase, hyphenated)
  const slugArb = fc
    .string({ minLength: 1, maxLength: 50 })
    .map((s) =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "post"
    );

  // Arbitrary for generating valid author objects
  const authorArb = fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    avatar: fc.option(fc.webUrl(), { nil: undefined }),
    bio: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
  });

  // Arbitrary for generating valid dates (avoiding NaN dates)
  const validDateArb = fc.integer({ 
    min: new Date("2020-01-01").getTime(), 
    max: new Date("2030-12-31").getTime() 
  }).map((timestamp) => new Date(timestamp));

  // Arbitrary for generating valid Post objects
  const postArb = fc.record({
    id: fc.uuid(),
    slug: slugArb,
    title: fc.string({ minLength: 1, maxLength: 100 }),
    content: fc.string({ minLength: 1, maxLength: 500 }),
    excerpt: fc.string({ minLength: 1, maxLength: 160 }),
    author: authorArb,
    publishedAt: validDateArb,
    updatedAt: fc.option(validDateArb, { nil: undefined }),
    category: fc.string({ minLength: 1, maxLength: 30 }),
    tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
    readingTime: fc.integer({ min: 1, max: 60 }),
    featured: fc.option(fc.boolean(), { nil: undefined }),
    locale: localeArb,
    status: fc.constantFrom("draft", "scheduled", "published") as fc.Arbitrary<"draft" | "scheduled" | "published">,
  }) as fc.Arbitrary<Post>;

  // Regex pattern for validating locale-prefixed blog URLs
  const blogUrlPattern = new RegExp(`^${siteUrl}/([a-z]{2})/blog/([a-z0-9-]+)$`);
  
  // Regex pattern for validating locale-prefixed category URLs
  const categoryUrlPattern = new RegExp(`^${siteUrl}/([a-z]{2})/category/(.+)$`);
  
  // Regex pattern for validating locale-prefixed tag URLs
  const tagUrlPattern = new RegExp(`^${siteUrl}/([a-z]{2})/tag/(.+)$`);
  
  // Regex pattern for validating locale-prefixed search URLs
  const searchUrlPattern = new RegExp(`^${siteUrl}/([a-z]{2})/search`);
  
  // Regex pattern for validating locale-prefixed home URLs
  const homeUrlPattern = new RegExp(`^${siteUrl}/([a-z]{2})$`);

  describe("Blog post URLs follow /{locale}/blog/{slug} pattern", () => {
    it("generatePostMetadata should produce URLs with correct locale prefix", () => {
      fc.assert(
        fc.property(postArb, localeArb, (post, locale) => {
          const metadata = generatePostMetadata(post, locale);
          
          // Extract URL from openGraph metadata
          const url = metadata.openGraph?.url as string;
          
          // Property: URL should follow the pattern {siteUrl}/{locale}/blog/{slug}
          expect(url).toBeDefined();
          expect(url).toBe(`${siteUrl}/${locale}/blog/${post.slug}`);
          
          // Property: URL should match the locale-prefixed blog URL pattern
          const match = url.match(blogUrlPattern);
          expect(match).not.toBeNull();
          expect(match![1]).toBe(locale);
          expect(match![2]).toBe(post.slug);
        }),
        { numRuns: 100 }
      );
    });

    it("generatePostMetadata canonical URL should follow locale pattern", () => {
      fc.assert(
        fc.property(postArb, localeArb, (post, locale) => {
          const metadata = generatePostMetadata(post, locale);
          
          // Extract canonical URL from alternates
          const canonical = metadata.alternates?.canonical as string;
          
          // Property: Canonical URL should follow the pattern {siteUrl}/{locale}/blog/{slug}
          expect(canonical).toBeDefined();
          expect(canonical).toBe(`${siteUrl}/${locale}/blog/${post.slug}`);
        }),
        { numRuns: 100 }
      );
    });

    it("generateHreflangTags should produce URLs with correct locale prefixes", () => {
      // Arbitrary for generating available locales array
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

      fc.assert(
        fc.property(slugArb, availableLocalesArb, (slug, availableLocales) => {
          const result = generateHreflangTags(slug, availableLocales);
          
          // Property: Each generated URL should follow the pattern {siteUrl}/{locale}/blog/{slug}
          for (const entry of result) {
            const expectedLocale = availableLocales.find((a) => a.locale === entry.locale);
            expect(expectedLocale).toBeDefined();
            
            // Verify URL follows the locale-prefixed pattern
            expect(entry.url).toBe(`${siteUrl}/${entry.locale}/blog/${expectedLocale!.slug}`);
            
            // Verify URL matches the pattern regex
            const match = entry.url.match(blogUrlPattern);
            expect(match).not.toBeNull();
            expect(match![1]).toBe(entry.locale);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Category URLs follow /{locale}/category/{category} pattern", () => {
    it("generateCategoryMetadata should produce URLs with correct locale prefix", () => {
      const categoryArb = fc.string({ minLength: 1, maxLength: 30 });
      const postCountArb = fc.integer({ min: 0, max: 1000 });

      fc.assert(
        fc.property(categoryArb, localeArb, postCountArb, (category, locale, postCount) => {
          const metadata = generateCategoryMetadata(category, locale, postCount);
          
          // Extract URL from openGraph metadata
          const url = metadata.openGraph?.url as string;
          
          // Property: URL should follow the pattern {siteUrl}/{locale}/category/{category}
          expect(url).toBeDefined();
          expect(url).toBe(`${siteUrl}/${locale}/category/${encodeURIComponent(category.toLowerCase())}`);
          
          // Property: URL should match the locale-prefixed category URL pattern
          const match = url.match(categoryUrlPattern);
          expect(match).not.toBeNull();
          expect(match![1]).toBe(locale);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Tag URLs follow /{locale}/tag/{tag} pattern", () => {
    it("generateTagMetadata should produce URLs with correct locale prefix", () => {
      const tagArb = fc.string({ minLength: 1, maxLength: 30 });
      const postCountArb = fc.integer({ min: 0, max: 1000 });

      fc.assert(
        fc.property(tagArb, localeArb, postCountArb, (tag, locale, postCount) => {
          const metadata = generateTagMetadata(tag, locale, postCount);
          
          // Extract URL from openGraph metadata
          const url = metadata.openGraph?.url as string;
          
          // Property: URL should follow the pattern {siteUrl}/{locale}/tag/{tag}
          expect(url).toBeDefined();
          expect(url).toBe(`${siteUrl}/${locale}/tag/${encodeURIComponent(tag.toLowerCase())}`);
          
          // Property: URL should match the locale-prefixed tag URL pattern
          const match = url.match(tagUrlPattern);
          expect(match).not.toBeNull();
          expect(match![1]).toBe(locale);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Search URLs follow /{locale}/search pattern", () => {
    it("generateSearchMetadata should produce URLs with correct locale prefix", () => {
      const queryArb = fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined });

      fc.assert(
        fc.property(localeArb, queryArb, (locale, query) => {
          const metadata = generateSearchMetadata(locale, query);
          
          // Extract URL from openGraph metadata
          const url = metadata.openGraph?.url as string;
          
          // Property: URL should start with {siteUrl}/{locale}/search
          expect(url).toBeDefined();
          expect(url).toMatch(searchUrlPattern);
          
          // Property: URL should contain the correct locale
          const match = url.match(searchUrlPattern);
          expect(match).not.toBeNull();
          expect(match![1]).toBe(locale);
          
          // Property: URL should include query parameter if query is provided
          if (query) {
            expect(url).toContain(`?q=${encodeURIComponent(query)}`);
          } else {
            expect(url).toBe(`${siteUrl}/${locale}/search`);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Home URLs follow /{locale} pattern", () => {
    it("generateHomeMetadata should produce URLs with correct locale prefix", () => {
      fc.assert(
        fc.property(localeArb, (locale) => {
          const metadata = generateHomeMetadata(locale);
          
          // Extract URL from openGraph metadata
          const url = metadata.openGraph?.url as string;
          
          // Property: URL should follow the pattern {siteUrl}/{locale}
          expect(url).toBeDefined();
          expect(url).toBe(`${siteUrl}/${locale}`);
          
          // Property: URL should match the locale-prefixed home URL pattern
          const match = url.match(homeUrlPattern);
          expect(match).not.toBeNull();
          expect(match![1]).toBe(locale);
        }),
        { numRuns: 100 }
      );
    });

    it("generateHomeMetadata should include alternate language URLs for all locales", () => {
      fc.assert(
        fc.property(localeArb, (locale) => {
          const metadata = generateHomeMetadata(locale);
          
          // Extract alternate languages from metadata
          const alternateLanguages = metadata.alternates?.languages as Record<string, string>;
          
          // Property: All supported locales should have alternate URLs
          expect(alternateLanguages).toBeDefined();
          expect(Object.keys(alternateLanguages).length).toBe(locales.length);
          
          // Property: Each alternate URL should follow the locale pattern
          for (const loc of locales) {
            expect(alternateLanguages[loc]).toBe(`${siteUrl}/${loc}`);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Locale URL structure invariants", () => {
    it("all generated URLs should contain exactly one locale segment", () => {
      fc.assert(
        fc.property(postArb, localeArb, (post, locale) => {
          const metadata = generatePostMetadata(post, locale);
          const url = metadata.openGraph?.url as string;
          
          // Property: URL should contain exactly one locale segment
          // Count occurrences of locale patterns in the URL path
          const urlPath = url.replace(siteUrl, "");
          const localeMatches = urlPath.match(/^\/[a-z]{2}\//);
          
          expect(localeMatches).not.toBeNull();
          expect(localeMatches!.length).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    it("locale segment should always be a supported locale", () => {
      fc.assert(
        fc.property(postArb, localeArb, (post, locale) => {
          const metadata = generatePostMetadata(post, locale);
          const url = metadata.openGraph?.url as string;
          
          // Extract locale from URL
          const urlPath = url.replace(siteUrl, "");
          const localeMatch = urlPath.match(/^\/([a-z]{2})\//);
          
          expect(localeMatch).not.toBeNull();
          const extractedLocale = localeMatch![1];
          
          // Property: Extracted locale should be in the list of supported locales
          expect(locales).toContain(extractedLocale);
          expect(extractedLocale).toBe(locale);
        }),
        { numRuns: 100 }
      );
    });

    it("URL locale should match the requested locale parameter", () => {
      fc.assert(
        fc.property(postArb, localeArb, (post, locale) => {
          const metadata = generatePostMetadata(post, locale);
          const url = metadata.openGraph?.url as string;
          
          // Property: The locale in the URL should match the locale parameter
          expect(url).toContain(`/${locale}/`);
        }),
        { numRuns: 100 }
      );
    });
  });
});
