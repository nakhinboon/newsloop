import prisma from '@/lib/db/prisma';
import { postCache } from '@/lib/cache/posts';
import type { PostStatus, Prisma } from '@/lib/generated/prisma';

// Types for admin post operations
export interface PostFilters {
  status?: PostStatus;
  categoryId?: string;
  locale?: string;
  search?: string;
}

export interface CreatePostInput {
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  locale: string;
  status: PostStatus;
  categoryId?: string;
  tagIds?: string[];
  authorId: string;
  scheduledAt?: Date;
  featured?: boolean;
  readingTime?: number;
}

export interface UpdatePostInput {
  title?: string;
  content?: string;
  excerpt?: string;
  slug?: string;
  locale?: string;
  status?: PostStatus;
  categoryId?: string | null;
  tagIds?: string[];
  scheduledAt?: Date | null;
  featured?: boolean;
  readingTime?: number;
}

// Include relations for full post data
const postInclude = {
  author: true,
  category: true,
  tags: {
    include: {
      tag: true,
    },
  },
  postMedia: {
    include: {
      media: true,
    },
    orderBy: {
      order: 'asc',
    },
  },
} satisfies Prisma.PostInclude;

export type AdminPost = Prisma.PostGetPayload<{ include: typeof postInclude }>;

/**
 * Admin Post Service - CRUD operations for blog posts
 */
export const adminPostService = {
  /**
   * Get all posts with optional filters
   */
  async getAllPosts(filters?: PostFilters): Promise<AdminPost[]> {
    const where: Prisma.PostWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.locale) {
      where.locale = filters.locale;
    }

    if (filters?.search) {
      where.OR = [
        { title: { contains: filters.search, mode: 'insensitive' } },
        { content: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.post.findMany({
      where,
      include: postInclude,
      orderBy: { createdAt: 'desc' },
    });
  },

  /**
   * Get a single post by ID
   */
  async getPostById(id: string): Promise<AdminPost | null> {
    return prisma.post.findUnique({
      where: { id },
      include: postInclude,
    });
  },

  /**
   * Get a post by slug and locale
   */
  async getPostBySlugAndLocale(slug: string, locale: string): Promise<AdminPost | null> {
    return prisma.post.findUnique({
      where: { slug_locale: { slug, locale } },
      include: postInclude,
    });
  },

  /**
   * Create a new post
   */
  async createPost(data: CreatePostInput): Promise<AdminPost> {
    const { tagIds, ...postData } = data;

    const post = await prisma.post.create({
      data: {
        ...postData,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null,
        tags: tagIds?.length
          ? {
              create: tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
      },
      include: postInclude,
    });

    // Invalidate cache
    await postCache.invalidateAllPosts();

    return post;
  },

  /**
   * Update an existing post
   */
  async updatePost(id: string, data: UpdatePostInput): Promise<AdminPost> {
    const { tagIds, ...updateData } = data;

    // Get current post for cache invalidation
    const currentPost = await prisma.post.findUnique({
      where: { id },
      select: { slug: true, locale: true },
    });

    // Handle tag updates
    if (tagIds !== undefined) {
      // Delete existing tags and create new ones
      await prisma.postTag.deleteMany({ where: { postId: id } });
      if (tagIds.length > 0) {
        await prisma.postTag.createMany({
          data: tagIds.map((tagId) => ({ postId: id, tagId })),
        });
      }
    }

    // Handle status change to published
    const publishedAt =
      data.status === 'PUBLISHED'
        ? new Date()
        : data.status === 'DRAFT'
          ? null
          : undefined;

    const post = await prisma.post.update({
      where: { id },
      data: {
        ...updateData,
        ...(publishedAt !== undefined && { publishedAt }),
      },
      include: postInclude,
    });

    // Invalidate cache
    if (currentPost) {
      await postCache.invalidatePost(currentPost.slug, currentPost.locale);
    }
    await postCache.invalidatePost(post.slug, post.locale);

    return post;
  },

  /**
   * Delete a post
   */
  async deletePost(id: string): Promise<void> {
    // Get post for cache invalidation
    const post = await prisma.post.findUnique({
      where: { id },
      select: { slug: true, locale: true },
    });

    await prisma.post.delete({ where: { id } });

    // Invalidate cache
    if (post) {
      await postCache.invalidatePost(post.slug, post.locale);
    }
  },

  /**
   * Publish a draft post
   */
  async publishPost(id: string): Promise<AdminPost> {
    return this.updatePost(id, {
      status: 'PUBLISHED',
    });
  },

  /**
   * Schedule a post for future publishing
   */
  async schedulePost(id: string, publishAt: Date): Promise<AdminPost> {
    return this.updatePost(id, {
      status: 'SCHEDULED',
      scheduledAt: publishAt,
    });
  },

  /**
   * Unpublish a post (set to draft)
   */
  async unpublishPost(id: string): Promise<AdminPost> {
    return this.updatePost(id, {
      status: 'DRAFT',
    });
  },

  /**
   * Process scheduled posts - publish posts whose scheduledAt has passed
   * This should be called by a cron job
   */
  async processScheduledPosts(): Promise<number> {
    const now = new Date();

    const scheduledPosts = await prisma.post.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
    });

    for (const post of scheduledPosts) {
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: 'PUBLISHED',
          publishedAt: post.scheduledAt || now,
        },
      });
      await postCache.invalidatePost(post.slug, post.locale);
    }

    return scheduledPosts.length;
  },

  /**
   * Get post count by status
   */
  async getPostCounts(): Promise<Record<PostStatus | 'total', number>> {
    const [total, draft, scheduled, published] = await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { status: 'DRAFT' } }),
      prisma.post.count({ where: { status: 'SCHEDULED' } }),
      prisma.post.count({ where: { status: 'PUBLISHED' } }),
    ]);

    return { total, DRAFT: draft, SCHEDULED: scheduled, PUBLISHED: published };
  },
};

export default adminPostService;
