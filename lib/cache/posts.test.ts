/**
 * Property-Based Tests for Cache Consistency and Data Validity
 *
 * **Feature: advanced-web-blog, Property 28: Cache consistency**
 * **Validates: Requirements 8.1**
 *
 * Property 28: For any post update operation, the Redis cache SHALL be invalidated
 * for that post and related list caches.
 *
 * **Feature: advanced-web-blog, Property 29: Cache hit returns valid data**
 * **Validates: Requirements 8.1**
 *
 * Property 29: For any cached post data, the returned data SHALL match the structure
 * and content of the database record at cache time.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Track mock calls
let deletedKeys: string[] = [];
let invalidatedPatterns: string[] = [];
let cacheStore: Map<string, unknown> = new Map();
let setCalls: Array<{ key: string; value: unknown; ttl?: number }> = [];

// Create mock functions
const mockGet = vi.fn(async <T>(key: string): Promise<T | null> => {
  return (cacheStore.get(key) as T) ?? null;
});

const mockSet = vi.fn(async <T>(key: string, value: T, ttl?: number): Promise<void> => {
  setCalls.push({ key, value, ttl });
  cacheStore.set(key, value);
});

const mockDel = vi.fn(async (key: string): Promise<void> => {
  deletedKeys.push(key);
  cacheStore.delete(key);
});

const mockInvalidatePattern = vi.fn(async (pattern: string): Promise<void> => {
  invalidatedPatterns.push(pattern);
  // Simulate pattern matching deletion
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
  for (const key of cacheStore.keys()) {
    if (regex.test(key)) {
      cacheStore.delete(key);
    }
  }
});

// Mock the redis module
vi.mock('./redis', () => ({
  CACHE_KEYS: {
    POSTS_LIST: 'posts:list',
    POST: 'post',
    CATEGORIES: 'categories',
    TAGS: 'tags',
    PAGE_VIEWS: 'pageviews',
    ANALYTICS: 'analytics',
  },
  CACHE_TTL: {
    POSTS_LIST: 300,
    POST: 600,
    CATEGORIES: 1800,
    TAGS: 1800,
    ANALYTICS: 900,
  },
  cacheService: {
    get: (key: string) => mockGet(key),
    set: (key: string, value: unknown, ttl?: number) => mockSet(key, value, ttl),
    del: (key: string) => mockDel(key),
    invalidatePattern: (pattern: string) => mockInvalidatePattern(pattern),
  },
  default: {
    get: (key: string) => mockGet(key),
    set: (key: string, value: unknown, ttl?: number) => mockSet(key, value, ttl),
    del: (key: string) => mockDel(key),
    invalidatePattern: (pattern: string) => mockInvalidatePattern(pattern),
  },
}));

// Import after mocking
import { postCache } from './posts';
import { CACHE_KEYS } from './redis';

// Helper to reset mock state
function resetMockState() {
  deletedKeys = [];
  invalidatedPatterns = [];
  setCalls = [];
  cacheStore = new Map();
  mockGet.mockClear();
  mockSet.mockClear();
  mockDel.mockClear();
  mockInvalidatePattern.mockClear();
}

// Arbitrary for generating valid slugs
const slugArb = fc
  .stringMatching(/^[a-z][a-z0-9-]{2,30}$/)
  .filter((s) => !s.endsWith('-') && !s.includes('--'));

// Arbitrary for generating valid locales
const localeArb = fc.constantFrom('en', 'es', 'fr', 'th');

// Arbitrary for generating post status
const statusArb = fc.constantFrom('DRAFT', 'SCHEDULED', 'PUBLISHED');

// Valid date arbitrary that ensures no NaN dates
const validDateArb = fc.date({ min: new Date('2020-01-01'), max: new Date('2025-12-31') })
  .filter((d) => !isNaN(d.getTime()));

// Arbitrary for generating a mock post object
const postArb = fc.record({
  id: fc.uuid(),
  slug: slugArb,
  title: fc.string({ minLength: 1, maxLength: 100 }),
  content: fc.string({ minLength: 1, maxLength: 500 }),
  excerpt: fc.string({ minLength: 0, maxLength: 160 }),
  locale: localeArb,
  status: statusArb,
  authorId: fc.uuid(),
  categoryId: fc.option(fc.uuid(), { nil: undefined }),
  featured: fc.boolean(),
  readingTime: fc.integer({ min: 1, max: 60 }),
  createdAt: validDateArb,
  updatedAt: validDateArb,
  publishedAt: fc.option(validDateArb, { nil: null }),
  scheduledAt: fc.option(validDateArb, { nil: null }),
});

describe('Property 28: Cache consistency', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  /**
   * Property: For any post slug and locale, invalidatePost SHALL delete the specific
   * post cache key and invalidate all list caches.
   */
  it('invalidatePost deletes specific post cache and invalidates list caches', async () => {
    await fc.assert(
      fc.asyncProperty(slugArb, localeArb, async (slug: string, locale: string) => {
        resetMockState();

        // Pre-populate cache with the post
        const postKey = `${CACHE_KEYS.POST}:${slug}:${locale}`;
        cacheStore.set(postKey, { slug, locale });

        // Invalidate the post
        await postCache.invalidatePost(slug, locale);

        // Verify specific post key was deleted
        expect(mockDel).toHaveBeenCalledWith(postKey);

        // Verify list caches were invalidated via pattern
        expect(mockInvalidatePattern).toHaveBeenCalledWith(`${CACHE_KEYS.POSTS_LIST}:*`);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any post slug without locale, invalidatePost SHALL invalidate
   * all locale versions of that post and all list caches.
   */
  it('invalidatePost without locale invalidates all locale versions', async () => {
    await fc.assert(
      fc.asyncProperty(slugArb, async (slug: string) => {
        resetMockState();

        // Invalidate the post without specifying locale
        await postCache.invalidatePost(slug);

        // Verify pattern invalidation was called for all locales of this post
        expect(mockInvalidatePattern).toHaveBeenCalledWith(`${CACHE_KEYS.POST}:${slug}:*`);
        expect(mockInvalidatePattern).toHaveBeenCalledWith(`${CACHE_KEYS.POSTS_LIST}:*`);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any call to invalidateAllPosts, ALL post and list caches SHALL be invalidated.
   */
  it('invalidateAllPosts invalidates all post and list caches', async () => {
    resetMockState();

    await postCache.invalidateAllPosts();

    expect(mockInvalidatePattern).toHaveBeenCalledWith(`${CACHE_KEYS.POST}:*`);
    expect(mockInvalidatePattern).toHaveBeenCalledWith(`${CACHE_KEYS.POSTS_LIST}:*`);
  });

  /**
   * Property: For any post cached via setCachedPost, the cache key SHALL follow
   * the pattern post:{slug}:{locale}.
   */
  it('setCachedPost uses correct cache key format', async () => {
    await fc.assert(
      fc.asyncProperty(postArb, async (post) => {
        resetMockState();

        await postCache.setCachedPost(post as Parameters<typeof postCache.setCachedPost>[0]);

        // Verify the correct key was used
        const expectedKey = `${CACHE_KEYS.POST}:${post.slug}:${post.locale}`;
        expect(mockSet).toHaveBeenCalledWith(
          expectedKey,
          expect.objectContaining({
            slug: post.slug,
            locale: post.locale,
          }),
          expect.any(Number)
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any posts list cached via setCachedPosts, the cache key SHALL
   * include the locale and optional status.
   */
  it('setCachedPosts uses correct cache key format with locale', async () => {
    await fc.assert(
      fc.asyncProperty(
        localeArb,
        fc.array(postArb, { minLength: 0, maxLength: 5 }),
        async (locale: string, posts) => {
          resetMockState();

          await postCache.setCachedPosts(
            locale,
            posts as Parameters<typeof postCache.setCachedPosts>[1]
          );

          // Verify the correct key was used
          const expectedKey = `${CACHE_KEYS.POSTS_LIST}:${locale}`;
          expect(mockSet).toHaveBeenCalledWith(
            expectedKey,
            expect.any(Array),
            expect.any(Number)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any posts list cached with status, the cache key SHALL include
   * both locale and status.
   */
  it('setCachedPosts uses correct cache key format with locale and status', async () => {
    await fc.assert(
      fc.asyncProperty(
        localeArb,
        statusArb,
        fc.array(postArb, { minLength: 0, maxLength: 5 }),
        async (locale: string, status: string, posts) => {
          resetMockState();

          await postCache.setCachedPosts(
            locale,
            posts as Parameters<typeof postCache.setCachedPosts>[1],
            status as Parameters<typeof postCache.setCachedPosts>[2]
          );

          // Verify the correct key was used
          const expectedKey = `${CACHE_KEYS.POSTS_LIST}:${locale}:${status}`;
          expect(mockSet).toHaveBeenCalledWith(
            expectedKey,
            expect.any(Array),
            expect.any(Number)
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: After invalidatePost is called, getCachedPost for that post SHALL return null.
   */
  it('getCachedPost returns null after invalidatePost', async () => {
    await fc.assert(
      fc.asyncProperty(slugArb, localeArb, async (slug: string, locale: string) => {
        resetMockState();

        // Pre-populate cache
        const postKey = `${CACHE_KEYS.POST}:${slug}:${locale}`;
        const mockPost = { slug, locale, title: 'Test' };
        cacheStore.set(postKey, mockPost);

        // Verify post is in cache
        const cachedBefore = await postCache.getCachedPost(slug, locale);
        expect(cachedBefore).toEqual(mockPost);

        // Invalidate
        await postCache.invalidatePost(slug, locale);

        // Verify post is no longer in cache
        const cachedAfter = await postCache.getCachedPost(slug, locale);
        expect(cachedAfter).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any category invalidation, the categories cache key SHALL be deleted.
   */
  it('invalidateCategories deletes categories cache', async () => {
    resetMockState();

    await postCache.invalidateCategories();

    expect(mockDel).toHaveBeenCalledWith(CACHE_KEYS.CATEGORIES);
  });

  /**
   * Property: For any tag invalidation, the tags cache key SHALL be deleted.
   */
  it('invalidateTags deletes tags cache', async () => {
    resetMockState();

    await postCache.invalidateTags();

    expect(mockDel).toHaveBeenCalledWith(CACHE_KEYS.TAGS);
  });
});

/**
 * **Feature: advanced-web-blog, Property 29: Cache hit returns valid data**
 * **Validates: Requirements 8.1**
 *
 * Property: For any cached post data, the returned data SHALL match the structure
 * and content of the database record at cache time.
 */
describe('Property 29: Cache hit returns valid data', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  /**
   * Property: For any post cached via setCachedPost, getCachedPost SHALL return
   * data with the same field values (with dates serialized as ISO strings).
   */
  it('getCachedPost returns data matching the original post structure', async () => {
    await fc.assert(
      fc.asyncProperty(postArb, async (post) => {
        resetMockState();

        // Cache the post
        await postCache.setCachedPost(post as Parameters<typeof postCache.setCachedPost>[0]);

        // Retrieve the cached post
        const cached = await postCache.getCachedPost(post.slug, post.locale);

        // Verify the cached data matches the original (with date serialization)
        expect(cached).not.toBeNull();
        expect(cached!.id).toBe(post.id);
        expect(cached!.slug).toBe(post.slug);
        expect(cached!.title).toBe(post.title);
        expect(cached!.content).toBe(post.content);
        expect(cached!.excerpt).toBe(post.excerpt);
        expect(cached!.locale).toBe(post.locale);
        expect(cached!.status).toBe(post.status);
        expect(cached!.authorId).toBe(post.authorId);
        expect(cached!.categoryId).toBe(post.categoryId);
        expect(cached!.featured).toBe(post.featured);
        expect(cached!.readingTime).toBe(post.readingTime);

        // Verify dates are serialized as ISO strings
        expect(cached!.createdAt).toBe(post.createdAt.toISOString());
        expect(cached!.updatedAt).toBe(post.updatedAt.toISOString());
        expect(cached!.publishedAt).toBe(post.publishedAt?.toISOString() ?? null);
        expect(cached!.scheduledAt).toBe(post.scheduledAt?.toISOString() ?? null);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any posts list cached via setCachedPosts, getCachedPosts SHALL return
   * an array with the same length and matching post data.
   */
  it('getCachedPosts returns array matching the original posts list', async () => {
    await fc.assert(
      fc.asyncProperty(
        localeArb,
        fc.array(postArb, { minLength: 0, maxLength: 10 }),
        async (locale: string, posts) => {
          resetMockState();

          // Cache the posts list
          await postCache.setCachedPosts(
            locale,
            posts as Parameters<typeof postCache.setCachedPosts>[1]
          );

          // Retrieve the cached posts
          const cached = await postCache.getCachedPosts(locale);

          // Verify the cached data matches
          expect(cached).not.toBeNull();
          expect(cached!.length).toBe(posts.length);

          // Verify each post in the list
          for (let i = 0; i < posts.length; i++) {
            const original = posts[i];
            const cachedPost = cached![i];

            expect(cachedPost.id).toBe(original.id);
            expect(cachedPost.slug).toBe(original.slug);
            expect(cachedPost.title).toBe(original.title);
            expect(cachedPost.content).toBe(original.content);
            expect(cachedPost.locale).toBe(original.locale);
            expect(cachedPost.status).toBe(original.status);

            // Verify dates are serialized as ISO strings
            expect(cachedPost.createdAt).toBe(original.createdAt.toISOString());
            expect(cachedPost.updatedAt).toBe(original.updatedAt.toISOString());
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any categories cached via setCachedCategories, getCachedCategories
   * SHALL return data with the same structure and values.
   */
  it('getCachedCategories returns data matching the original categories', async () => {
    const categoryArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      slug: slugArb,
      postCount: fc.integer({ min: 0, max: 1000 }),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.array(categoryArb, { minLength: 0, maxLength: 10 }),
        async (categories) => {
          resetMockState();

          // Cache the categories
          await postCache.setCachedCategories(categories);

          // Retrieve the cached categories
          const cached = await postCache.getCachedCategories();

          // Verify the cached data matches
          expect(cached).not.toBeNull();
          expect(cached!.length).toBe(categories.length);

          for (let i = 0; i < categories.length; i++) {
            expect(cached![i].id).toBe(categories[i].id);
            expect(cached![i].name).toBe(categories[i].name);
            expect(cached![i].slug).toBe(categories[i].slug);
            expect(cached![i].postCount).toBe(categories[i].postCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any tags cached via setCachedTags, getCachedTags
   * SHALL return data with the same structure and values.
   */
  it('getCachedTags returns data matching the original tags', async () => {
    const tagArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 50 }),
      slug: slugArb,
      postCount: fc.integer({ min: 0, max: 1000 }),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.array(tagArb, { minLength: 0, maxLength: 10 }),
        async (tags) => {
          resetMockState();

          // Cache the tags
          await postCache.setCachedTags(tags);

          // Retrieve the cached tags
          const cached = await postCache.getCachedTags();

          // Verify the cached data matches
          expect(cached).not.toBeNull();
          expect(cached!.length).toBe(tags.length);

          for (let i = 0; i < tags.length; i++) {
            expect(cached![i].id).toBe(tags[i].id);
            expect(cached![i].name).toBe(tags[i].name);
            expect(cached![i].slug).toBe(tags[i].slug);
            expect(cached![i].postCount).toBe(tags[i].postCount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Cached post data SHALL preserve all required Post fields without data loss.
   */
  it('cached post preserves all required fields without data loss', async () => {
    await fc.assert(
      fc.asyncProperty(postArb, async (post) => {
        resetMockState();

        // Cache the post
        await postCache.setCachedPost(post as Parameters<typeof postCache.setCachedPost>[0]);

        // Retrieve the cached post
        const cached = await postCache.getCachedPost(post.slug, post.locale);

        // Verify all required fields are present and not undefined
        expect(cached).not.toBeNull();
        expect(cached!.id).toBeDefined();
        expect(cached!.slug).toBeDefined();
        expect(cached!.title).toBeDefined();
        expect(cached!.content).toBeDefined();
        expect(cached!.locale).toBeDefined();
        expect(cached!.status).toBeDefined();
        expect(cached!.authorId).toBeDefined();
        expect(cached!.featured).toBeDefined();
        expect(cached!.readingTime).toBeDefined();
        expect(cached!.createdAt).toBeDefined();
        expect(cached!.updatedAt).toBeDefined();

        // Verify types are correct after serialization
        expect(typeof cached!.id).toBe('string');
        expect(typeof cached!.slug).toBe('string');
        expect(typeof cached!.title).toBe('string');
        expect(typeof cached!.content).toBe('string');
        expect(typeof cached!.locale).toBe('string');
        expect(typeof cached!.status).toBe('string');
        expect(typeof cached!.authorId).toBe('string');
        expect(typeof cached!.featured).toBe('boolean');
        expect(typeof cached!.readingTime).toBe('number');
        expect(typeof cached!.createdAt).toBe('string');
        expect(typeof cached!.updatedAt).toBe('string');
      }),
      { numRuns: 100 }
    );
  });
});
