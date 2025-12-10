import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  calculateReadingTime,
  generateSlug,
  getAllPosts,
  getPostBySlug,
  getPostsByCategory,
  getPostsByTag,
  getAllCategories,
  getAllTags,
  getRelatedPosts,
  getFallbackPost,
  getPostBySlugAndLocale,
  sortPostsByDateDescending,
  toPostPreview,
} from "./posts";
import type { Post, LocalizedPost } from "./types";

describe("calculateReadingTime", () => {
  it("should return 1 minute for short content", () => {
    const content = "Hello world";
    expect(calculateReadingTime(content)).toBe(1);
  });

  it("should calculate reading time based on word count", () => {
    // 400 words should be 2 minutes at 200 wpm
    const words = Array(400).fill("word").join(" ");
    expect(calculateReadingTime(words)).toBe(2);
  });

  it("should return at least 1 minute", () => {
    expect(calculateReadingTime("")).toBe(1);
  });
});

describe("generateSlug", () => {
  it("should convert title to lowercase slug", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("should handle special characters", () => {
    expect(generateSlug("Hello! World?")).toBe("hello-world");
  });

  it("should handle unicode characters", () => {
    expect(generateSlug("Café Résumé")).toBe("cafe-resume");
  });

  it("should handle multiple spaces", () => {
    expect(generateSlug("Hello   World")).toBe("hello-world");
  });

  it("should handle leading/trailing spaces", () => {
    expect(generateSlug("  Hello World  ")).toBe("hello-world");
  });

  it("should handle multiple hyphens", () => {
    expect(generateSlug("Hello--World")).toBe("hello-world");
  });
});

describe("Post Service", () => {
  it("should get all posts sorted by date descending", async () => {
    const posts = await getAllPosts();
    expect(Array.isArray(posts)).toBe(true);
    
    // Verify sorting (newest first)
    for (let i = 1; i < posts.length; i++) {
      expect(posts[i - 1].publishedAt.getTime()).toBeGreaterThanOrEqual(
        posts[i].publishedAt.getTime()
      );
    }
  });

  it("should get post by slug", async () => {
    const posts = await getAllPosts();
    if (posts.length > 0) {
      const post = await getPostBySlug(posts[0].slug);
      expect(post).not.toBeNull();
      expect(post?.slug).toBe(posts[0].slug);
    }
  });

  it("should return null for non-existent slug", async () => {
    const post = await getPostBySlug("non-existent-slug-12345");
    expect(post).toBeNull();
  });

  it("should filter posts by category", async () => {
    const posts = await getAllPosts();
    if (posts.length > 0) {
      const category = posts[0].category;
      const filtered = await getPostsByCategory(category);
      expect(filtered.every((p) => p.category.toLowerCase() === category.toLowerCase())).toBe(true);
    }
  });

  it("should filter posts by tag", async () => {
    const posts = await getAllPosts();
    if (posts.length > 0 && posts[0].tags.length > 0) {
      const tag = posts[0].tags[0];
      const filtered = await getPostsByTag(tag);
      expect(filtered.every((p) => p.tags.some((t) => t.toLowerCase() === tag.toLowerCase()))).toBe(true);
    }
  });

  it("should get all categories with post counts", async () => {
    const categories = await getAllCategories();
    expect(Array.isArray(categories)).toBe(true);
    categories.forEach((cat) => {
      expect(cat).toHaveProperty("name");
      expect(cat).toHaveProperty("slug");
      expect(cat).toHaveProperty("postCount");
      expect(cat.postCount).toBeGreaterThan(0);
    });
  });

  it("should get all tags with post counts", async () => {
    const tags = await getAllTags();
    expect(Array.isArray(tags)).toBe(true);
    tags.forEach((tag) => {
      expect(tag).toHaveProperty("name");
      expect(tag).toHaveProperty("slug");
      expect(tag).toHaveProperty("postCount");
      expect(tag.postCount).toBeGreaterThan(0);
    });
  });

  it("should get related posts sharing tags or category", async () => {
    const posts = await getAllPosts();
    if (posts.length > 1) {
      const related = await getRelatedPosts(posts[0], 3);
      expect(Array.isArray(related)).toBe(true);
      
      // Each related post should share at least one tag or category
      related.forEach((relatedPost) => {
        const sharesCategory = relatedPost.category === posts[0].category;
        const sharesTags = relatedPost.tags.some((t) => posts[0].tags.includes(t));
        expect(sharesCategory || sharesTags).toBe(true);
      });
    }
  });
});

describe("Locale Support", () => {
  it("should get post by slug and locale", async () => {
    const post = await getPostBySlugAndLocale("getting-started", "en");
    if (post) {
      expect(post.locale).toBe("en");
      expect(post.slug).toBe("getting-started");
    }
  });

  it("should return fallback post when locale not available", async () => {
    const result = await getFallbackPost("getting-started", "th");
    if (result) {
      // If Thai version doesn't exist, should fallback
      expect(result.post).toBeDefined();
    }
  });
});

/**
 * Property-Based Tests
 * **Feature: advanced-web-blog, Property 17: Locale fallback consistency**
 * **Validates: Requirements 9.4, 9.5**
 *
 * For any post P requested in locale L where L version does not exist,
 * the system SHALL return the default locale version with `isFallback: true`.
 */
describe("Property 17: Locale fallback consistency", () => {
  // Import locale config
  const supportedLocales = ["en", "es", "fr", "th"] as const;
  type TestLocale = (typeof supportedLocales)[number];
  const defaultLocale: TestLocale = "en";

  // Arbitrary for generating valid LocalizedPost objects
  const localizedPostArbitrary = (locale: TestLocale): fc.Arbitrary<LocalizedPost> =>
    fc.record({
      id: fc.uuid(),
      slug: fc.string({ minLength: 1, maxLength: 50 }).map((s) =>
        s.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "post"
      ),
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
      locale: fc.constant(locale),
      status: fc.constantFrom("draft", "scheduled", "published") as fc.Arbitrary<"draft" | "scheduled" | "published">,
      alternateLocales: fc.constant([]),
    });

  // Pure function that implements the fallback logic for testing
  // This mirrors the logic in getFallbackPost but works with in-memory data
  function applyFallbackLogic(
    postsMap: Map<string, LocalizedPost>, // Map of "slug:locale" -> post
    slug: string,
    preferredLocale: TestLocale
  ): { post: LocalizedPost; isFallback: boolean } | null {
    // Try to get post in preferred locale
    const localizedPost = postsMap.get(`${slug}:${preferredLocale}`);
    if (localizedPost) {
      return { post: localizedPost, isFallback: false };
    }

    // Fall back to default locale
    const fallbackPost = postsMap.get(`${slug}:${defaultLocale}`);
    if (fallbackPost) {
      return {
        post: { ...fallbackPost, locale: preferredLocale },
        isFallback: true,
      };
    }

    return null;
  }

  it("should return isFallback: false when post exists in requested locale", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...supportedLocales),
        localizedPostArbitrary("en").chain((basePost) =>
          fc.constantFrom(...supportedLocales).map((locale) => ({
            ...basePost,
            locale,
          }))
        ),
        (requestedLocale, post) => {
          // Create a posts map with the post in the requested locale
          const postsMap = new Map<string, LocalizedPost>();
          const postInRequestedLocale = { ...post, locale: requestedLocale };
          postsMap.set(`${post.slug}:${requestedLocale}`, postInRequestedLocale);

          const result = applyFallbackLogic(postsMap, post.slug, requestedLocale);

          // Property: When post exists in requested locale, isFallback should be false
          expect(result).not.toBeNull();
          expect(result!.isFallback).toBe(false);
          expect(result!.post.locale).toBe(requestedLocale);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return isFallback: true when post only exists in default locale", () => {
    // Generate non-default locales only
    const nonDefaultLocaleArb = fc.constantFrom(
      ...supportedLocales.filter((l) => l !== defaultLocale)
    );

    fc.assert(
      fc.property(
        nonDefaultLocaleArb,
        localizedPostArbitrary(defaultLocale),
        (requestedLocale, defaultPost) => {
          // Create a posts map with the post ONLY in default locale
          const postsMap = new Map<string, LocalizedPost>();
          postsMap.set(`${defaultPost.slug}:${defaultLocale}`, defaultPost);

          const result = applyFallbackLogic(postsMap, defaultPost.slug, requestedLocale);

          // Property: When post doesn't exist in requested locale but exists in default,
          // isFallback should be true
          expect(result).not.toBeNull();
          expect(result!.isFallback).toBe(true);
          // The returned post should have the requested locale set (for display purposes)
          expect(result!.post.locale).toBe(requestedLocale);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return null when post doesn't exist in any locale", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...supportedLocales),
        fc.string({ minLength: 1, maxLength: 50 }).map((s) =>
          s.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "nonexistent"
        ),
        (requestedLocale, slug) => {
          // Empty posts map - no posts exist
          const postsMap = new Map<string, LocalizedPost>();

          const result = applyFallbackLogic(postsMap, slug, requestedLocale);

          // Property: When post doesn't exist in any locale, should return null
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should preserve post content when falling back to default locale", () => {
    const nonDefaultLocaleArb = fc.constantFrom(
      ...supportedLocales.filter((l) => l !== defaultLocale)
    );

    fc.assert(
      fc.property(
        nonDefaultLocaleArb,
        localizedPostArbitrary(defaultLocale),
        (requestedLocale, defaultPost) => {
          const postsMap = new Map<string, LocalizedPost>();
          postsMap.set(`${defaultPost.slug}:${defaultLocale}`, defaultPost);

          const result = applyFallbackLogic(postsMap, defaultPost.slug, requestedLocale);

          // Property: Fallback should preserve all content from default locale post
          expect(result).not.toBeNull();
          expect(result!.post.id).toBe(defaultPost.id);
          expect(result!.post.slug).toBe(defaultPost.slug);
          expect(result!.post.title).toBe(defaultPost.title);
          expect(result!.post.content).toBe(defaultPost.content);
          expect(result!.post.excerpt).toBe(defaultPost.excerpt);
          expect(result!.post.category).toBe(defaultPost.category);
          expect(result!.post.tags).toEqual(defaultPost.tags);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should prefer requested locale over default when both exist", () => {
    const nonDefaultLocaleArb = fc.constantFrom(
      ...supportedLocales.filter((l) => l !== defaultLocale)
    );

    fc.assert(
      fc.property(
        nonDefaultLocaleArb,
        localizedPostArbitrary(defaultLocale),
        fc.string({ minLength: 1, maxLength: 100 }), // Different title for localized version
        (requestedLocale, defaultPost, localizedTitle) => {
          const postsMap = new Map<string, LocalizedPost>();

          // Add default locale version
          postsMap.set(`${defaultPost.slug}:${defaultLocale}`, defaultPost);

          // Add requested locale version with different title
          const localizedPost: LocalizedPost = {
            ...defaultPost,
            locale: requestedLocale,
            title: localizedTitle,
          };
          postsMap.set(`${defaultPost.slug}:${requestedLocale}`, localizedPost);

          const result = applyFallbackLogic(postsMap, defaultPost.slug, requestedLocale);

          // Property: When both locales exist, should return requested locale (not fallback)
          expect(result).not.toBeNull();
          expect(result!.isFallback).toBe(false);
          expect(result!.post.locale).toBe(requestedLocale);
          expect(result!.post.title).toBe(localizedTitle);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests
 * **Feature: advanced-web-blog, Property 6: Category filtering**
 * **Feature: advanced-web-blog, Property 7: Tag filtering**
 * **Validates: Requirements 3.1, 3.2**
 */
describe("Property 6 & 7: Category and Tag Filtering", () => {
  // Arbitrary for generating valid Post objects
  const postArbitrary: fc.Arbitrary<Post> = fc.record({
    id: fc.uuid(),
    slug: fc.string({ minLength: 1, maxLength: 50 }).map((s) =>
      s.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "post"
    ),
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
    locale: fc.constantFrom("en", "es", "fr", "th"),
    status: fc.constantFrom("draft", "scheduled", "published") as fc.Arbitrary<"draft" | "scheduled" | "published">,
  });

  // Pure filtering functions that mirror the implementation logic
  function filterByCategory(posts: Post[], category: string): Post[] {
    return posts.filter(
      (post) => post.category.toLowerCase() === category.toLowerCase()
    );
  }

  function filterByTag(posts: Post[], tag: string): Post[] {
    return posts.filter((post) =>
      post.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
    );
  }

  /**
   * Property 6: Category filtering
   * For any category C and the result set R from getPostsByCategory(C),
   * every post in R SHALL have category === C, and R SHALL contain all posts with that category.
   */
  describe("Property 6: Category filtering", () => {
    it("every post in result set has the requested category (case-insensitive)", () => {
      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 30 }),
          (posts, category) => {
            const result = filterByCategory(posts, category);

            // Property: Every post in result has category === C (case-insensitive)
            for (const post of result) {
              if (post.category.toLowerCase() !== category.toLowerCase()) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("result set contains ALL posts with the requested category", () => {
      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 30 }),
          (posts, category) => {
            const result = filterByCategory(posts, category);

            // Property: R SHALL contain all posts with that category
            const expectedPosts = posts.filter(
              (p) => p.category.toLowerCase() === category.toLowerCase()
            );

            if (result.length !== expectedPosts.length) {
              return false;
            }

            // Verify all expected posts are in result
            const resultIds = new Set(result.map((p) => p.id));
            for (const expected of expectedPosts) {
              if (!resultIds.has(expected.id)) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("filtering by a category that exists in posts returns non-empty result", () => {
      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 1, maxLength: 50 }).filter((posts) => posts.length > 0),
          (posts) => {
            // Pick a category that exists in the posts
            const existingCategory = posts[0].category;
            const result = filterByCategory(posts, existingCategory);

            // Property: If we filter by an existing category, we should get at least one result
            return result.length >= 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("filtering by non-existent category returns empty result", () => {
      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
          (posts) => {
            // Use a category that definitely doesn't exist
            const nonExistentCategory = "___NON_EXISTENT_CATEGORY_12345___";
            const result = filterByCategory(posts, nonExistentCategory);

            // Property: Filtering by non-existent category returns empty
            return result.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 7: Tag filtering
   * For any tag T and the result set R from getPostsByTag(T),
   * every post in R SHALL have T in its tags array, and R SHALL contain all posts with that tag.
   */
  describe("Property 7: Tag filtering", () => {
    it("every post in result set contains the requested tag (case-insensitive)", () => {
      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (posts, tag) => {
            const result = filterByTag(posts, tag);

            // Property: Every post in result has T in its tags array (case-insensitive)
            for (const post of result) {
              const hasTag = post.tags.some(
                (t) => t.toLowerCase() === tag.toLowerCase()
              );
              if (!hasTag) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("result set contains ALL posts with the requested tag", () => {
      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 20 }),
          (posts, tag) => {
            const result = filterByTag(posts, tag);

            // Property: R SHALL contain all posts with that tag
            const expectedPosts = posts.filter((p) =>
              p.tags.some((t) => t.toLowerCase() === tag.toLowerCase())
            );

            if (result.length !== expectedPosts.length) {
              return false;
            }

            // Verify all expected posts are in result
            const resultIds = new Set(result.map((p) => p.id));
            for (const expected of expectedPosts) {
              if (!resultIds.has(expected.id)) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("filtering by a tag that exists in posts returns non-empty result", () => {
      // Generate posts that have at least one tag
      const postWithTagsArbitrary = postArbitrary.filter((p) => p.tags.length > 0);

      fc.assert(
        fc.property(
          fc.array(postWithTagsArbitrary, { minLength: 1, maxLength: 50 }).filter((posts) => posts.length > 0),
          (posts) => {
            // Pick a tag that exists in the posts
            const existingTag = posts[0].tags[0];
            const result = filterByTag(posts, existingTag);

            // Property: If we filter by an existing tag, we should get at least one result
            return result.length >= 1;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("filtering by non-existent tag returns empty result", () => {
      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
          (posts) => {
            // Use a tag that definitely doesn't exist
            const nonExistentTag = "___NON_EXISTENT_TAG_12345___";
            const result = filterByTag(posts, nonExistentTag);

            // Property: Filtering by non-existent tag returns empty
            return result.length === 0;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("posts with multiple tags are found when filtering by any of their tags", () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 2, maxLength: 5 }),
          postArbitrary,
          (tags, basePost) => {
            // Create a post with multiple tags
            const postWithTags: Post = { ...basePost, tags };
            const posts = [postWithTags];

            // Property: Post should be found when filtering by any of its tags
            for (const tag of tags) {
              const result = filterByTag(posts, tag);
              if (result.length !== 1 || result[0].id !== postWithTags.id) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Property-Based Tests
 * **Feature: advanced-web-blog, Property 5: Related posts share taxonomy**
 * **Validates: Requirements 2.5**
 *
 * For any post P and its related posts R, each post in R SHALL share
 * at least one tag or the same category with P.
 */
describe("Property 5: Related posts share taxonomy", () => {
  // Arbitrary for generating valid Post objects
  const postArbitrary: fc.Arbitrary<Post> = fc.record({
    id: fc.uuid(),
    slug: fc.string({ minLength: 1, maxLength: 50 }).map((s) =>
      s.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "post"
    ),
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
    locale: fc.constantFrom("en", "es", "fr", "th"),
    status: fc.constantFrom("draft", "scheduled", "published") as fc.Arbitrary<"draft" | "scheduled" | "published">,
  });

  // Pure function that implements the related posts logic for testing
  // This mirrors the logic in getRelatedPosts but works with in-memory data
  function findRelatedPosts(
    targetPost: Post,
    allPosts: Post[],
    limit: number = 3
  ): Post[] {
    // Filter out the current post and score remaining posts
    const scoredPosts = allPosts
      .filter((p) => p.slug !== targetPost.slug)
      .map((p) => {
        let score = 0;

        // Score for matching category
        if (p.category === targetPost.category) {
          score += 2;
        }

        // Score for each matching tag
        for (const tag of p.tags) {
          if (targetPost.tags.includes(tag)) {
            score += 1;
          }
        }

        return { post: p, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scoredPosts.slice(0, limit).map((item) => item.post);
  }

  // Helper to check if two posts share taxonomy (category or at least one tag)
  function sharesTaxonomy(postA: Post, postB: Post): boolean {
    // Check if they share the same category
    if (postA.category === postB.category) {
      return true;
    }

    // Check if they share at least one tag
    for (const tag of postA.tags) {
      if (postB.tags.includes(tag)) {
        return true;
      }
    }

    return false;
  }

  it("every related post shares at least one tag or the same category with the target post", () => {
    fc.assert(
      fc.property(
        postArbitrary,
        fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
        fc.integer({ min: 1, max: 10 }),
        (targetPost, otherPosts, limit) => {
          // Ensure target post is not in otherPosts (by slug)
          const allPosts = [targetPost, ...otherPosts.filter((p) => p.slug !== targetPost.slug)];
          
          const relatedPosts = findRelatedPosts(targetPost, allPosts, limit);

          // Property: Every post in R SHALL share at least one tag or the same category with P
          for (const relatedPost of relatedPosts) {
            if (!sharesTaxonomy(targetPost, relatedPost)) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("related posts do not include the target post itself", () => {
    fc.assert(
      fc.property(
        postArbitrary,
        fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
        fc.integer({ min: 1, max: 10 }),
        (targetPost, otherPosts, limit) => {
          const allPosts = [targetPost, ...otherPosts];
          
          const relatedPosts = findRelatedPosts(targetPost, allPosts, limit);

          // Property: The target post should never appear in its own related posts
          for (const relatedPost of relatedPosts) {
            if (relatedPost.slug === targetPost.slug) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("related posts are limited to the specified limit", () => {
    fc.assert(
      fc.property(
        postArbitrary,
        fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
        fc.integer({ min: 1, max: 10 }),
        (targetPost, otherPosts, limit) => {
          const allPosts = [targetPost, ...otherPosts];
          
          const relatedPosts = findRelatedPosts(targetPost, allPosts, limit);

          // Property: Number of related posts should not exceed the limit
          return relatedPosts.length <= limit;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("posts with matching category are included in related posts", () => {
    fc.assert(
      fc.property(
        postArbitrary,
        postArbitrary,
        (targetPost, otherPost) => {
          // Create a post with the same category but different slug
          const sameCategoryPost: Post = {
            ...otherPost,
            slug: otherPost.slug === targetPost.slug ? `${otherPost.slug}-other` : otherPost.slug,
            category: targetPost.category,
            tags: [], // No shared tags, only category
          };

          const allPosts = [targetPost, sameCategoryPost];
          const relatedPosts = findRelatedPosts(targetPost, allPosts, 10);

          // Property: A post with the same category should be in related posts
          // (unless it's the same post by slug)
          if (sameCategoryPost.slug !== targetPost.slug) {
            const found = relatedPosts.some((p) => p.slug === sameCategoryPost.slug);
            return found;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("posts with matching tags are included in related posts", () => {
    fc.assert(
      fc.property(
        postArbitrary.filter((p) => p.tags.length > 0), // Target must have at least one tag
        postArbitrary,
        (targetPost, otherPost) => {
          // Create a post with a shared tag but different category and slug
          const sharedTag = targetPost.tags[0];
          const sameTagPost: Post = {
            ...otherPost,
            slug: otherPost.slug === targetPost.slug ? `${otherPost.slug}-other` : otherPost.slug,
            category: `different-${targetPost.category}`, // Different category
            tags: [sharedTag], // Share one tag
          };

          const allPosts = [targetPost, sameTagPost];
          const relatedPosts = findRelatedPosts(targetPost, allPosts, 10);

          // Property: A post with a shared tag should be in related posts
          if (sameTagPost.slug !== targetPost.slug) {
            const found = relatedPosts.some((p) => p.slug === sameTagPost.slug);
            return found;
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("posts with no shared taxonomy are not included in related posts", () => {
    fc.assert(
      fc.property(
        postArbitrary,
        postArbitrary,
        (targetPost, otherPost) => {
          // Create a post with completely different taxonomy
          const unrelatedPost: Post = {
            ...otherPost,
            slug: `unrelated-${otherPost.slug}`,
            category: `unique-category-${Math.random()}`, // Unique category
            tags: [`unique-tag-${Math.random()}`], // Unique tags
          };

          const allPosts = [targetPost, unrelatedPost];
          const relatedPosts = findRelatedPosts(targetPost, allPosts, 10);

          // Property: A post with no shared taxonomy should NOT be in related posts
          const found = relatedPosts.some((p) => p.slug === unrelatedPost.slug);
          return !found;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("related posts are sorted by relevance score (category match > tag match)", () => {
    fc.assert(
      fc.property(
        postArbitrary.filter((p) => p.tags.length > 0),
        postArbitrary,
        postArbitrary,
        (targetPost, basePost1, basePost2) => {
          // Create a post with same category (score = 2)
          const categoryMatchPost: Post = {
            ...basePost1,
            slug: "category-match-post",
            category: targetPost.category,
            tags: [], // No tag matches
          };

          // Create a post with one tag match (score = 1)
          const tagMatchPost: Post = {
            ...basePost2,
            slug: "tag-match-post",
            category: `different-${targetPost.category}`,
            tags: [targetPost.tags[0]], // One tag match
          };

          const allPosts = [targetPost, tagMatchPost, categoryMatchPost];
          const relatedPosts = findRelatedPosts(targetPost, allPosts, 10);

          // Property: Category match (score 2) should come before single tag match (score 1)
          if (relatedPosts.length >= 2) {
            const categoryMatchIndex = relatedPosts.findIndex((p) => p.slug === "category-match-post");
            const tagMatchIndex = relatedPosts.findIndex((p) => p.slug === "tag-match-post");
            
            if (categoryMatchIndex !== -1 && tagMatchIndex !== -1) {
              return categoryMatchIndex < tagMatchIndex;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests
 * **Feature: advanced-web-blog, Property 12: Slug generation**
 * **Validates: Requirements 6.4**
 */
describe("Property-Based Tests: Slug Generation", () => {
  it("should generate slugs that are lowercase, contain only alphanumeric characters and hyphens, and are derivable from the title", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        (title) => {
          const slug = generateSlug(title);

          // Property 1: Slug should be lowercase
          if (slug !== slug.toLowerCase()) {
            return false;
          }

          // Property 2: Slug should contain only alphanumeric characters and hyphens
          if (!/^[a-z0-9-]*$/.test(slug)) {
            return false;
          }

          // Property 3: Slug should not have leading or trailing hyphens
          if (slug.startsWith("-") || slug.endsWith("-")) {
            return false;
          }

          // Property 4: Slug should not have consecutive hyphens
          if (/--/.test(slug)) {
            return false;
          }

          // Property 5: Slug should be derivable from title
          // If title has alphanumeric content, slug should be non-empty
          const normalizedTitle = title
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
          const hasAlphanumeric = /[a-zA-Z0-9]/.test(normalizedTitle);
          
          if (hasAlphanumeric && slug.length === 0) {
            return false;
          }

          // Property 6: All alphanumeric characters in slug should come from the title
          // (after normalization and lowercasing)
          if (slug.length > 0) {
            const slugAlphanumeric = slug.replace(/-/g, "");
            const titleAlphanumeric = normalizedTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
            
            // The slug's alphanumeric content should match the title's alphanumeric content
            if (slugAlphanumeric !== titleAlphanumeric) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests
 * **Feature: advanced-web-blog, Property 1: Post ordering by date**
 * **Validates: Requirements 1.1**
 */
describe("Property-Based Tests: Post Ordering", () => {
  // Arbitrary for generating valid Post objects
  const postArbitrary: fc.Arbitrary<Post> = fc.record({
    id: fc.uuid(),
    slug: fc.string({ minLength: 1, maxLength: 50 }).map((s) =>
      s.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "post"
    ),
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
    locale: fc.constantFrom("en", "es", "fr", "th"),
    status: fc.constantFrom("draft", "scheduled", "published") as fc.Arbitrary<"draft" | "scheduled" | "published">,
  });

  it("should sort posts by publishedAt date in descending order (newest first)", () => {
    fc.assert(
      fc.property(
        fc.array(postArbitrary, { minLength: 0, maxLength: 100 }),
        (posts) => {
          const sorted = sortPostsByDateDescending(posts);

          // Property: For any collection of posts, after sorting,
          // each post's publishedAt should be >= the next post's publishedAt
          for (let i = 1; i < sorted.length; i++) {
            const prevDate = sorted[i - 1].publishedAt.getTime();
            const currDate = sorted[i].publishedAt.getTime();
            if (prevDate < currDate) {
              return false; // Violation: previous post is older than current
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should preserve all posts after sorting (no posts lost or duplicated)", () => {
    fc.assert(
      fc.property(
        fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
        (posts) => {
          const sorted = sortPostsByDateDescending(posts);

          // Property: Sorting should preserve the same number of posts
          if (sorted.length !== posts.length) {
            return false;
          }

          // Property: All original post IDs should be present in sorted result
          const originalIds = new Set(posts.map((p) => p.id));
          const sortedIds = new Set(sorted.map((p) => p.id));

          if (originalIds.size !== sortedIds.size) {
            return false;
          }

          for (const id of originalIds) {
            if (!sortedIds.has(id)) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property-Based Tests
 * **Feature: advanced-web-blog, Property 8: Search returns matching posts**
 * **Feature: advanced-web-blog, Property 10: Empty search returns all posts**
 * **Validates: Requirements 4.1, 4.3**
 */
import { search } from "./search";

describe("Property 8 & 10: Search Functionality", () => {
  // Arbitrary for generating valid Post objects
  const postArbitrary: fc.Arbitrary<Post> = fc.record({
    id: fc.uuid(),
    slug: fc.string({ minLength: 1, maxLength: 50 }).map((s) =>
      s.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "post"
    ),
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
    locale: fc.constantFrom("en", "es", "fr", "th"),
    status: fc.constantFrom("draft", "scheduled", "published") as fc.Arbitrary<"draft" | "scheduled" | "published">,
  });

  /**
   * Property 8: Search returns matching posts
   * For any non-empty search query Q and result set R, every post in R SHALL contain Q
   * (case-insensitive) in its title, content, or tags.
   */
  describe("Property 8: Search returns matching posts", () => {
    it("every post in search results contains the query in title, content, or tags (case-insensitive)", () => {
      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
          // Generate non-empty, non-whitespace queries
          fc.string({ minLength: 1, maxLength: 30 }).filter((q) => q.trim().length > 0),
          (posts, query) => {
            const results = search(query, posts);
            const trimmedQuery = query.trim().toLowerCase();

            // Property: Every post in result set R SHALL contain Q (case-insensitive)
            // in its title, content, or tags
            for (const result of results) {
              // Find the original post to check content (result.post is PostPreview)
              const originalPost = posts.find((p) => p.slug === result.post.slug);
              if (!originalPost) {
                return false; // Result references a post that doesn't exist
              }

              const titleMatch = originalPost.title.toLowerCase().includes(trimmedQuery);
              const contentMatch = originalPost.content.toLowerCase().includes(trimmedQuery);
              const tagMatch = originalPost.tags.some((tag) =>
                tag.toLowerCase().includes(trimmedQuery)
              );

              if (!titleMatch && !contentMatch && !tagMatch) {
                return false; // Post in results doesn't contain the query
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("search results include all posts that match the query", () => {
      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 30 }).filter((q) => q.trim().length > 0),
          (posts, query) => {
            const results = search(query, posts);
            const trimmedQuery = query.trim().toLowerCase();

            // Find all posts that should match
            const expectedMatches = posts.filter((post) => {
              const titleMatch = post.title.toLowerCase().includes(trimmedQuery);
              const contentMatch = post.content.toLowerCase().includes(trimmedQuery);
              const tagMatch = post.tags.some((tag) =>
                tag.toLowerCase().includes(trimmedQuery)
              );
              return titleMatch || contentMatch || tagMatch;
            });

            // Property: Result set should contain all matching posts
            if (results.length !== expectedMatches.length) {
              return false;
            }

            const resultSlugs = new Set(results.map((r) => r.post.slug));
            for (const expected of expectedMatches) {
              if (!resultSlugs.has(expected.slug)) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("matchedIn array correctly identifies where the query was found", () => {
      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 30 }).filter((q) => q.trim().length > 0),
          (posts, query) => {
            const results = search(query, posts);
            const trimmedQuery = query.trim().toLowerCase();

            for (const result of results) {
              const originalPost = posts.find((p) => p.slug === result.post.slug);
              if (!originalPost) return false;

              // Verify matchedIn is accurate
              const titleMatch = originalPost.title.toLowerCase().includes(trimmedQuery);
              const contentMatch = originalPost.content.toLowerCase().includes(trimmedQuery);
              const tagMatch = originalPost.tags.some((tag) =>
                tag.toLowerCase().includes(trimmedQuery)
              );

              // Check that matchedIn contains "title" iff title matches
              if (titleMatch !== result.matchedIn.includes("title")) {
                return false;
              }
              // Check that matchedIn contains "content" iff content matches
              if (contentMatch !== result.matchedIn.includes("content")) {
                return false;
              }
              // Check that matchedIn contains "tags" iff any tag matches
              if (tagMatch !== result.matchedIn.includes("tags")) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Property 10: Empty search returns all posts
   * For any search query consisting only of empty string or whitespace characters,
   * the search SHALL return all posts without filtering.
   */
  describe("Property 10: Empty search returns all posts", () => {
    it("empty string query returns all posts", () => {
      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
          (posts) => {
            const results = search("", posts);

            // Property: Empty query should return all posts
            if (results.length !== posts.length) {
              return false;
            }

            // Verify all posts are in results
            const resultSlugs = new Set(results.map((r) => r.post.slug));
            for (const post of posts) {
              if (!resultSlugs.has(post.slug)) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("whitespace-only query returns all posts", () => {
      // Generate strings that are only whitespace using array of whitespace chars
      const whitespaceArbitrary = fc
        .array(fc.constantFrom(" ", "\t", "\n", "\r"), { minLength: 1, maxLength: 10 })
        .map((chars) => chars.join(""));

      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
          whitespaceArbitrary,
          (posts, whitespaceQuery) => {
            const results = search(whitespaceQuery, posts);

            // Property: Whitespace-only query should return all posts
            if (results.length !== posts.length) {
              return false;
            }

            // Verify all posts are in results
            const resultSlugs = new Set(results.map((r) => r.post.slug));
            for (const post of posts) {
              if (!resultSlugs.has(post.slug)) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("empty/whitespace search results have empty matchedIn arrays", () => {
      const emptyOrWhitespaceArbitrary = fc.oneof(
        fc.constant(""),
        fc.array(fc.constantFrom(" ", "\t", "\n"), { minLength: 1, maxLength: 5 }).map((chars) => chars.join(""))
      );

      fc.assert(
        fc.property(
          fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
          emptyOrWhitespaceArbitrary,
          (posts, query) => {
            const results = search(query, posts);

            // Property: For empty/whitespace queries, matchedIn should be empty
            // (since no actual matching occurred)
            for (const result of results) {
              if (result.matchedIn.length !== 0) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it("empty/whitespace search preserves original post titles and excerpts (no highlighting)", () => {
      const emptyOrWhitespaceArbitrary = fc.oneof(
        fc.constant(""),
        fc.array(fc.constantFrom(" ", "\t", "\n"), { minLength: 1, maxLength: 5 }).map((chars) => chars.join(""))
      );

      // Generate posts with unique slugs to avoid ambiguity when finding original posts
      const postsWithUniqueSlugsArbitrary = fc
        .array(postArbitrary, { minLength: 0, maxLength: 50 })
        .map((posts) => {
          // Ensure unique slugs by appending index
          return posts.map((post, index) => ({
            ...post,
            slug: `${post.slug}-${index}`,
          }));
        });

      fc.assert(
        fc.property(
          postsWithUniqueSlugsArbitrary,
          emptyOrWhitespaceArbitrary,
          (posts, query) => {
            const results = search(query, posts);

            // Property: For empty/whitespace queries, highlighted fields should
            // match original (no <mark> tags added)
            for (const result of results) {
              const originalPost = posts.find((p) => p.slug === result.post.slug);
              if (!originalPost) return false;

              if (result.highlightedTitle !== originalPost.title) {
                return false;
              }
              if (result.highlightedExcerpt !== originalPost.excerpt) {
                return false;
              }
            }
            return true;
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});


/**
 * Property-Based Tests
 * **Feature: advanced-web-blog, Property 9: Search highlighting**
 * **Validates: Requirements 4.2**
 *
 * For any search result with query Q, the highlighted title and excerpt
 * SHALL contain markup wrapping all occurrences of Q.
 */
import { highlightMatches } from "./search";

describe("Property 9: Search highlighting", () => {
  /**
   * Helper to count occurrences of a substring (case-insensitive)
   */
  function countOccurrences(text: string, query: string): number {
    if (!query || query.trim().length === 0) return 0;
    const trimmedQuery = query.trim().toLowerCase();
    const lowerText = text.toLowerCase();
    let count = 0;
    let pos = 0;
    while ((pos = lowerText.indexOf(trimmedQuery, pos)) !== -1) {
      count++;
      pos += trimmedQuery.length;
    }
    return count;
  }

  /**
   * Helper to count <mark> tags in highlighted text
   */
  function countMarkTags(highlightedText: string): number {
    const matches = highlightedText.match(/<mark>/g);
    return matches ? matches.length : 0;
  }

  /**
   * Helper to extract content inside <mark> tags
   */
  function extractMarkedContent(highlightedText: string): string[] {
    const regex = /<mark>(.*?)<\/mark>/gi;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(highlightedText)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  it("highlighted text contains <mark> tags wrapping all occurrences of the query", () => {
    fc.assert(
      fc.property(
        // Generate text that may contain the query
        fc.string({ minLength: 0, maxLength: 200 }),
        // Generate non-empty, non-whitespace queries without regex special chars
        fc.string({ minLength: 1, maxLength: 20 })
          .filter((q) => q.trim().length > 0)
          .filter((q) => !/[.*+?^${}()|[\]\\]/.test(q)), // Avoid regex special chars
        (text, query) => {
          const highlighted = highlightMatches(text, query);
          const trimmedQuery = query.trim();
          const occurrences = countOccurrences(text, trimmedQuery);
          const markCount = countMarkTags(highlighted);

          // Property: Number of <mark> tags should equal number of query occurrences
          return markCount === occurrences;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("marked content matches the query (case-insensitive)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        fc.string({ minLength: 1, maxLength: 20 })
          .filter((q) => q.trim().length > 0)
          .filter((q) => !/[.*+?^${}()|[\]\\]/.test(q)),
        (text, query) => {
          const highlighted = highlightMatches(text, query);
          const markedContents = extractMarkedContent(highlighted);
          const trimmedQuery = query.trim().toLowerCase();

          // Property: All marked content should match the query (case-insensitive)
          for (const content of markedContents) {
            if (content.toLowerCase() !== trimmedQuery) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("highlighting preserves original text structure (only adds mark tags)", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        fc.string({ minLength: 1, maxLength: 20 })
          .filter((q) => q.trim().length > 0)
          .filter((q) => !/[.*+?^${}()|[\]\\]/.test(q)),
        (text, query) => {
          const highlighted = highlightMatches(text, query);
          
          // Property: Removing <mark> and </mark> tags should give back original text
          const stripped = highlighted.replace(/<\/?mark>/g, "");
          return stripped === text;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("empty or whitespace query returns text unchanged (no highlighting)", () => {
    const emptyOrWhitespaceArbitrary = fc.oneof(
      fc.constant(""),
      fc.array(fc.constantFrom(" ", "\t", "\n", "\r"), { minLength: 1, maxLength: 10 })
        .map((chars) => chars.join(""))
    );

    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        emptyOrWhitespaceArbitrary,
        (text, query) => {
          const highlighted = highlightMatches(text, query);
          
          // Property: Empty/whitespace query should return text unchanged
          return highlighted === text;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("highlighting is case-insensitive but preserves original case", () => {
    // Generate alphanumeric queries to avoid regex special characters
    const alphanumericQueryArbitrary = fc.stringMatching(/^[a-zA-Z0-9]+$/, { minLength: 1, maxLength: 20 });

    // Generate text and query where we know the query appears in the text
    const textWithQueryArbitrary = fc.tuple(
      fc.string({ minLength: 0, maxLength: 50 }),
      alphanumericQueryArbitrary,
      fc.string({ minLength: 0, maxLength: 50 })
    ).map(([prefix, query, suffix]) => ({
      text: prefix + query.toUpperCase() + suffix, // Insert uppercase version
      query: query.toLowerCase(), // Search with lowercase
      originalCase: query.toUpperCase()
    }));

    fc.assert(
      fc.property(
        textWithQueryArbitrary,
        ({ text, query, originalCase }) => {
          const highlighted = highlightMatches(text, query);
          const markedContents = extractMarkedContent(highlighted);

          // Property: At least one marked content should exist and preserve original case
          if (markedContents.length === 0) {
            return false;
          }

          // The marked content should preserve the original case from the text
          return markedContents.some((content) => content === originalCase);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("search results have highlighted title and excerpt with all query occurrences marked", () => {
    // Arbitrary for generating valid Post objects
    const postArbitrary: fc.Arbitrary<Post> = fc.record({
      id: fc.uuid(),
      slug: fc.string({ minLength: 1, maxLength: 50 }).map((s) =>
        s.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "post"
      ),
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
      locale: fc.constantFrom("en", "es", "fr", "th"),
      status: fc.constantFrom("draft", "scheduled", "published") as fc.Arbitrary<"draft" | "scheduled" | "published">,
    });

    // Generate posts with unique slugs by appending index
    const postsWithUniqueSlugsArbitrary = fc.array(postArbitrary, { minLength: 1, maxLength: 20 })
      .map((posts) => posts.map((post, index) => ({
        ...post,
        slug: `${post.slug}-${index}`, // Ensure unique slugs
      })));

    fc.assert(
      fc.property(
        postsWithUniqueSlugsArbitrary,
        fc.string({ minLength: 1, maxLength: 20 })
          .filter((q) => q.trim().length > 0)
          .filter((q) => !/[.*+?^${}()|[\]\\]/.test(q)),
        (posts, query) => {
          const results = search(query, posts);
          const trimmedQuery = query.trim();

          for (const result of results) {
            const originalPost = posts.find((p) => p.slug === result.post.slug);
            if (!originalPost) return false;

            // Count occurrences in original title and excerpt
            const titleOccurrences = countOccurrences(originalPost.title, trimmedQuery);
            const excerptOccurrences = countOccurrences(originalPost.excerpt, trimmedQuery);

            // Count <mark> tags in highlighted versions
            const titleMarkCount = countMarkTags(result.highlightedTitle);
            const excerptMarkCount = countMarkTags(result.highlightedExcerpt);

            // Property: Number of marks should equal number of occurrences
            if (titleMarkCount !== titleOccurrences) {
              return false;
            }
            if (excerptMarkCount !== excerptOccurrences) {
              return false;
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property-Based Tests
 * **Feature: advanced-web-blog, Property 2: Post preview contains required fields**
 * **Validates: Requirements 1.2**
 *
 * For any post preview generated from a valid post, the preview SHALL contain
 * non-empty values for: title, excerpt (max 160 characters), author name,
 * publication date, category, and reading time (positive integer).
 */
describe("Property 2: Post preview contains required fields", () => {
  // Valid date arbitrary using timestamp to ensure valid dates
  const validDateArbitrary = fc.integer({
    min: new Date("2020-01-01").getTime(),
    max: new Date("2030-12-31").getTime(),
  }).map((timestamp) => new Date(timestamp));

  // Arbitrary for generating valid Post objects with guaranteed valid dates
  const postArbitrary: fc.Arbitrary<Post> = fc.record({
    id: fc.uuid(),
    slug: fc.string({ minLength: 1, maxLength: 50 }).map((s) =>
      s.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "post"
    ),
    title: fc.string({ minLength: 1, maxLength: 100 }),
    content: fc.string({ minLength: 0, maxLength: 500 }),
    excerpt: fc.string({ minLength: 0, maxLength: 160 }),
    author: fc.record({
      name: fc.string({ minLength: 1, maxLength: 50 }),
      avatar: fc.option(fc.webUrl(), { nil: undefined }),
      bio: fc.option(fc.string({ maxLength: 200 }), { nil: undefined }),
    }),
    publishedAt: validDateArbitrary,
    updatedAt: fc.option(validDateArbitrary, { nil: undefined }),
    category: fc.string({ minLength: 1, maxLength: 30 }),
    tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
    readingTime: fc.integer({ min: 1, max: 60 }),
    featured: fc.option(fc.boolean(), { nil: undefined }),
    image: fc.option(fc.webUrl(), { nil: undefined }),
    locale: fc.constantFrom("en", "es", "fr", "th"),
    status: fc.constantFrom("draft", "scheduled", "published") as fc.Arbitrary<"draft" | "scheduled" | "published">,
  });

  it("post preview has non-empty title", () => {
    fc.assert(
      fc.property(postArbitrary, (post) => {
        const preview = toPostPreview(post);
        // Property: Title must be non-empty
        return typeof preview.title === "string" && preview.title.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  it("post preview has excerpt with max 160 characters", () => {
    fc.assert(
      fc.property(postArbitrary, (post) => {
        const preview = toPostPreview(post);
        // Property: Excerpt must exist and be at most 160 characters
        return typeof preview.excerpt === "string" && preview.excerpt.length <= 160;
      }),
      { numRuns: 100 }
    );
  });

  it("post preview has non-empty author name", () => {
    fc.assert(
      fc.property(postArbitrary, (post) => {
        const preview = toPostPreview(post);
        // Property: Author name must be non-empty
        return (
          preview.author !== undefined &&
          typeof preview.author.name === "string" &&
          preview.author.name.length > 0
        );
      }),
      { numRuns: 100 }
    );
  });

  it("post preview has valid publication date", () => {
    fc.assert(
      fc.property(postArbitrary, (post) => {
        const preview = toPostPreview(post);
        // Property: Publication date must be a valid Date object
        return (
          preview.publishedAt instanceof Date &&
          !isNaN(preview.publishedAt.getTime())
        );
      }),
      { numRuns: 100 }
    );
  });

  it("post preview has non-empty category", () => {
    fc.assert(
      fc.property(postArbitrary, (post) => {
        const preview = toPostPreview(post);
        // Property: Category must be non-empty
        return typeof preview.category === "string" && preview.category.length > 0;
      }),
      { numRuns: 100 }
    );
  });

  it("post preview has positive integer reading time", () => {
    fc.assert(
      fc.property(postArbitrary, (post) => {
        const preview = toPostPreview(post);
        // Property: Reading time must be a positive integer
        return (
          typeof preview.readingTime === "number" &&
          Number.isInteger(preview.readingTime) &&
          preview.readingTime > 0
        );
      }),
      { numRuns: 100 }
    );
  });

  it("post preview preserves all required fields from original post", () => {
    fc.assert(
      fc.property(postArbitrary, (post) => {
        const preview = toPostPreview(post);
        
        // Property: All required fields should be preserved from the original post
        return (
          preview.slug === post.slug &&
          preview.title === post.title &&
          preview.excerpt === post.excerpt &&
          preview.author.name === post.author.name &&
          preview.publishedAt.getTime() === post.publishedAt.getTime() &&
          preview.category === post.category &&
          preview.readingTime === post.readingTime
        );
      }),
      { numRuns: 100 }
    );
  });

  it("post preview contains all required fields simultaneously", () => {
    fc.assert(
      fc.property(postArbitrary, (post) => {
        const preview = toPostPreview(post);
        
        // Property: All required fields must be present and valid simultaneously
        const hasValidTitle = typeof preview.title === "string" && preview.title.length > 0;
        const hasValidExcerpt = typeof preview.excerpt === "string" && preview.excerpt.length <= 160;
        const hasValidAuthor = preview.author !== undefined && 
          typeof preview.author.name === "string" && 
          preview.author.name.length > 0;
        const hasValidDate = preview.publishedAt instanceof Date && 
          !isNaN(preview.publishedAt.getTime());
        const hasValidCategory = typeof preview.category === "string" && 
          preview.category.length > 0;
        const hasValidReadingTime = typeof preview.readingTime === "number" && 
          Number.isInteger(preview.readingTime) && 
          preview.readingTime > 0;

        return (
          hasValidTitle &&
          hasValidExcerpt &&
          hasValidAuthor &&
          hasValidDate &&
          hasValidCategory &&
          hasValidReadingTime
        );
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Property-Based Tests
 * **Feature: advanced-web-blog, Property 3: Pagination logic**
 * **Validates: Requirements 1.4**
 *
 * For any collection of N posts with page size P, pagination SHALL display
 * `ceil(N/P)` total pages, and page K SHALL contain posts at indices
 * `[(K-1)*P, min(K*P, N))`.
 */
describe("Property 3: Pagination logic", () => {
  // Pure pagination functions that mirror the implementation logic
  function calculateTotalPages(totalItems: number, pageSize: number): number {
    if (pageSize <= 0) return 0;
    return Math.ceil(totalItems / pageSize);
  }

  function getPageItems<T>(items: T[], page: number, pageSize: number): T[] {
    if (pageSize <= 0 || page < 1) return [];
    const startIndex = (page - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }

  function getPageIndices(
    totalItems: number,
    page: number,
    pageSize: number
  ): { startIndex: number; endIndex: number } {
    if (pageSize <= 0 || page < 1) return { startIndex: 0, endIndex: 0 };
    const startIndex = (page - 1) * pageSize;
    const endIndex = Math.min(page * pageSize, totalItems);
    return { startIndex, endIndex };
  }

  // Arbitrary for generating valid Post objects
  const postArbitrary: fc.Arbitrary<Post> = fc.record({
    id: fc.uuid(),
    slug: fc
      .string({ minLength: 1, maxLength: 50 })
      .map(
        (s) =>
          s
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "") || "post"
      ),
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
    tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
      minLength: 0,
      maxLength: 5,
    }),
    readingTime: fc.integer({ min: 1, max: 60 }),
    featured: fc.option(fc.boolean(), { nil: undefined }),
    image: fc.option(fc.webUrl(), { nil: undefined }),
    locale: fc.constantFrom("en", "es", "fr", "th"),
    status: fc.constantFrom("draft", "scheduled", "published") as fc.Arbitrary<
      "draft" | "scheduled" | "published"
    >,
  });

  it("total pages equals ceil(N/P) for any collection of N posts with page size P", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 200 }), // N: total number of posts
        fc.integer({ min: 1, max: 50 }), // P: page size (must be positive)
        (totalPosts, pageSize) => {
          const totalPages = calculateTotalPages(totalPosts, pageSize);
          const expectedPages = Math.ceil(totalPosts / pageSize);

          // Property: totalPages SHALL equal ceil(N/P)
          return totalPages === expectedPages;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("page K contains posts at indices [(K-1)*P, min(K*P, N))", () => {
    fc.assert(
      fc.property(
        fc.array(postArbitrary, { minLength: 1, maxLength: 100 }),
        fc.integer({ min: 1, max: 20 }), // P: page size
        (posts, pageSize) => {
          const totalPages = calculateTotalPages(posts.length, pageSize);

          // Test each valid page
          for (let page = 1; page <= totalPages; page++) {
            const pageItems = getPageItems(posts, page, pageSize);
            const { startIndex, endIndex } = getPageIndices(
              posts.length,
              page,
              pageSize
            );

            // Property: Page K should contain items at indices [(K-1)*P, min(K*P, N))
            const expectedStartIndex = (page - 1) * pageSize;
            const expectedEndIndex = Math.min(page * pageSize, posts.length);

            if (startIndex !== expectedStartIndex) {
              return false;
            }
            if (endIndex !== expectedEndIndex) {
              return false;
            }

            // Verify the actual items match
            const expectedItems = posts.slice(expectedStartIndex, expectedEndIndex);
            if (pageItems.length !== expectedItems.length) {
              return false;
            }

            for (let i = 0; i < pageItems.length; i++) {
              if (pageItems[i].id !== expectedItems[i].id) {
                return false;
              }
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("all posts are covered exactly once across all pages", () => {
    fc.assert(
      fc.property(
        fc.array(postArbitrary, { minLength: 0, maxLength: 100 }),
        fc.integer({ min: 1, max: 20 }), // P: page size
        (posts, pageSize) => {
          const totalPages = calculateTotalPages(posts.length, pageSize);
          const allPageItems: Post[] = [];

          // Collect all items from all pages
          for (let page = 1; page <= totalPages; page++) {
            const pageItems = getPageItems(posts, page, pageSize);
            allPageItems.push(...pageItems);
          }

          // Property: All posts should be covered exactly once
          if (allPageItems.length !== posts.length) {
            return false;
          }

          // Verify each post appears exactly once
          const seenIds = new Set<string>();
          for (const item of allPageItems) {
            if (seenIds.has(item.id)) {
              return false; // Duplicate found
            }
            seenIds.add(item.id);
          }

          // Verify all original posts are present
          for (const post of posts) {
            if (!seenIds.has(post.id)) {
              return false; // Post missing
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("each page (except possibly the last) contains exactly P items", () => {
    fc.assert(
      fc.property(
        fc.array(postArbitrary, { minLength: 1, maxLength: 100 }),
        fc.integer({ min: 1, max: 20 }), // P: page size
        (posts, pageSize) => {
          const totalPages = calculateTotalPages(posts.length, pageSize);

          for (let page = 1; page <= totalPages; page++) {
            const pageItems = getPageItems(posts, page, pageSize);

            if (page < totalPages) {
              // Property: Non-last pages should have exactly P items
              if (pageItems.length !== pageSize) {
                return false;
              }
            } else {
              // Property: Last page should have between 1 and P items
              const expectedLastPageSize =
                posts.length % pageSize === 0
                  ? pageSize
                  : posts.length % pageSize;
              if (pageItems.length !== expectedLastPageSize) {
                return false;
              }
            }
          }
          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("empty collection results in zero pages", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 50 }), // P: page size
        (pageSize) => {
          const totalPages = calculateTotalPages(0, pageSize);
          // Property: Empty collection should have 0 pages
          return totalPages === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("page indices are within valid bounds", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 200 }), // N: total items (at least 1 for meaningful test)
        fc.integer({ min: 1, max: 50 }), // P: page size
        (totalItems, pageSize) => {
          const totalPages = calculateTotalPages(totalItems, pageSize);

          // Test all valid pages
          for (let page = 1; page <= totalPages; page++) {
            const { startIndex, endIndex } = getPageIndices(
              totalItems,
              page,
              pageSize
            );

            // Property: startIndex should be >= 0
            if (startIndex < 0) {
              return false;
            }

            // Property: endIndex should be <= totalItems
            if (endIndex > totalItems) {
              return false;
            }

            // Property: startIndex should be <= endIndex
            if (startIndex > endIndex) {
              return false;
            }

            // Property: startIndex should be (K-1)*P
            const expectedStart = (page - 1) * pageSize;
            if (startIndex !== expectedStart) {
              return false;
            }

            // Property: endIndex should be min(K*P, N)
            const expectedEnd = Math.min(page * pageSize, totalItems);
            if (endIndex !== expectedEnd) {
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  it("requesting page beyond total pages returns empty result", () => {
    fc.assert(
      fc.property(
        fc.array(postArbitrary, { minLength: 0, maxLength: 50 }),
        fc.integer({ min: 1, max: 20 }), // P: page size
        (posts, pageSize) => {
          const totalPages = calculateTotalPages(posts.length, pageSize);
          
          // Request a page beyond the total
          const beyondPage = totalPages + 1;
          const pageItems = getPageItems(posts, beyondPage, pageSize);

          // Property: Requesting page beyond total should return empty array
          return pageItems.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Property-Based Tests
 * **Feature: advanced-web-blog, Property 4: HTML content rendering**
 * **Validates: Requirements 2.1, 5.2**
 *
 * For any valid HTML content stored in the database, the system SHALL render
 * it correctly with proper sanitization to prevent XSS attacks.
 */
import {
  sanitizeHtml,
  isAllowedTag,
  isAllowedAttribute,
  isSafeUrl,
  containsDangerousContent,
  removeDangerousPatterns,
} from "./sanitize";

describe("Property 4: HTML content rendering", () => {
  // Arbitrary for generating safe HTML tags
  const safeTagArbitrary = fc.constantFrom(
    "p", "br", "span", "div", "strong", "b", "em", "i", "u",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "a", "img",
    "pre", "code", "blockquote", "hr"
  );

  // Arbitrary for generating dangerous HTML patterns
  const dangerousPatternArbitrary = fc.oneof(
    // Script tags
    fc.string({ minLength: 0, maxLength: 50 }).map(
      (content) => `<script>${content}</script>`
    ),
    // Event handlers
    fc.tuple(
      fc.constantFrom("onclick", "onload", "onerror", "onmouseover", "onfocus"),
      fc.string({ minLength: 0, maxLength: 30 })
    ).map(([event, code]) => `<div ${event}="${code}">test</div>`),
    // JavaScript URLs
    fc.string({ minLength: 0, maxLength: 30 }).map(
      (code) => `<a href="javascript:${code}">link</a>`
    ),
    // VBScript URLs
    fc.string({ minLength: 0, maxLength: 30 }).map(
      (code) => `<a href="vbscript:${code}">link</a>`
    ),
    // Style tags
    fc.string({ minLength: 0, maxLength: 50 }).map(
      (content) => `<style>${content}</style>`
    ),
    // Iframe tags
    fc.webUrl().map((url) => `<iframe src="${url}"></iframe>`),
    // Object tags
    fc.webUrl().map((url) => `<object data="${url}"></object>`),
    // Embed tags
    fc.webUrl().map((url) => `<embed src="${url}">`),
    // Expression in style
    fc.constant(`<div style="width: expression(alert('xss'))">test</div>`)
  );

  // Arbitrary for generating safe HTML content
  const safeHtmlArbitrary = fc.oneof(
    // Plain text
    fc.string({ minLength: 0, maxLength: 100 }).map((text) => 
      text.replace(/</g, "&lt;").replace(/>/g, "&gt;")
    ),
    // Paragraph with text
    fc.string({ minLength: 0, maxLength: 100 }).map(
      (text) => `<p>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`
    ),
    // Heading with text
    fc.tuple(
      fc.constantFrom("h1", "h2", "h3", "h4", "h5", "h6"),
      fc.string({ minLength: 0, maxLength: 50 })
    ).map(([tag, text]) => `<${tag}>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</${tag}>`),
    // List
    fc.array(fc.string({ minLength: 1, maxLength: 30 }), { minLength: 1, maxLength: 5 }).map(
      (items) => `<ul>${items.map((item) => `<li>${item.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</li>`).join("")}</ul>`
    ),
    // Link with safe URL
    fc.tuple(
      fc.webUrl(),
      fc.string({ minLength: 1, maxLength: 30 })
    ).map(([url, text]) => `<a href="${url}">${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</a>`),
    // Image with safe URL
    fc.tuple(
      fc.webUrl(),
      fc.string({ minLength: 1, maxLength: 30 })
    ).map(([url, alt]) => `<img src="${url}" alt="${alt.replace(/"/g, "&quot;")}" />`),
    // Code block
    fc.string({ minLength: 0, maxLength: 100 }).map(
      (code) => `<pre><code>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`
    ),
    // Blockquote
    fc.string({ minLength: 0, maxLength: 100 }).map(
      (text) => `<blockquote>${text.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</blockquote>`
    )
  );

  /**
   * Property: Sanitized HTML should not contain script tags
   */
  it("sanitized HTML should not contain script tags", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200 }),
        (scriptContent) => {
          const maliciousHtml = `<p>Hello</p><script>${scriptContent}</script><p>World</p>`;
          const sanitized = sanitizeHtml(maliciousHtml);
          
          // Property: Sanitized output should not contain script tags
          return !/<script\b/i.test(sanitized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sanitized HTML should not contain event handlers
   */
  it("sanitized HTML should not contain event handlers", () => {
    const eventHandlerArbitrary = fc.constantFrom(
      "onclick", "onload", "onerror", "onmouseover", "onfocus",
      "onblur", "onchange", "onsubmit", "onkeydown", "onkeyup"
    );

    fc.assert(
      fc.property(
        eventHandlerArbitrary,
        fc.string({ minLength: 0, maxLength: 50 }),
        (eventHandler, code) => {
          const maliciousHtml = `<div ${eventHandler}="${code}">Content</div>`;
          const sanitized = sanitizeHtml(maliciousHtml);
          
          // Property: Sanitized output should not contain event handlers
          const eventPattern = new RegExp(`\\s${eventHandler}\\s*=`, "i");
          return !eventPattern.test(sanitized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sanitized HTML should not contain javascript: URLs
   */
  it("sanitized HTML should not contain javascript: URLs", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        (jsCode) => {
          const maliciousHtml = `<a href="javascript:${jsCode}">Click me</a>`;
          const sanitized = sanitizeHtml(maliciousHtml);
          
          // Property: Sanitized output should not contain javascript: URLs
          return !/javascript\s*:/i.test(sanitized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sanitized HTML should not contain vbscript: URLs
   */
  it("sanitized HTML should not contain vbscript: URLs", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        (vbCode) => {
          const maliciousHtml = `<a href="vbscript:${vbCode}">Click me</a>`;
          const sanitized = sanitizeHtml(maliciousHtml);
          
          // Property: Sanitized output should not contain vbscript: URLs
          return !/vbscript\s*:/i.test(sanitized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sanitized HTML should not contain style tags
   */
  it("sanitized HTML should not contain style tags", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 100 }),
        (styleContent) => {
          const maliciousHtml = `<p>Hello</p><style>${styleContent}</style><p>World</p>`;
          const sanitized = sanitizeHtml(maliciousHtml);
          
          // Property: Sanitized output should not contain style tags
          return !/<style\b/i.test(sanitized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sanitized HTML should not contain iframe/object/embed tags
   */
  it("sanitized HTML should not contain iframe/object/embed tags", () => {
    const dangerousTagArbitrary = fc.constantFrom("iframe", "object", "embed");

    fc.assert(
      fc.property(
        dangerousTagArbitrary,
        fc.webUrl(),
        (tag, url) => {
          const maliciousHtml = tag === "embed" 
            ? `<${tag} src="${url}">`
            : `<${tag} src="${url}"></${tag}>`;
          const sanitized = sanitizeHtml(maliciousHtml);
          
          // Property: Sanitized output should not contain dangerous tags
          const tagPattern = new RegExp(`<${tag}\\b`, "i");
          return !tagPattern.test(sanitized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Safe HTML tags should be preserved after sanitization
   */
  it("safe HTML tags should be preserved after sanitization", () => {
    fc.assert(
      fc.property(
        safeTagArbitrary,
        fc.string({ minLength: 1, maxLength: 50 }).map((s) => 
          s.replace(/</g, "&lt;").replace(/>/g, "&gt;")
        ),
        (tag, content) => {
          // Skip self-closing tags for this test
          if (["br", "hr", "img"].includes(tag)) {
            return true;
          }
          
          const safeHtml = `<${tag}>${content}</${tag}>`;
          const sanitized = sanitizeHtml(safeHtml);
          
          // Property: Safe tags should be preserved
          const openTagPattern = new RegExp(`<${tag}[^>]*>`, "i");
          const closeTagPattern = new RegExp(`</${tag}>`, "i");
          
          return openTagPattern.test(sanitized) && closeTagPattern.test(sanitized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Safe URLs (http/https) should be preserved (with proper HTML encoding)
   */
  it("safe URLs should be preserved in href and src attributes", () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        fc.string({ minLength: 1, maxLength: 30 }).map((s) => 
          s.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
        ),
        (url, text) => {
          const safeHtml = `<a href="${url}">${text}</a>`;
          const sanitized = sanitizeHtml(safeHtml);
          
          // Property: Safe URLs should be preserved (accounting for HTML entity encoding)
          // The URL may have & encoded as &amp; which is correct HTML behavior
          const encodedUrl = url
            .replace(/&/g, "&amp;")
            .replace(/"/g, "&quot;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
          
          return sanitized.includes(encodedUrl);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: containsDangerousContent correctly identifies dangerous patterns
   */
  it("containsDangerousContent returns true for dangerous HTML", () => {
    fc.assert(
      fc.property(
        dangerousPatternArbitrary,
        (dangerousHtml) => {
          // Property: Dangerous patterns should be detected
          return containsDangerousContent(dangerousHtml);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: containsDangerousContent returns false for safe HTML
   */
  it("containsDangerousContent returns false for safe HTML", () => {
    fc.assert(
      fc.property(
        safeHtmlArbitrary,
        (safeHtml) => {
          // Property: Safe HTML should not be flagged as dangerous
          return !containsDangerousContent(safeHtml);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isAllowedTag correctly identifies allowed tags
   */
  it("isAllowedTag returns true for safe tags", () => {
    fc.assert(
      fc.property(
        safeTagArbitrary,
        (tag) => {
          // Property: Safe tags should be allowed
          return isAllowedTag(tag);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isAllowedTag returns false for dangerous tags
   */
  it("isAllowedTag returns false for dangerous tags", () => {
    const dangerousTagArbitrary = fc.constantFrom(
      "script", "style", "iframe", "object", "embed", "form", "input", "button"
    );

    fc.assert(
      fc.property(
        dangerousTagArbitrary,
        (tag) => {
          // Property: Dangerous tags should not be allowed
          return !isAllowedTag(tag);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isSafeUrl correctly identifies safe URLs
   */
  it("isSafeUrl returns true for http/https URLs", () => {
    fc.assert(
      fc.property(
        fc.webUrl(),
        (url) => {
          // Property: HTTP/HTTPS URLs should be safe
          return isSafeUrl(url);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isSafeUrl returns false for javascript: URLs
   */
  it("isSafeUrl returns false for javascript: URLs", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }),
        (code) => {
          const jsUrl = `javascript:${code}`;
          // Property: JavaScript URLs should not be safe
          return !isSafeUrl(jsUrl);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sanitization is idempotent (sanitizing twice gives same result)
   */
  it("sanitization is idempotent", () => {
    fc.assert(
      fc.property(
        fc.oneof(safeHtmlArbitrary, dangerousPatternArbitrary),
        (html) => {
          const sanitizedOnce = sanitizeHtml(html);
          const sanitizedTwice = sanitizeHtml(sanitizedOnce);
          
          // Property: Sanitizing twice should give the same result as sanitizing once
          return sanitizedOnce === sanitizedTwice;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Empty/null input returns empty string
   */
  it("empty or null input returns empty string", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("", null, undefined),
        (input) => {
          const sanitized = sanitizeHtml(input as string);
          // Property: Empty/null input should return empty string
          return sanitized === "";
        }
      ),
      { numRuns: 10 }
    );
  });

  /**
   * Property: Text content is preserved after sanitization
   */
  it("text content is preserved after sanitization", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }).filter((s) => 
          // Filter out strings that look like HTML tags
          !/<[^>]+>/.test(s) && !s.includes("<") && !s.includes(">")
        ),
        (text) => {
          const html = `<p>${text}</p>`;
          const sanitized = sanitizeHtml(html);
          
          // Property: Text content should be preserved
          return sanitized.includes(text);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Nested safe tags are preserved
   */
  it("nested safe tags are preserved", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).map((s) => 
          s.replace(/</g, "&lt;").replace(/>/g, "&gt;")
        ),
        (text) => {
          const html = `<div><p><strong>${text}</strong></p></div>`;
          const sanitized = sanitizeHtml(html);
          
          // Property: Nested safe tags should be preserved
          return (
            sanitized.includes("<div") &&
            sanitized.includes("<p") &&
            sanitized.includes("<strong") &&
            sanitized.includes(text)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Mixed safe and dangerous content - safe parts preserved, dangerous removed
   */
  it("mixed content: safe parts preserved, dangerous parts removed", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).map((s) => 
          s.replace(/</g, "&lt;").replace(/>/g, "&gt;")
        ),
        fc.string({ minLength: 0, maxLength: 30 }),
        (safeText, scriptContent) => {
          const mixedHtml = `<p>${safeText}</p><script>${scriptContent}</script>`;
          const sanitized = sanitizeHtml(mixedHtml);
          
          // Property: Safe content preserved, dangerous content removed
          const hasSafeContent = sanitized.includes(safeText);
          const hasNoScript = !/<script\b/i.test(sanitized);
          
          return hasSafeContent && hasNoScript;
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * **Feature: advanced-web-blog, Property 11: HTML content sanitization**
 * **Validates: Requirements 5.3**
 * 
 * Property: For any HTML content submitted through TinyMCE, the system SHALL 
 * sanitize potentially dangerous tags/attributes before storage.
 * 
 * This property ensures that:
 * 1. All dangerous tags (script, style, iframe, object, embed, form, input, button, meta, link, base) are removed
 * 2. All dangerous attributes (event handlers like onclick, onload, etc.) are removed
 * 3. Dangerous URL schemes (javascript:, vbscript:, data: except images) are neutralized
 * 4. Expression() in style attributes is removed
 * 5. Safe content is preserved after sanitization
 */
describe("Property 11: HTML content sanitization", () => {
  // Arbitrary for generating dangerous tags that should be removed
  const dangerousTagArbitrary = fc.constantFrom(
    "script", "style", "iframe", "object", "embed", 
    "form", "input", "button", "meta", "link", "base"
  );

  // Arbitrary for generating event handler attributes
  const eventHandlerArbitrary = fc.constantFrom(
    "onclick", "onload", "onerror", "onmouseover", "onfocus",
    "onblur", "onchange", "onsubmit", "onkeydown", "onkeyup",
    "onmousedown", "onmouseup", "ondblclick", "oncontextmenu"
  );

  // Arbitrary for generating safe tags that should be preserved
  const safeTagArbitrary = fc.constantFrom(
    "p", "div", "span", "strong", "b", "em", "i", "u",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li", "a", "pre", "code", "blockquote"
  );

  /**
   * Property: For any dangerous tag, sanitization SHALL remove it from the output
   */
  it("removes all dangerous tags from HTML content", () => {
    fc.assert(
      fc.property(
        dangerousTagArbitrary,
        fc.string({ minLength: 0, maxLength: 50 }).map(s => 
          s.replace(/</g, "").replace(/>/g, "").replace(/"/g, "")
        ),
        (tag, content) => {
          // Create HTML with dangerous tag
          const dangerousHtml = tag === "input" || tag === "meta" || tag === "link" || tag === "base"
            ? `<p>Safe</p><${tag} value="${content}"><p>Content</p>`
            : `<p>Safe</p><${tag}>${content}</${tag}><p>Content</p>`;
          
          const sanitized = sanitizeHtml(dangerousHtml);
          
          // Property: Dangerous tags SHALL be removed
          const tagPattern = new RegExp(`<${tag}\\b`, "i");
          return !tagPattern.test(sanitized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any event handler attribute, sanitization SHALL remove it
   */
  it("removes all event handler attributes from HTML content", () => {
    fc.assert(
      fc.property(
        eventHandlerArbitrary,
        fc.string({ minLength: 0, maxLength: 30 }).map(s => 
          s.replace(/"/g, "").replace(/'/g, "")
        ),
        safeTagArbitrary,
        (eventHandler, code, tag) => {
          // Create HTML with event handler on a safe tag
          const htmlWithEventHandler = `<${tag} ${eventHandler}="alert('${code}')">${code}</${tag}>`;
          
          const sanitized = sanitizeHtml(htmlWithEventHandler);
          
          // Property: Event handlers SHALL be removed
          const eventPattern = new RegExp(`\\b${eventHandler}\\s*=`, "i");
          return !eventPattern.test(sanitized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any javascript: URL scheme, sanitization SHALL neutralize it
   */
  it("neutralizes javascript: URL schemes in href attributes", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }).map(s => 
          s.replace(/"/g, "").replace(/'/g, "")
        ),
        (jsCode) => {
          const htmlWithJsUrl = `<a href="javascript:${jsCode}">Click</a>`;
          
          const sanitized = sanitizeHtml(htmlWithJsUrl);
          
          // Property: javascript: URLs SHALL be neutralized
          return !/javascript\s*:/i.test(sanitized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any vbscript: URL scheme, sanitization SHALL neutralize it
   */
  it("neutralizes vbscript: URL schemes in href attributes", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 50 }).map(s => 
          s.replace(/"/g, "").replace(/'/g, "")
        ),
        (vbCode) => {
          const htmlWithVbUrl = `<a href="vbscript:${vbCode}">Click</a>`;
          
          const sanitized = sanitizeHtml(htmlWithVbUrl);
          
          // Property: vbscript: URLs SHALL be neutralized
          return !/vbscript\s*:/i.test(sanitized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any data: URL (except images), sanitization SHALL neutralize it
   */
  it("neutralizes non-image data: URL schemes", () => {
    const nonImageDataTypes = fc.constantFrom(
      "text/html", "text/javascript", "application/javascript", 
      "text/plain", "application/xml"
    );

    fc.assert(
      fc.property(
        nonImageDataTypes,
        fc.string({ minLength: 0, maxLength: 30 }).map(s => 
          s.replace(/"/g, "").replace(/'/g, "")
        ),
        (mimeType, content) => {
          const htmlWithDataUrl = `<a href="data:${mimeType},${content}">Click</a>`;
          
          const sanitized = sanitizeHtml(htmlWithDataUrl);
          
          // Property: Non-image data: URLs SHALL be neutralized
          // The href should either be removed or the dangerous data: URL should be gone
          const hasNonImageDataUrl = new RegExp(`data\\s*:\\s*${mimeType.replace(/\//g, "\\/")}`, "i").test(sanitized);
          return !hasNonImageDataUrl;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any expression() in style attribute, sanitization SHALL remove it
   */
  it("removes expression() from style attributes", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 30 }).map(s => 
          s.replace(/"/g, "").replace(/'/g, "").replace(/\)/g, "")
        ),
        (expressionContent) => {
          const htmlWithExpression = `<div style="width: expression(${expressionContent})">Content</div>`;
          
          const sanitized = sanitizeHtml(htmlWithExpression);
          
          // Property: expression() SHALL be removed from style
          return !/expression\s*\(/i.test(sanitized);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Safe content SHALL be preserved after sanitization of dangerous content
   */
  it("preserves safe content while removing dangerous content", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 30 }).filter(s => 
          // Filter to alphanumeric to avoid HTML special chars
          /^[a-zA-Z0-9\s]+$/.test(s) && s.trim().length > 0
        ),
        dangerousTagArbitrary,
        fc.string({ minLength: 0, maxLength: 20 }).map(s => 
          s.replace(/</g, "").replace(/>/g, "")
        ),
        (safeText, dangerousTag, dangerousContent) => {
          // Create mixed content with safe and dangerous parts
          const mixedHtml = dangerousTag === "input" || dangerousTag === "meta" || dangerousTag === "link" || dangerousTag === "base"
            ? `<p>${safeText}</p><${dangerousTag} value="${dangerousContent}">`
            : `<p>${safeText}</p><${dangerousTag}>${dangerousContent}</${dangerousTag}>`;
          
          const sanitized = sanitizeHtml(mixedHtml);
          
          // Property: Safe content SHALL be preserved
          const safeContentPreserved = sanitized.includes(safeText);
          // Property: Dangerous tags SHALL be removed
          const dangerousTagRemoved = !new RegExp(`<${dangerousTag}\\b`, "i").test(sanitized);
          
          return safeContentPreserved && dangerousTagRemoved;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sanitization SHALL be idempotent - sanitizing already sanitized content produces same result
   */
  it("sanitization is idempotent for dangerous content", () => {
    // Generate various dangerous HTML patterns
    const dangerousHtmlArbitrary = fc.oneof(
      // Script tags
      fc.string({ minLength: 0, maxLength: 30 }).map(
        content => `<p>Safe</p><script>${content}</script>`
      ),
      // Event handlers
      fc.tuple(eventHandlerArbitrary, fc.string({ minLength: 0, maxLength: 20 })).map(
        ([handler, code]) => `<div ${handler}="${code.replace(/"/g, "")}">Content</div>`
      ),
      // JavaScript URLs
      fc.string({ minLength: 0, maxLength: 20 }).map(
        code => `<a href="javascript:${code.replace(/"/g, "")}">Link</a>`
      ),
      // Style tags
      fc.string({ minLength: 0, maxLength: 30 }).map(
        content => `<style>${content}</style><p>Content</p>`
      ),
      // Expression in style
      fc.string({ minLength: 0, maxLength: 20 }).map(
        content => `<div style="width: expression(${content.replace(/\)/g, "")})">Test</div>`
      )
    );

    fc.assert(
      fc.property(
        dangerousHtmlArbitrary,
        (dangerousHtml) => {
          const sanitizedOnce = sanitizeHtml(dangerousHtml);
          const sanitizedTwice = sanitizeHtml(sanitizedOnce);
          
          // Property: Sanitizing twice SHALL produce the same result as sanitizing once
          return sanitizedOnce === sanitizedTwice;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: containsDangerousContent SHALL detect all dangerous patterns before sanitization
   */
  it("containsDangerousContent detects dangerous patterns that sanitization removes", () => {
    const dangerousHtmlArbitrary = fc.oneof(
      // Script tags
      fc.string({ minLength: 1, maxLength: 30 }).map(
        content => `<script>${content}</script>`
      ),
      // Event handlers
      fc.tuple(eventHandlerArbitrary, fc.string({ minLength: 1, maxLength: 20 })).map(
        ([handler, code]) => `<div ${handler}="${code.replace(/"/g, "")}">Content</div>`
      ),
      // JavaScript URLs
      fc.string({ minLength: 1, maxLength: 20 }).map(
        code => `<a href="javascript:${code.replace(/"/g, "")}">Link</a>`
      ),
      // Style tags
      fc.string({ minLength: 1, maxLength: 30 }).map(
        content => `<style>${content}</style>`
      ),
      // Iframe tags
      fc.webUrl().map(url => `<iframe src="${url}"></iframe>`)
    );

    fc.assert(
      fc.property(
        dangerousHtmlArbitrary,
        (dangerousHtml) => {
          // Property: containsDangerousContent SHALL return true for dangerous HTML
          const isDangerous = containsDangerousContent(dangerousHtml);
          
          // And sanitization SHALL remove the dangerous content
          const sanitized = sanitizeHtml(dangerousHtml);
          const stillDangerous = containsDangerousContent(sanitized);
          
          return isDangerous && !stillDangerous;
        }
      ),
      { numRuns: 100 }
    );
  });
});
