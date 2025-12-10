import prisma from '@/lib/db/prisma';
import { postCache } from '@/lib/cache/posts';
import type { Tag } from '@/lib/generated/prisma';

export interface CreateTagInput {
  name: string;
  slug: string;
}

export interface UpdateTagInput {
  name?: string;
  slug?: string;
}

export interface TagWithCount extends Tag {
  _count: { posts: number };
}

/**
 * Tag Service - CRUD operations for tags
 */
export const tagService = {
  /**
   * Get all tags with post counts
   */
  async getAllTags(): Promise<TagWithCount[]> {
    return prisma.tag.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  /**
   * Get a single tag by ID
   */
  async getTagById(id: string): Promise<TagWithCount | null> {
    return prisma.tag.findUnique({
      where: { id },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });
  },

  /**
   * Get a tag by slug
   */
  async getTagBySlug(slug: string): Promise<TagWithCount | null> {
    return prisma.tag.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });
  },

  /**
   * Create a new tag
   */
  async createTag(data: CreateTagInput): Promise<Tag> {
    // Check for duplicate name/slug
    const existing = await prisma.tag.findFirst({
      where: {
        OR: [
          { name: { equals: data.name, mode: 'insensitive' } },
          { slug: data.slug },
        ],
      },
    });

    if (existing) {
      throw new Error('Tag with this name or slug already exists');
    }

    const tag = await prisma.tag.create({ data });

    // Invalidate cache
    await postCache.invalidateTags();

    return tag;
  },

  /**
   * Update a tag
   */
  async updateTag(id: string, data: UpdateTagInput): Promise<Tag> {
    // Check for duplicate name/slug (excluding current tag)
    if (data.name || data.slug) {
      const existing = await prisma.tag.findFirst({
        where: {
          id: { not: id },
          OR: [
            ...(data.name ? [{ name: { equals: data.name, mode: 'insensitive' as const } }] : []),
            ...(data.slug ? [{ slug: data.slug }] : []),
          ],
        },
      });

      if (existing) {
        throw new Error('Tag with this name or slug already exists');
      }
    }

    const tag = await prisma.tag.update({
      where: { id },
      data,
    });

    // Invalidate cache
    await postCache.invalidateTags();
    await postCache.invalidateAllPosts();

    return tag;
  },

  /**
   * Delete a tag
   * Note: This will remove the tag from all posts but won't delete the posts
   */
  async deleteTag(id: string): Promise<void> {
    // PostTag entries will be cascade deleted due to schema definition
    await prisma.tag.delete({ where: { id } });

    // Invalidate cache
    await postCache.invalidateTags();
    await postCache.invalidateAllPosts();
  },

  /**
   * Check if a tag name is unique
   */
  async isNameUnique(name: string, excludeId?: string): Promise<boolean> {
    const existing = await prisma.tag.findFirst({
      where: {
        name: { equals: name, mode: 'insensitive' },
        ...(excludeId && { id: { not: excludeId } }),
      },
    });

    return !existing;
  },

  /**
   * Generate a slug from a name
   */
  generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  },

  /**
   * Get or create tags by names
   * Useful for post creation where tags might not exist yet
   */
  async getOrCreateTags(names: string[]): Promise<Tag[]> {
    const tags: Tag[] = [];

    for (const name of names) {
      const slug = this.generateSlug(name);
      
      let tag = await prisma.tag.findUnique({ where: { slug } });
      
      if (!tag) {
        tag = await prisma.tag.create({
          data: { name, slug },
        });
      }
      
      tags.push(tag);
    }

    // Invalidate cache if new tags were created
    await postCache.invalidateTags();

    return tags;
  },
};

export default tagService;
