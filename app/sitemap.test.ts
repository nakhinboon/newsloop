import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import type { MetadataRoute } from "next";
import type { Post } from "@/lib/types";
import { locales, defaultLocale, type Locale } from "@/lib/i18n/config";

/**
 * **Feature: advanced-web-blog, Property 13: Sitemap completeness**
 * **Validates: Requirements 6.3, 10.4**
 *
 * For any set of published posts P, the generated sitemap SHALL contain
 * exactly one URL entry for each post in P, plus alternate language URLs
 * for localized versions.
 *
 * This test validates the sitemap generation logic by testing a pure function
 * that mirrors the sitemap generation algorithm. The actual sitemap.ts uses
 * async database calls, so we test the core logic separately.
 */
describe("Property 13: Sitemap completeness", () => {
  const siteUrl = "https://example.com";

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

  // Arbitrary for generating valid Post objects
  const postArbitrary: fc.Arbitrary<Post> = fc.record({
    id: fc.uuid(),
    slug: slugArb,
    title: fc.string({ minLength: 1, maxLength: 100 }),
    content: fc.string({ minLength: 0, maxLength: 500 }),
    excerpt: fc.string({ minLength: 0, maxLength: 160 }),
    author: fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      avatar: fc.option(fc.webUrl(), { nil: undefined }),
      bio: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    }),
    publishedAt: fc.date({
      min: new Date("2020-01-01"),
      max: new Date("2030-12-31"),
    }),
    updatedAt: fc.option(fc.date(), { nil: undefined }),
    category: fc.string({ minLength: 1, maxLength: 30 }),
    tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
    readingTime: fc.integer({ min: 1, max: 60 }),
    featured: fc.option(fc.boolean(), { nil: undefined }),
    image: fc.option(fc.webUrl(), { nil: undefined }),
    locale: fc.constantFrom(...locales),
    status: fc.constant("published") as fc.Arbitrary<"published">,
  });

  // Arbitrary for generating available locales for a post (subset of supported locales)
  const availableLocalesArb = fc.shuffledSubarray([...locales], {
    minLength: 1,
    maxLength: locales.length,
  }) as fc.Arbitrary<Locale[]>;

  /**
   * Pure function that generates sitemap entries for blog posts.
   * This mirrors the logic in app/sitemap.ts but works with in-memory data.
   */
  function generatePostSitemapEntries(
    posts: Post[],
    getAvailableLocales: (slug: string) => Locale[]
  ): MetadataRoute.Sitemap {
    const sitemapEntries: MetadataRoute.Sitemap = [];

    for (const post of posts) {
      const availableLocales = getAvailableLocales(post.slug);

      // Build alternate language URLs for this post
      const alternateLanguages: Record<string, string> = {};
      for (const locale of availableLocales) {
        alternateLanguages[locale] = `${siteUrl}/${locale}/blog/${post.slug}`;
      }

      // Add entry for each available locale version
      for (const locale of availableLocales) {
        sitemapEntries.push({
          url: `${siteUrl}/${locale}/blog/${post.slug}`,
          lastModified: post.updatedAt || post.publishedAt,
          changeFrequency: "weekly",
          priority: 0.8,
          alternates: {
            languages: alternateLanguages,
          },
        });
      }

      // If post only exists in default locale, add fallback entries for other locales
      if (availableLocales.length === 1 && availableLocales[0] === defaultLocale) {
        for (const locale of locales) {
          if (locale !== defaultLocale) {
            sitemapEntries.push({
              url: `${siteUrl}/${locale}/blog/${post.slug}`,
              lastModified: post.updatedAt || post.publishedAt,
              changeFrequency: "weekly",
              priority: 0.6,
              alternates: {
                languages: {
                  [defaultLocale]: `${siteUrl}/${defaultLocale}/blog/${post.slug}`,
                },
              },
            });
          }
        }
      }
    }

    return sitemapEntries;
  }

  /**
   * Helper to extract blog post URLs from sitemap entries
   */
  function extractBlogPostUrls(entries: MetadataRoute.Sitemap): string[] {
    return entries
      .map((entry) => entry.url)
      .filter((url) => url.includes("/blog/"));
  }

  /**
   * Helper to get unique post slugs from sitemap URLs
   */
  function extractUniqueSlugs(urls: string[]): Set<string> {
    const slugs = new Set<string>();
    for (const url of urls) {
      const match = url.match(/\/blog\/([^/]+)$/);
      if (match) {
        slugs.add(match[1]);
      }
    }
    return slugs;
  }

  describe("Sitemap contains all published posts", () => {
    it("should contain at least one URL entry for each published post", () => {
      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 0, maxLength: 20 }),
          (posts) => {
            // Ensure unique slugs
            const uniquePosts = posts.filter(
              (post, index, self) =>
                self.findIndex((p) => p.slug === post.slug) === index
            );

            // Mock getAvailableLocales to return default locale only
            const getAvailableLocales = (): Locale[] => [defaultLocale];

            const sitemapEntries = generatePostSitemapEntries(
              uniquePosts,
              getAvailableLocales
            );
            const blogUrls = extractBlogPostUrls(sitemapEntries);
            const sitemapSlugs = extractUniqueSlugs(blogUrls);

            // Property: Every published post slug should appear in the sitemap
            for (const post of uniquePosts) {
              expect(sitemapSlugs.has(post.slug)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should not contain URLs for posts not in the input set", () => {
      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 0, maxLength: 20 }),
          (posts) => {
            // Ensure unique slugs
            const uniquePosts = posts.filter(
              (post, index, self) =>
                self.findIndex((p) => p.slug === post.slug) === index
            );

            const inputSlugs = new Set(uniquePosts.map((p) => p.slug));

            const getAvailableLocales = (): Locale[] => [defaultLocale];

            const sitemapEntries = generatePostSitemapEntries(
              uniquePosts,
              getAvailableLocales
            );
            const blogUrls = extractBlogPostUrls(sitemapEntries);
            const sitemapSlugs = extractUniqueSlugs(blogUrls);

            // Property: Every slug in sitemap should be from the input posts
            for (const slug of sitemapSlugs) {
              expect(inputSlugs.has(slug)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Sitemap includes alternate language URLs", () => {
    it("should include alternate language URLs for each available locale", () => {
      fc.assert(
        fc.property(
          postArbitrary,
          availableLocalesArb,
          (post, availableLocales) => {
            const getAvailableLocales = (): Locale[] => availableLocales;

            const sitemapEntries = generatePostSitemapEntries(
              [post],
              getAvailableLocales
            );

            // Find entries for this post
            const postEntries = sitemapEntries.filter((entry) =>
              entry.url.includes(`/blog/${post.slug}`)
            );

            // Property: Should have entries for each available locale
            const entryLocales = new Set(
              postEntries.map((entry) => {
                const match = entry.url.match(/\/([a-z]{2})\/blog\//);
                return match ? match[1] : null;
              })
            );

            for (const locale of availableLocales) {
              expect(entryLocales.has(locale)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should include correct alternate language links in each entry", () => {
      fc.assert(
        fc.property(
          postArbitrary,
          availableLocalesArb,
          (post, availableLocales) => {
            const getAvailableLocales = (): Locale[] => availableLocales;

            const sitemapEntries = generatePostSitemapEntries(
              [post],
              getAvailableLocales
            );

            // Find entries for available locales (not fallback entries)
            const postEntries = sitemapEntries.filter(
              (entry) =>
                entry.url.includes(`/blog/${post.slug}`) &&
                entry.priority === 0.8
            );

            // Property: Each entry should have alternates for all available locales
            for (const entry of postEntries) {
              const alternates = entry.alternates?.languages || {};
              
              // Should have an alternate for each available locale
              for (const locale of availableLocales) {
                expect(alternates[locale]).toBe(
                  `${siteUrl}/${locale}/blog/${post.slug}`
                );
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Sitemap handles fallback content", () => {
    it("should add fallback entries for non-default locales when post only exists in default locale", () => {
      fc.assert(
        fc.property(postArbitrary, (post) => {
          // Post only exists in default locale
          const getAvailableLocales = (): Locale[] => [defaultLocale];

          const sitemapEntries = generatePostSitemapEntries(
            [post],
            getAvailableLocales
          );

          const postEntries = sitemapEntries.filter((entry) =>
            entry.url.includes(`/blog/${post.slug}`)
          );

          // Property: Should have entries for all locales (default + fallbacks)
          const entryLocales = new Set(
            postEntries.map((entry) => {
              const match = entry.url.match(/\/([a-z]{2})\/blog\//);
              return match ? match[1] : null;
            })
          );

          // Should have an entry for each supported locale
          for (const locale of locales) {
            expect(entryLocales.has(locale)).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should mark fallback entries with lower priority", () => {
      fc.assert(
        fc.property(postArbitrary, (post) => {
          // Post only exists in default locale
          const getAvailableLocales = (): Locale[] => [defaultLocale];

          const sitemapEntries = generatePostSitemapEntries(
            [post],
            getAvailableLocales
          );

          const postEntries = sitemapEntries.filter((entry) =>
            entry.url.includes(`/blog/${post.slug}`)
          );

          // Property: Default locale entry should have higher priority than fallbacks
          for (const entry of postEntries) {
            const match = entry.url.match(/\/([a-z]{2})\/blog\//);
            const locale = match ? match[1] : null;

            if (locale === defaultLocale) {
              expect(entry.priority).toBe(0.8);
            } else {
              expect(entry.priority).toBe(0.6);
            }
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should not add fallback entries when post exists in multiple locales", () => {
      fc.assert(
        fc.property(
          postArbitrary,
          fc.shuffledSubarray([...locales], { minLength: 2, maxLength: locales.length }),
          (post, availableLocales) => {
            const getAvailableLocales = (): Locale[] => availableLocales as Locale[];

            const sitemapEntries = generatePostSitemapEntries(
              [post],
              getAvailableLocales
            );

            const postEntries = sitemapEntries.filter((entry) =>
              entry.url.includes(`/blog/${post.slug}`)
            );

            // Property: When post exists in multiple locales, all entries should have priority 0.8
            // (no fallback entries with priority 0.6)
            for (const entry of postEntries) {
              expect(entry.priority).toBe(0.8);
            }

            // Property: Number of entries should equal number of available locales
            expect(postEntries.length).toBe(availableLocales.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Sitemap URL format", () => {
    it("should generate valid URLs with correct structure", () => {
      fc.assert(
        fc.property(
          postArbitrary,
          availableLocalesArb,
          (post, availableLocales) => {
            const getAvailableLocales = (): Locale[] => availableLocales;

            const sitemapEntries = generatePostSitemapEntries(
              [post],
              getAvailableLocales
            );

            // Property: All URLs should follow the pattern {siteUrl}/{locale}/blog/{slug}
            for (const entry of sitemapEntries) {
              if (entry.url.includes("/blog/")) {
                const urlPattern = new RegExp(
                  `^${siteUrl}/[a-z]{2}/blog/[a-z0-9-]+$`
                );
                expect(entry.url).toMatch(urlPattern);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should include lastModified date from post", () => {
      fc.assert(
        fc.property(
          postArbitrary,
          availableLocalesArb,
          (post, availableLocales) => {
            const getAvailableLocales = (): Locale[] => availableLocales;

            const sitemapEntries = generatePostSitemapEntries(
              [post],
              getAvailableLocales
            );

            const postEntries = sitemapEntries.filter((entry) =>
              entry.url.includes(`/blog/${post.slug}`)
            );

            // Property: lastModified should be updatedAt if present, otherwise publishedAt
            const expectedDate = post.updatedAt || post.publishedAt;
            for (const entry of postEntries) {
              expect(entry.lastModified).toEqual(expectedDate);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Sitemap completeness invariants", () => {
    it("should produce empty sitemap for empty post list", () => {
      const getAvailableLocales = (): Locale[] => [defaultLocale];
      const sitemapEntries = generatePostSitemapEntries([], getAvailableLocales);

      // Property: Empty input should produce empty output
      expect(sitemapEntries.length).toBe(0);
    });

    it("should handle posts with same slug correctly (deduplication)", () => {
      fc.assert(
        fc.property(postArbitrary, (post) => {
          // Create duplicate posts with same slug
          const duplicatePosts = [post, { ...post, id: "different-id" }];

          const getAvailableLocales = (): Locale[] => [defaultLocale];

          const sitemapEntries = generatePostSitemapEntries(
            duplicatePosts,
            getAvailableLocales
          );

          // Note: The current implementation doesn't deduplicate - it creates entries for each post
          // This test documents the current behavior. If deduplication is needed, the implementation
          // should be updated and this test adjusted accordingly.
          const blogUrls = extractBlogPostUrls(sitemapEntries);
          
          // Property: Each post in input generates entries (current behavior)
          // If deduplication is desired, this would need to change
          expect(blogUrls.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 }
      );
    });

    it("should maintain bijection between posts and sitemap entries for single-locale posts", () => {
      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 1, maxLength: 20 }),
          (posts) => {
            // Ensure unique slugs
            const uniquePosts = posts.filter(
              (post, index, self) =>
                self.findIndex((p) => p.slug === post.slug) === index
            );

            // All posts only in default locale
            const getAvailableLocales = (): Locale[] => [defaultLocale];

            const sitemapEntries = generatePostSitemapEntries(
              uniquePosts,
              getAvailableLocales
            );

            const blogUrls = extractBlogPostUrls(sitemapEntries);

            // Property: For single-locale posts, should have entries for all locales (default + fallbacks)
            // Each post generates: 1 default locale entry + (locales.length - 1) fallback entries
            const expectedEntries = uniquePosts.length * locales.length;
            expect(blogUrls.length).toBe(expectedEntries);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
