/**
 * Property-Based Tests for Post CRUD Consistency
 *
 * **Feature: advanced-web-blog, Property 22: Post CRUD consistency**
 * **Validates: Requirements 13.3, 13.5**
 *
 * Property 22: For any post P created via `createPost()`, subsequent calls to
 * `getPostById(P.id)` SHALL return the same post data, and after `deletePost(P.id)`,
 * `getPostById(P.id)` SHALL return null.
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
    resetIdCounter: () => { idCounter = 0; },
  };
});

// Mock the prisma module
vi.mock('@/lib/db/prisma', () => {
  return {
    default: {
      post: {
        findMany: vi.fn(async ({ where, include, orderBy }: { where?: Record<string, unknown>; include?: Record<string, unknown>; orderBy?: Record<string, unknown> } = {}) => {
          let posts = Array.from(postStore.values());
          
          if (where?.status) {
            posts = posts.filter(p => p.status === where.status);
          }
          if (where?.categoryId) {
            posts = posts.filter(p => p.categoryId === where.categoryId);
          }
          if (where?.locale) {
            posts = posts.filter(p => p.locale === where.locale);
          }
          
          // Add relations if included
          if (include) {
            posts = posts.map(p => ({
              ...p,
              author: include.author ? { id: p.authorId, email: 'test@test.com' } : undefined,
              category: include.category && p.categoryId ? { id: p.categoryId, name: 'Test Category' } : null,
              tags: include.tags ? (postTagStore.get(p.id as string) || []).map(pt => ({ tagId: pt.tagId, tag: { id: pt.tagId, name: 'Test Tag' } })) : [],
            }));
          }
          
          // Sort by createdAt desc
          if (orderBy?.createdAt === 'desc') {
            posts.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
          }
          
          return posts;
        }),
        
        findUnique: vi.fn(async ({ where, include }: { where: { id?: string; slug_locale?: { slug: string; locale: string } }; include?: Record<string, unknown> }) => {
          let post: Record<string, unknown> | undefined;
          
          if (where.id) {
            post = postStore.get(where.id);
          } else if (where.slug_locale) {
            post = Array.from(postStore.values()).find(
              p => p.slug === where.slug_locale!.slug && p.locale === where.slug_locale!.locale
            );
          }
          
          if (!post) return null;
          
          // Add relations if included
          if (include) {
            return {
              ...post,
              author: include.author ? { id: post.authorId, email: 'test@test.com' } : undefined,
              category: include.category && post.categoryId ? { id: post.categoryId, name: 'Test Category' } : null,
              tags: include.tags ? (postTagStore.get(post.id as string) || []).map(pt => ({ tagId: pt.tagId, tag: { id: pt.tagId, name: 'Test Tag' } })) : [],
            };
          }
          
          return post;
        }),
        
        create: vi.fn(async ({ data, include }: { data: Record<string, unknown>; include?: Record<string, unknown> }) => {
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
          if (data.tags && typeof data.tags === 'object' && 'create' in (data.tags as Record<string, unknown>)) {
            const tagCreates = (data.tags as { create: Array<{ tagId: string }> }).create;
            postTagStore.set(id, tagCreates.map(t => ({ postId: id, tagId: t.tagId })));
          }
          
          // Add relations if included
          if (include) {
            return {
              ...post,
              author: include.author ? { id: post.authorId, email: 'test@test.com' } : undefined,
              category: include.category && post.categoryId ? { id: post.categoryId, name: 'Test Category' } : null,
              tags: include.tags ? (postTagStore.get(id) || []).map(pt => ({ tagId: pt.tagId, tag: { id: pt.tagId, name: 'Test Tag' } })) : [],
            };
          }
          
          return post;
        }),
        
        update: vi.fn(async ({ where, data, include }: { where: { id: string }; data: Record<string, unknown>; include?: Record<string, unknown> }) => {
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
              author: include.author ? { id: updatedPost.authorId, email: 'test@test.com' } : undefined,
              category: include.category && updatedPost.categoryId ? { id: updatedPost.categoryId, name: 'Test Category' } : null,
              tags: include.tags ? (postTagStore.get(where.id) || []).map(pt => ({ tagId: pt.tagId, tag: { id: pt.tagId, name: 'Test Tag' } })) : [],
            };
          }
          
          return updatedPost;
        }),
        
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
        
        createMany: vi.fn(async ({ data }: { data: Array<{ postId: string; tagId: string }> }) => {
          for (const item of data) {
            const existing = postTagStore.get(item.postId) || [];
            existing.push(item);
            postTagStore.set(item.postId, existing);
          }
          return { count: data.length };
        }),
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

// Arbitrary for generating post status
const statusArb = fc.constantFrom('DRAFT', 'SCHEDULED', 'PUBLISHED') as fc.Arbitrary<'DRAFT' | 'SCHEDULED' | 'PUBLISHED'>;

// Arbitrary for generating valid post input
const createPostInputArb = fc.record({
  title: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
  content: fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0),
  excerpt: fc.option(fc.string({ minLength: 1, maxLength: 160 }), { nil: undefined }),
  slug: slugArb,
  locale: localeArb,
  status: statusArb,
  authorId: fc.uuid(),
  categoryId: fc.option(fc.uuid(), { nil: undefined }),
  tagIds: fc.option(fc.array(fc.uuid(), { minLength: 0, maxLength: 3 }), { nil: undefined }),
  featured: fc.option(fc.boolean(), { nil: undefined }),
  readingTime: fc.option(fc.integer({ min: 1, max: 60 }), { nil: undefined }),
});

describe('Property 22: Post CRUD consistency', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  /**
   * **Feature: advanced-web-blog, Property 22: Post CRUD consistency**
   * **Validates: Requirements 13.3, 13.5**
   * 
   * Property: For any post P created via createPost(), subsequent calls to
   * getPostById(P.id) SHALL return the same post data.
   */
  it('getPostById returns the same post data after createPost', async () => {
    await fc.assert(
      fc.asyncProperty(createPostInputArb, async (input) => {
        resetMockState();

        // Create the post
        const createdPost = await adminPostService.createPost(input as CreatePostInput);

        // Retrieve the post by ID
        const retrievedPost = await adminPostService.getPostById(createdPost.id);

        // Verify the retrieved post matches the created post
        expect(retrievedPost).not.toBeNull();
        expect(retrievedPost!.id).toBe(createdPost.id);
        expect(retrievedPost!.slug).toBe(input.slug);
        expect(retrievedPost!.title).toBe(input.title);
        expect(retrievedPost!.content).toBe(input.content);
        expect(retrievedPost!.locale).toBe(input.locale);
        expect(retrievedPost!.status).toBe(input.status);
        expect(retrievedPost!.authorId).toBe(input.authorId);
        
        // Verify optional fields
        if (input.excerpt !== undefined) {
          expect(retrievedPost!.excerpt).toBe(input.excerpt);
        }
        if (input.categoryId !== undefined) {
          expect(retrievedPost!.categoryId).toBe(input.categoryId);
        }
        if (input.featured !== undefined) {
          expect(retrievedPost!.featured).toBe(input.featured);
        }
        if (input.readingTime !== undefined) {
          expect(retrievedPost!.readingTime).toBe(input.readingTime);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 22: Post CRUD consistency**
   * **Validates: Requirements 13.3, 13.5**
   * 
   * Property: After deletePost(P.id), getPostById(P.id) SHALL return null.
   */
  it('getPostById returns null after deletePost', async () => {
    await fc.assert(
      fc.asyncProperty(createPostInputArb, async (input) => {
        resetMockState();

        // Create the post
        const createdPost = await adminPostService.createPost(input as CreatePostInput);

        // Verify the post exists
        const existingPost = await adminPostService.getPostById(createdPost.id);
        expect(existingPost).not.toBeNull();

        // Delete the post
        await adminPostService.deletePost(createdPost.id);

        // Verify the post no longer exists
        const deletedPost = await adminPostService.getPostById(createdPost.id);
        expect(deletedPost).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any post created and then updated, getPostById SHALL return
   * the updated data.
   */
  it('getPostById returns updated data after updatePost', async () => {
    const updateDataArb = fc.record({
      title: fc.option(fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0), { nil: undefined }),
      content: fc.option(fc.string({ minLength: 1, maxLength: 500 }).filter(s => s.trim().length > 0), { nil: undefined }),
      featured: fc.option(fc.boolean(), { nil: undefined }),
    });

    await fc.assert(
      fc.asyncProperty(createPostInputArb, updateDataArb, async (input, updateData) => {
        resetMockState();

        // Create the post
        const createdPost = await adminPostService.createPost(input as CreatePostInput);

        // Update the post with non-undefined values
        const updateInput: Record<string, unknown> = {};
        if (updateData.title !== undefined) updateInput.title = updateData.title;
        if (updateData.content !== undefined) updateInput.content = updateData.content;
        if (updateData.featured !== undefined) updateInput.featured = updateData.featured;

        // Only update if there's something to update
        if (Object.keys(updateInput).length > 0) {
          await adminPostService.updatePost(createdPost.id, updateInput);

          // Retrieve the updated post
          const retrievedPost = await adminPostService.getPostById(createdPost.id);

          // Verify the updated fields
          expect(retrievedPost).not.toBeNull();
          if (updateData.title !== undefined) {
            expect(retrievedPost!.title).toBe(updateData.title);
          }
          if (updateData.content !== undefined) {
            expect(retrievedPost!.content).toBe(updateData.content);
          }
          if (updateData.featured !== undefined) {
            expect(retrievedPost!.featured).toBe(updateData.featured);
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Creating multiple posts and deleting one SHALL only affect that post.
   */
  it('deleting one post does not affect other posts', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(createPostInputArb, { minLength: 2, maxLength: 5 }),
        fc.integer({ min: 0, max: 4 }),
        async (inputs, deleteIndex) => {
          resetMockState();

          // Ensure unique slugs for each post
          const uniqueInputs = inputs.map((input, i) => ({
            ...input,
            slug: `${input.slug}-${i}`,
          }));

          // Create all posts
          const createdPosts = [];
          for (const input of uniqueInputs) {
            const post = await adminPostService.createPost(input as CreatePostInput);
            createdPosts.push(post);
          }

          // Determine which post to delete (within bounds)
          const actualDeleteIndex = deleteIndex % createdPosts.length;
          const postToDelete = createdPosts[actualDeleteIndex];

          // Delete one post
          await adminPostService.deletePost(postToDelete.id);

          // Verify the deleted post is gone
          const deletedPost = await adminPostService.getPostById(postToDelete.id);
          expect(deletedPost).toBeNull();

          // Verify all other posts still exist
          for (let i = 0; i < createdPosts.length; i++) {
            if (i !== actualDeleteIndex) {
              const existingPost = await adminPostService.getPostById(createdPosts[i].id);
              expect(existingPost).not.toBeNull();
              expect(existingPost!.id).toBe(createdPosts[i].id);
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Post count SHALL decrease by 1 after deletePost.
   */
  it('post count decreases by 1 after deletePost', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(createPostInputArb, { minLength: 1, maxLength: 5 }),
        async (inputs) => {
          resetMockState();

          // Ensure unique slugs for each post
          const uniqueInputs = inputs.map((input, i) => ({
            ...input,
            slug: `${input.slug}-${i}`,
          }));

          // Create all posts
          const createdPosts = [];
          for (const input of uniqueInputs) {
            const post = await adminPostService.createPost(input as CreatePostInput);
            createdPosts.push(post);
          }

          // Get initial count
          const initialCounts = await adminPostService.getPostCounts();
          expect(initialCounts.total).toBe(createdPosts.length);

          // Delete the first post
          await adminPostService.deletePost(createdPosts[0].id);

          // Verify count decreased
          const finalCounts = await adminPostService.getPostCounts();
          expect(finalCounts.total).toBe(createdPosts.length - 1);
        }
      ),
      { numRuns: 50 }
    );
  });
});
