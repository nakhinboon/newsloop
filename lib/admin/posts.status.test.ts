/**
 * Property-Based Tests for Post Status Transitions
 *
 * **Feature: advanced-web-blog, Property 23: Post status transitions**
 * **Validates: Requirements 15.1, 15.2, 15.3**
 *
 * Property 23: For any draft post, publishing SHALL change status to 'published'
 * and set publishedAt; for scheduled posts, status SHALL change to 'published'
 * when scheduledAt time is reached.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Use vi.hoisted to create stores that can be accessed by vi.mock
const { postStore, postTagStore, generateId, resetIdCounter } = vi.hoisted(() => {
  const postStore = new Map<string, Record<string, unknown>>();
  const postTagStore = new Map<string, { postId: string; tagId: string }[]>();
  let idCounter = 0;

  return {
    postStore,
    postTagStore,
    generateId: () => `test-post-${++idCounter}`,
    resetIdCounter: () => {
      idCounter = 0;
    },
  };
});

// Mock the prisma module
vi.mock('@/lib/db/prisma', () => {
  return {
    default: {
      post: {
        findMany: vi.fn(
          async ({
            where,
            include,
            orderBy,
          }: {
            where?: Record<string, unknown>;
            include?: Record<string, unknown>;
            orderBy?: Record<string, unknown>;
          } = {}) => {
            let posts = Array.from(postStore.values());

            if (where?.status) {
              posts = posts.filter((p) => p.status === where.status);
            }
            if (where?.categoryId) {
              posts = posts.filter((p) => p.categoryId === where.categoryId);
            }
            if (where?.locale) {
              posts = posts.filter((p) => p.locale === where.locale);
            }
            // Handle scheduledAt filter for processScheduledPosts
            if (where?.scheduledAt && typeof where.scheduledAt === 'object') {
              const scheduledAtFilter = where.scheduledAt as { lte?: Date };
              if (scheduledAtFilter.lte) {
                posts = posts.filter((p) => {
                  if (!p.scheduledAt) return false;
                  return new Date(p.scheduledAt as string) <= scheduledAtFilter.lte!;
                });
              }
            }

            // Add relations if included
            if (include) {
              posts = posts.map((p) => ({
                ...p,
                author: include.author ? { id: p.authorId, email: 'test@test.com' } : undefined,
                category:
                  include.category && p.categoryId
                    ? { id: p.categoryId, name: 'Test Category' }
                    : null,
                tags: include.tags
                  ? (postTagStore.get(p.id as string) || []).map((pt) => ({
                      tagId: pt.tagId,
                      tag: { id: pt.tagId, name: 'Test Tag' },
                    }))
                  : [],
              }));
            }

            // Sort by createdAt desc
            if (orderBy?.createdAt === 'desc') {
              posts.sort(
                (a, b) =>
                  new Date(b.createdAt as string).getTime() -
                  new Date(a.createdAt as string).getTime()
              );
            }

            return posts;
          }
        ),

        findUnique: vi.fn(
          async ({
            where,
            include,
            select,
          }: {
            where: { id?: string; slug_locale?: { slug: string; locale: string } };
            include?: Record<string, unknown>;
            select?: Record<string, unknown>;
          }) => {
            let post: Record<string, unknown> | undefined;

            if (where.id) {
              post = postStore.get(where.id);
            } else if (where.slug_locale) {
              post = Array.from(postStore.values()).find(
                (p) =>
                  p.slug === where.slug_locale!.slug && p.locale === where.slug_locale!.locale
              );
            }

            if (!post) return null;

            // Handle select
            if (select) {
              const selected: Record<string, unknown> = {};
              for (const key of Object.keys(select)) {
                if (select[key]) {
                  selected[key] = post[key];
                }
              }
              return selected;
            }

            // Add relations if included
            if (include) {
              return {
                ...post,
                author: include.author
                  ? { id: post.authorId, email: 'test@test.com' }
                  : undefined,
                category:
                  include.category && post.categoryId
                    ? { id: post.categoryId, name: 'Test Category' }
                    : null,
                tags: include.tags
                  ? (postTagStore.get(post.id as string) || []).map((pt) => ({
                      tagId: pt.tagId,
                      tag: { id: pt.tagId, name: 'Test Tag' },
                    }))
                  : [],
              };
            }

            return post;
          }
        ),

        create: vi.fn(
          async ({
            data,
            include,
          }: {
            data: Record<string, unknown>;
            include?: Record<string, unknown>;
          }) => {
            const id = generateId();
            const now = new Date();

            const post: Record<string, unknown> = {
              id,
              slug: data.slug,
              locale: data.locale || 'en',
              title: data.title,
              content: data.content,
              excerpt: data.excerpt || null,
              status: data.status || 'DRAFT',
              publishedAt: data.publishedAt || null,
              scheduledAt: data.scheduledAt || null,
              createdAt: now,
              updatedAt: now,
              readingTime: data.readingTime || 0,
              featured: data.featured || false,
              authorId: data.authorId,
              categoryId: data.categoryId || null,
            };

            postStore.set(id, post);

            // Handle tags
            if (
              data.tags &&
              typeof data.tags === 'object' &&
              'create' in (data.tags as Record<string, unknown>)
            ) {
              const tagCreates = (data.tags as { create: Array<{ tagId: string }> }).create;
              postTagStore.set(
                id,
                tagCreates.map((t) => ({ postId: id, tagId: t.tagId }))
              );
            }

            // Add relations if included
            if (include) {
              return {
                ...post,
                author: include.author
                  ? { id: post.authorId, email: 'test@test.com' }
                  : undefined,
                category:
                  include.category && post.categoryId
                    ? { id: post.categoryId, name: 'Test Category' }
                    : null,
                tags: include.tags
                  ? (postTagStore.get(id) || []).map((pt) => ({
                      tagId: pt.tagId,
                      tag: { id: pt.tagId, name: 'Test Tag' },
                    }))
                  : [],
              };
            }

            return post;
          }
        ),

        update: vi.fn(
          async ({
            where,
            data,
            include,
          }: {
            where: { id: string };
            data: Record<string, unknown>;
            include?: Record<string, unknown>;
          }) => {
            const post = postStore.get(where.id);
            if (!post) throw new Error('Post not found');

            const updatedPost = {
              ...post,
              ...data,
              updatedAt: new Date(),
            };

            postStore.set(where.id, updatedPost);

            // Add relations if included
            if (include) {
              return {
                ...updatedPost,
                author: include.author
                  ? { id: updatedPost.authorId, email: 'test@test.com' }
                  : undefined,
                category:
                  include.category && updatedPost.categoryId
                    ? { id: updatedPost.categoryId, name: 'Test Category' }
                    : null,
                tags: include.tags
                  ? (postTagStore.get(where.id) || []).map((pt) => ({
                      tagId: pt.tagId,
                      tag: { id: pt.tagId, name: 'Test Tag' },
                    }))
                  : [],
              };
            }

            return updatedPost;
          }
        ),

        delete: vi.fn(async ({ where }: { where: { id: string } }) => {
          const post = postStore.get(where.id);
          if (!post) throw new Error('Post not found');

          postStore.delete(where.id);
          postTagStore.delete(where.id);

          return post;
        }),

        count: vi.fn(async ({ where }: { where?: Record<string, unknown> } = {}) => {
          if (!where) return postStore.size;

          let count = 0;
          for (const post of postStore.values()) {
            if (where.status && post.status !== where.status) continue;
            count++;
          }
          return count;
        }),
      },

      postTag: {
        deleteMany: vi.fn(async ({ where }: { where: { postId: string } }) => {
          postTagStore.delete(where.postId);
          return { count: 0 };
        }),

        createMany: vi.fn(
          async ({ data }: { data: Array<{ postId: string; tagId: string }> }) => {
            for (const item of data) {
              const existing = postTagStore.get(item.postId) || [];
              existing.push(item);
              postTagStore.set(item.postId, existing);
            }
            return { count: data.length };
          }
        ),
      },
    },
  };
});

// Mock the cache module
vi.mock('@/lib/cache/posts', () => ({
  postCache: {
    invalidatePost: vi.fn(async () => {}),
    invalidateAllPosts: vi.fn(async () => {}),
  },
}));

// Import after mocking
import { adminPostService, type CreatePostInput } from './posts';

// Helper to reset mock state
function resetMockState() {
  postStore.clear();
  postTagStore.clear();
  resetIdCounter();
  vi.clearAllMocks();
}

// Arbitrary for generating valid slugs
const slugArb = fc
  .stringMatching(/^[a-z][a-z0-9-]{2,30}$/)
  .filter((s) => !s.endsWith('-') && !s.includes('--'));

// Arbitrary for generating valid locales
const localeArb = fc.constantFrom('en', 'es', 'fr', 'th');

// Arbitrary for generating draft post input
const draftPostInputArb = fc.record({
  title: fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0),
  content: fc
    .string({ minLength: 1, maxLength: 500 })
    .filter((s) => s.trim().length > 0),
  excerpt: fc.option(fc.string({ minLength: 1, maxLength: 160 }), { nil: undefined }),
  slug: slugArb,
  locale: localeArb,
  status: fc.constant('DRAFT' as const),
  authorId: fc.uuid(),
  categoryId: fc.option(fc.uuid(), { nil: undefined }),
  featured: fc.option(fc.boolean(), { nil: undefined }),
  readingTime: fc.option(fc.integer({ min: 1, max: 60 }), { nil: undefined }),
});

// Arbitrary for generating scheduled post input with a past scheduledAt date
const scheduledPostInputArb = fc.record({
  title: fc
    .string({ minLength: 1, maxLength: 100 })
    .filter((s) => s.trim().length > 0),
  content: fc
    .string({ minLength: 1, maxLength: 500 })
    .filter((s) => s.trim().length > 0),
  excerpt: fc.option(fc.string({ minLength: 1, maxLength: 160 }), { nil: undefined }),
  slug: slugArb,
  locale: localeArb,
  status: fc.constant('SCHEDULED' as const),
  authorId: fc.uuid(),
  categoryId: fc.option(fc.uuid(), { nil: undefined }),
  featured: fc.option(fc.boolean(), { nil: undefined }),
  readingTime: fc.option(fc.integer({ min: 1, max: 60 }), { nil: undefined }),
  // Generate a date in the past (1 hour to 30 days ago)
  scheduledAt: fc
    .integer({ min: 1, max: 30 * 24 })
    .map((hoursAgo) => new Date(Date.now() - hoursAgo * 60 * 60 * 1000)),
});

describe('Property 23: Post status transitions', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  /**
   * **Feature: advanced-web-blog, Property 23: Post status transitions**
   * **Validates: Requirements 15.1, 15.2, 15.3**
   *
   * Property: For any draft post, publishing SHALL change status to 'PUBLISHED'
   * and set publishedAt to a non-null Date.
   */
  it('publishing a draft post changes status to PUBLISHED and sets publishedAt', async () => {
    await fc.assert(
      fc.asyncProperty(draftPostInputArb, async (input) => {
        resetMockState();

        // Create a draft post
        const draftPost = await adminPostService.createPost(input as CreatePostInput);

        // Verify it's a draft with no publishedAt
        expect(draftPost.status).toBe('DRAFT');
        expect(draftPost.publishedAt).toBeNull();

        // Publish the post
        const publishedPost = await adminPostService.publishPost(draftPost.id);

        // Verify status changed to PUBLISHED
        expect(publishedPost.status).toBe('PUBLISHED');

        // Verify publishedAt is set to a valid Date
        expect(publishedPost.publishedAt).not.toBeNull();
        expect(publishedPost.publishedAt).toBeInstanceOf(Date);

        // Verify the publishedAt is recent (within last minute)
        const now = Date.now();
        const publishedTime = new Date(publishedPost.publishedAt as Date).getTime();
        expect(now - publishedTime).toBeLessThan(60000); // Within 1 minute
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 23: Post status transitions**
   * **Validates: Requirements 15.1, 15.2, 15.3**
   *
   * Property: For any scheduled post whose scheduledAt time has passed,
   * processScheduledPosts SHALL change status to 'PUBLISHED'.
   */
  it('scheduled posts become PUBLISHED when scheduledAt time is reached', async () => {
    await fc.assert(
      fc.asyncProperty(scheduledPostInputArb, async (input) => {
        resetMockState();

        // Create a scheduled post with a past scheduledAt date
        const scheduledPost = await adminPostService.createPost(input as CreatePostInput);

        // Verify it's scheduled
        expect(scheduledPost.status).toBe('SCHEDULED');
        expect(scheduledPost.scheduledAt).not.toBeNull();

        // Process scheduled posts (simulates cron job)
        const processedCount = await adminPostService.processScheduledPosts();

        // Verify at least one post was processed
        expect(processedCount).toBeGreaterThanOrEqual(1);

        // Retrieve the post and verify it's now published
        const updatedPost = await adminPostService.getPostById(scheduledPost.id);
        expect(updatedPost).not.toBeNull();
        expect(updatedPost!.status).toBe('PUBLISHED');
        expect(updatedPost!.publishedAt).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 23: Post status transitions**
   * **Validates: Requirements 15.1**
   *
   * Property: For any post, scheduling SHALL change status to 'SCHEDULED'
   * and set scheduledAt to the specified date.
   */
  it('scheduling a post changes status to SCHEDULED and sets scheduledAt', async () => {
    // Generate a future date (1 hour to 30 days from now)
    const futureDateArb = fc
      .integer({ min: 1, max: 30 * 24 })
      .map((hoursFromNow) => new Date(Date.now() + hoursFromNow * 60 * 60 * 1000));

    await fc.assert(
      fc.asyncProperty(draftPostInputArb, futureDateArb, async (input, futureDate) => {
        resetMockState();

        // Create a draft post
        const draftPost = await adminPostService.createPost(input as CreatePostInput);

        // Schedule the post
        const scheduledPost = await adminPostService.schedulePost(draftPost.id, futureDate);

        // Verify status changed to SCHEDULED
        expect(scheduledPost.status).toBe('SCHEDULED');

        // Verify scheduledAt is set to the specified date
        expect(scheduledPost.scheduledAt).not.toBeNull();
        const scheduledTime = new Date(scheduledPost.scheduledAt as Date).getTime();
        const expectedTime = futureDate.getTime();
        // Allow small time difference due to test execution
        expect(Math.abs(scheduledTime - expectedTime)).toBeLessThan(1000);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 23: Post status transitions**
   * **Validates: Requirements 15.2**
   *
   * Property: For any published post, unpublishing SHALL change status to 'DRAFT'
   * and clear publishedAt.
   */
  it('unpublishing a post changes status to DRAFT and clears publishedAt', async () => {
    await fc.assert(
      fc.asyncProperty(draftPostInputArb, async (input) => {
        resetMockState();

        // Create and publish a post
        const draftPost = await adminPostService.createPost(input as CreatePostInput);
        const publishedPost = await adminPostService.publishPost(draftPost.id);

        // Verify it's published
        expect(publishedPost.status).toBe('PUBLISHED');
        expect(publishedPost.publishedAt).not.toBeNull();

        // Unpublish the post
        const unpublishedPost = await adminPostService.unpublishPost(publishedPost.id);

        // Verify status changed to DRAFT
        expect(unpublishedPost.status).toBe('DRAFT');

        // Verify publishedAt is cleared
        expect(unpublishedPost.publishedAt).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 23: Post status transitions**
   * **Validates: Requirements 15.3**
   *
   * Property: Scheduled posts with future scheduledAt SHALL NOT be published
   * by processScheduledPosts.
   */
  it('scheduled posts with future scheduledAt are not published prematurely', async () => {
    // Generate a future date (1 hour to 30 days from now)
    const futureScheduledPostArb = fc.record({
      title: fc
        .string({ minLength: 1, maxLength: 100 })
        .filter((s) => s.trim().length > 0),
      content: fc
        .string({ minLength: 1, maxLength: 500 })
        .filter((s) => s.trim().length > 0),
      slug: slugArb,
      locale: localeArb,
      status: fc.constant('SCHEDULED' as const),
      authorId: fc.uuid(),
      // Generate a date in the future (1 hour to 30 days from now)
      scheduledAt: fc
        .integer({ min: 1, max: 30 * 24 })
        .map((hoursFromNow) => new Date(Date.now() + hoursFromNow * 60 * 60 * 1000)),
    });

    await fc.assert(
      fc.asyncProperty(futureScheduledPostArb, async (input) => {
        resetMockState();

        // Create a scheduled post with a future scheduledAt date
        const scheduledPost = await adminPostService.createPost(input as CreatePostInput);

        // Verify it's scheduled
        expect(scheduledPost.status).toBe('SCHEDULED');

        // Process scheduled posts
        const processedCount = await adminPostService.processScheduledPosts();

        // Verify no posts were processed (future date)
        expect(processedCount).toBe(0);

        // Verify the post is still scheduled
        const unchangedPost = await adminPostService.getPostById(scheduledPost.id);
        expect(unchangedPost).not.toBeNull();
        expect(unchangedPost!.status).toBe('SCHEDULED');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 23: Post status transitions**
   * **Validates: Requirements 15.1, 15.2, 15.3**
   *
   * Property: Status transitions are idempotent - publishing an already
   * published post keeps it published.
   */
  it('publishing an already published post keeps it published', async () => {
    await fc.assert(
      fc.asyncProperty(draftPostInputArb, async (input) => {
        resetMockState();

        // Create and publish a post
        const draftPost = await adminPostService.createPost(input as CreatePostInput);
        const publishedPost = await adminPostService.publishPost(draftPost.id);
        const originalPublishedAt = publishedPost.publishedAt;

        // Publish again
        const republishedPost = await adminPostService.publishPost(publishedPost.id);

        // Verify it's still published
        expect(republishedPost.status).toBe('PUBLISHED');
        expect(republishedPost.publishedAt).not.toBeNull();
      }),
      { numRuns: 100 }
    );
  });
});
