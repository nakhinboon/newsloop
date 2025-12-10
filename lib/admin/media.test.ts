/**
 * Property-Based Tests for Media Deletion Constraint
 *
 * **Feature: advanced-web-blog, Property 27: Media deletion constraint**
 * **Validates: Requirements 17.4**
 *
 * Property 27: For any media item M referenced by posts, deletion SHALL require
 * confirmation and warn about affected posts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';

// Use vi.hoisted to create stores that can be accessed by vi.mock
const { mediaStore, postStore, generateMediaId, generatePostId, resetIdCounter } = vi.hoisted(() => {
  const mediaStore = new Map<string, Record<string, unknown>>();
  const postStore = new Map<string, Record<string, unknown>>();
  let mediaIdCounter = 0;
  let postIdCounter = 0;

  return {
    mediaStore,
    postStore,
    generateMediaId: () => `test-media-${++mediaIdCounter}`,
    generatePostId: () => `test-post-${++postIdCounter}`,
    resetIdCounter: () => {
      mediaIdCounter = 0;
      postIdCounter = 0;
    },
  };
});

// Mock the prisma module
vi.mock('@/lib/db/prisma', () => {
  return {
    default: {
      media: {
        findUnique: vi.fn(async ({ where }: { where: { id?: string; fileId?: string } }) => {
          if (where.id) {
            return mediaStore.get(where.id) || null;
          }
          if (where.fileId) {
            return Array.from(mediaStore.values()).find((m) => m.fileId === where.fileId) || null;
          }
          return null;
        }),

        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const id = generateMediaId();
          const media = {
            id,
            fileId: data.fileId || `imagekit-${id}`,
            filename: data.filename,
            url: data.url,
            thumbnailUrl: data.thumbnailUrl || null,
            mimeType: data.mimeType,
            size: data.size,
            width: data.width || null,
            height: data.height || null,
            uploadedAt: new Date(),
            uploadedById: data.uploadedById,
          };

          mediaStore.set(id, media);
          return media;
        }),

        delete: vi.fn(async ({ where }: { where: { id: string } }) => {
          const media = mediaStore.get(where.id);
          if (!media) throw new Error('Media not found');

          mediaStore.delete(where.id);
          return media;
        }),
      },

      post: {
        findMany: vi.fn(async ({ where, select }: { where?: { content?: { contains: string } }; select?: Record<string, boolean> }) => {
          const results: Record<string, unknown>[] = [];
          
          for (const post of postStore.values()) {
            if (where?.content?.contains) {
              const content = post.content as string;
              if (content.includes(where.content.contains)) {
                if (select) {
                  const selectedPost: Record<string, unknown> = {};
                  for (const key of Object.keys(select)) {
                    if (select[key]) {
                      selectedPost[key] = post[key];
                    }
                  }
                  results.push(selectedPost);
                } else {
                  results.push(post);
                }
              }
            }
          }
          
          return results;
        }),
      },
    },
  };
});

// Mock the imagekit module
vi.mock('@/lib/media/imagekit', () => ({
  default: {
    upload: vi.fn(async () => ({
      fileId: 'mock-file-id',
      name: 'mock-file.jpg',
      url: 'https://ik.imagekit.io/test/mock-file.jpg',
      filePath: '/blog/mock-file.jpg',
      thumbnailUrl: 'https://ik.imagekit.io/test/mock-file.jpg?tr=w-200',
      width: 800,
      height: 600,
      size: 1024,
      fileType: 'image',
    })),
    deleteFile: vi.fn(async () => {}),
  },
  getOptimizedUrl: vi.fn((path: string) => `https://ik.imagekit.io/test${path}`),
  getThumbnailUrl: vi.fn((path: string, width: number) => `https://ik.imagekit.io/test${path}?tr=w-${width}`),
}));

// Mock the upload validation module
vi.mock('@/lib/media/upload', () => ({
  validateFile: vi.fn(() => ({ valid: true })),
}));

// Import after mocking
import { mediaService } from './media';

// Helper to reset mock state
function resetMockState() {
  mediaStore.clear();
  postStore.clear();
  resetIdCounter();
  vi.clearAllMocks();
}

// Helper to create a mock media item directly in the store
function createMockMedia(url: string): string {
  const id = generateMediaId();
  const fileId = `imagekit-${id}`;
  mediaStore.set(id, {
    id,
    fileId,
    filename: `image-${id}.jpg`,
    url,
    thumbnailUrl: `${url}?tr=w-200`,
    mimeType: 'image/jpeg',
    size: 1024,
    width: 800,
    height: 600,
    uploadedAt: new Date(),
    uploadedById: 'test-user-id',
  });
  return id;
}

// Helper to create a mock post that references a media URL
function createMockPost(mediaUrl: string, title: string): string {
  const id = generatePostId();
  postStore.set(id, {
    id,
    title,
    slug: `post-${id}`,
    content: `<p>Some content with an image</p><img src="${mediaUrl}" alt="test" /><p>More content</p>`,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

// Arbitrary for generating valid media URLs
const mediaUrlArb = fc
  .stringMatching(/^[a-z0-9-]{3,20}$/)
  .map((name) => `https://ik.imagekit.io/test/blog/${name}.jpg`);

// Arbitrary for generating post titles
const postTitleArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length > 0)
  .map((s) => s.trim());

describe('Property 27: Media deletion constraint', () => {
  beforeEach(() => {
    resetMockState();
  });

  afterEach(() => {
    resetMockState();
  });

  /**
   * **Feature: advanced-web-blog, Property 27: Media deletion constraint**
   * **Validates: Requirements 17.4**
   *
   * Property: For any media item M referenced by posts, deletion without force
   * SHALL fail and list the affected posts.
   */
  it('deleting media referenced by posts fails without force flag', async () => {
    await fc.assert(
      fc.asyncProperty(
        mediaUrlArb,
        fc.array(postTitleArb, { minLength: 1, maxLength: 5 }),
        async (mediaUrl, postTitles) => {
          resetMockState();

          // Create a media item
          const mediaId = createMockMedia(mediaUrl);

          // Create posts that reference this media
          for (const title of postTitles) {
            createMockPost(mediaUrl, title);
          }

          // Attempt to delete the media without force flag
          await expect(mediaService.deleteMedia(mediaId)).rejects.toThrow(
            /Cannot delete media\. It is used in \d+ post\(s\)/
          );

          // Verify the media still exists
          const existingMedia = await mediaService.getMediaById(mediaId);
          expect(existingMedia).not.toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 27: Media deletion constraint**
   * **Validates: Requirements 17.4**
   *
   * Property: The error message for deletion constraint SHALL list the affected post titles.
   */
  it('deletion error message lists affected post titles', async () => {
    await fc.assert(
      fc.asyncProperty(
        mediaUrlArb,
        fc.array(postTitleArb, { minLength: 1, maxLength: 3 }),
        async (mediaUrl, postTitles) => {
          resetMockState();

          // Create a media item
          const mediaId = createMockMedia(mediaUrl);

          // Create posts that reference this media
          for (const title of postTitles) {
            createMockPost(mediaUrl, title);
          }

          // Attempt to delete and capture the error
          try {
            await mediaService.deleteMedia(mediaId);
            // Should not reach here
            expect.fail('Expected deletion to throw an error');
          } catch (error) {
            const errorMessage = (error as Error).message;
            
            // Error should mention the number of posts
            expect(errorMessage).toContain(`${postTitles.length} post(s)`);
            
            // Error should list the post titles
            for (const title of postTitles) {
              expect(errorMessage).toContain(title);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 27: Media deletion constraint**
   * **Validates: Requirements 17.4**
   *
   * Property: For any media item M referenced by posts, deletion with force=true
   * SHALL succeed and remove the media.
   */
  it('deleting media referenced by posts succeeds with force flag', async () => {
    await fc.assert(
      fc.asyncProperty(
        mediaUrlArb,
        fc.array(postTitleArb, { minLength: 1, maxLength: 5 }),
        async (mediaUrl, postTitles) => {
          resetMockState();

          // Create a media item
          const mediaId = createMockMedia(mediaUrl);

          // Create posts that reference this media
          for (const title of postTitles) {
            createMockPost(mediaUrl, title);
          }

          // Delete the media with force flag
          await mediaService.deleteMedia(mediaId, true);

          // Verify the media was deleted
          const deletedMedia = await mediaService.getMediaById(mediaId);
          expect(deletedMedia).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 27: Media deletion constraint**
   * **Validates: Requirements 17.4**
   *
   * Property: For any media item M not referenced by any posts, deletion
   * SHALL succeed without requiring force flag.
   */
  it('deleting unreferenced media succeeds without force flag', async () => {
    await fc.assert(
      fc.asyncProperty(mediaUrlArb, async (mediaUrl) => {
        resetMockState();

        // Create a media item with no posts referencing it
        const mediaId = createMockMedia(mediaUrl);

        // Delete the media without force flag
        await mediaService.deleteMedia(mediaId);

        // Verify the media was deleted
        const deletedMedia = await mediaService.getMediaById(mediaId);
        expect(deletedMedia).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 27: Media deletion constraint**
   * **Validates: Requirements 17.4**
   *
   * Property: getMediaUsage SHALL return all posts that reference the media URL.
   */
  it('getMediaUsage returns all posts referencing the media', async () => {
    await fc.assert(
      fc.asyncProperty(
        mediaUrlArb,
        fc.array(postTitleArb, { minLength: 0, maxLength: 5 }),
        async (mediaUrl, postTitles) => {
          resetMockState();

          // Create a media item
          const mediaId = createMockMedia(mediaUrl);

          // Create posts that reference this media
          const createdPostIds: string[] = [];
          for (const title of postTitles) {
            createdPostIds.push(createMockPost(mediaUrl, title));
          }

          // Get media usage
          const usage = await mediaService.getMediaUsage(mediaId);

          // Should return exactly the number of posts created
          expect(usage.length).toBe(postTitles.length);

          // Each usage entry should have postId and title
          for (const entry of usage) {
            expect(entry.postId).toBeDefined();
            expect(entry.title).toBeDefined();
            expect(postTitles).toContain(entry.title);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 27: Media deletion constraint**
   * **Validates: Requirements 17.4**
   *
   * Property: Deleting non-existent media SHALL throw an error.
   */
  it('deleting non-existent media throws error', async () => {
    resetMockState();

    await expect(mediaService.deleteMedia('non-existent-media-id')).rejects.toThrow('Media not found');
  });

  /**
   * **Feature: advanced-web-blog, Property 27: Media deletion constraint**
   * **Validates: Requirements 17.4**
   *
   * Property: Media usage count accurately reflects the number of referencing posts.
   */
  it('media usage count is accurate', async () => {
    await fc.assert(
      fc.asyncProperty(
        mediaUrlArb,
        fc.integer({ min: 0, max: 10 }),
        async (mediaUrl, postCount) => {
          resetMockState();

          // Create a media item
          const mediaId = createMockMedia(mediaUrl);

          // Create the specified number of posts
          for (let i = 0; i < postCount; i++) {
            createMockPost(mediaUrl, `Post ${i + 1}`);
          }

          // Get media usage
          const usage = await mediaService.getMediaUsage(mediaId);

          // Usage count should match post count
          expect(usage.length).toBe(postCount);

          // Deletion behavior should match usage
          if (postCount === 0) {
            // Should succeed without force
            await mediaService.deleteMedia(mediaId);
            const deletedMedia = await mediaService.getMediaById(mediaId);
            expect(deletedMedia).toBeNull();
          } else {
            // Should fail without force
            await expect(mediaService.deleteMedia(mediaId)).rejects.toThrow(
              /Cannot delete media/
            );
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
