import prisma from '@/lib/db/prisma';
import type { PostMedia, Media } from '@/lib/generated/prisma';

export interface PostMediaItem {
  id: string;
  mediaId: string;
  isCover: boolean;
  order: number;
  media: {
    id: string;
    url: string;
    thumbnailUrl: string | null;
    filename: string;
    mimeType: string;
    width: number | null;
    height: number | null;
  };
}

export interface PostMediaInput {
  mediaId: string;
  isCover: boolean;
  order: number;
}

/**
 * Post Media Service - Manage media associations for posts
 * Requirements: 2.5, 3.3, 3.4
 */
export const postMediaService = {
  /**
   * Get all media associated with a post
   */
  async getPostMedia(postId: string): Promise<PostMediaItem[]> {
    const items = await prisma.postMedia.findMany({
      where: { postId },
      orderBy: { order: 'asc' },
      include: {
        media: {
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            filename: true,
            mimeType: true,
            width: true,
            height: true,
          },
        },
      },
    });

    return items.map((item) => ({
      id: item.id,
      mediaId: item.mediaId,
      isCover: item.isCover,
      order: item.order,
      media: item.media,
    }));
  },

  /**
   * Set all media associations for a post (replaces existing)
   * Ensures only one cover image per post
   */
  async setPostMedia(postId: string, mediaItems: PostMediaInput[]): Promise<PostMediaItem[]> {
    // Validate: only one cover image allowed
    const coverCount = mediaItems.filter((m) => m.isCover).length;
    if (coverCount > 1) {
      throw new Error('Only one cover image is allowed per post');
    }

    // Delete existing associations
    await prisma.postMedia.deleteMany({
      where: { postId },
    });

    // Create new associations
    if (mediaItems.length > 0) {
      await prisma.postMedia.createMany({
        data: mediaItems.map((item) => ({
          postId,
          mediaId: item.mediaId,
          isCover: item.isCover,
          order: item.order,
        })),
      });
    }

    return this.getPostMedia(postId);
  },

  /**
   * Add a single media to a post
   */
  async addMediaToPost(
    postId: string,
    mediaId: string,
    isCover: boolean = false
  ): Promise<PostMediaItem[]> {
    // If setting as cover, unset existing cover
    if (isCover) {
      await prisma.postMedia.updateMany({
        where: { postId, isCover: true },
        data: { isCover: false },
      });
    }

    // Get max order
    const maxOrder = await prisma.postMedia.aggregate({
      where: { postId },
      _max: { order: true },
    });

    const newOrder = (maxOrder._max.order ?? -1) + 1;

    // Check if already exists
    const existing = await prisma.postMedia.findUnique({
      where: { postId_mediaId: { postId, mediaId } },
    });

    if (existing) {
      // Update existing
      await prisma.postMedia.update({
        where: { id: existing.id },
        data: { isCover },
      });
    } else {
      // Create new
      await prisma.postMedia.create({
        data: {
          postId,
          mediaId,
          isCover,
          order: newOrder,
        },
      });
    }

    return this.getPostMedia(postId);
  },

  /**
   * Remove a media from a post
   */
  async removeMediaFromPost(postId: string, mediaId: string): Promise<PostMediaItem[]> {
    await prisma.postMedia.deleteMany({
      where: { postId, mediaId },
    });

    return this.getPostMedia(postId);
  },

  /**
   * Set cover image for a post
   */
  async setCoverImage(postId: string, mediaId: string | null): Promise<PostMediaItem[]> {
    // Unset all covers first
    await prisma.postMedia.updateMany({
      where: { postId, isCover: true },
      data: { isCover: false },
    });

    // Set new cover if mediaId provided
    if (mediaId) {
      const existing = await prisma.postMedia.findUnique({
        where: { postId_mediaId: { postId, mediaId } },
      });

      if (existing) {
        await prisma.postMedia.update({
          where: { id: existing.id },
          data: { isCover: true },
        });
      } else {
        // Add media as cover if not already attached
        await this.addMediaToPost(postId, mediaId, true);
      }
    }

    return this.getPostMedia(postId);
  },

  /**
   * Get cover image for a post
   */
  async getCoverImage(postId: string): Promise<PostMediaItem | null> {
    const cover = await prisma.postMedia.findFirst({
      where: { postId, isCover: true },
      include: {
        media: {
          select: {
            id: true,
            url: true,
            thumbnailUrl: true,
            filename: true,
            mimeType: true,
            width: true,
            height: true,
          },
        },
      },
    });

    if (!cover) return null;

    return {
      id: cover.id,
      mediaId: cover.mediaId,
      isCover: cover.isCover,
      order: cover.order,
      media: cover.media,
    };
  },

  /**
   * Reorder media in a post
   */
  async reorderPostMedia(postId: string, mediaIds: string[]): Promise<PostMediaItem[]> {
    // Update order for each media
    await Promise.all(
      mediaIds.map((mediaId, index) =>
        prisma.postMedia.updateMany({
          where: { postId, mediaId },
          data: { order: index },
        })
      )
    );

    return this.getPostMedia(postId);
  },
};

export default postMediaService;
