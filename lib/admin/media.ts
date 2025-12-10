import prisma from '@/lib/db/prisma';
import imagekit, { getOptimizedUrl, getThumbnailUrl } from '@/lib/media/imagekit';
import { validateFile } from '@/lib/media/upload';
import type { Media } from '@/lib/generated/prisma';

export interface UploadResult {
  id: string;
  fileId: string;
  filename: string;
  url: string;
  thumbnailUrl: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
}

export interface PaginatedMedia {
  items: Media[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Media Service - Upload and manage images via ImageKit
 */
export const mediaService = {
  /**
   * Upload an image to ImageKit and store metadata in database
   */
  /**
   * Upload an image to ImageKit and store metadata in database
   * @requirements 17.2, 19.4, 19.9, 5.2
   */
  async uploadImage(
    file: Buffer,
    filename: string,
    mimeType: string,
    uploadedById: string,
    imagekitFolder: string = '/blog',
    folderId?: string | null
  ): Promise<UploadResult> {
    // Validate file type and size using shared utilities
    const validation = validateFile(mimeType, file.length);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Upload to ImageKit
    const uploadResponse = await imagekit.upload({
      file: file.toString('base64'),
      fileName: filename,
      folder: imagekitFolder,
      useUniqueFileName: true,
    });

    // Generate thumbnail URL
    const thumbnailUrl = getThumbnailUrl(uploadResponse.filePath, 200);

    // Store metadata in database with optional folder assignment
    const media = await prisma.media.create({
      data: {
        fileId: uploadResponse.fileId,
        filename: uploadResponse.name,
        url: uploadResponse.url,
        thumbnailUrl,
        mimeType,
        size: file.length,
        width: uploadResponse.width || null,
        height: uploadResponse.height || null,
        uploadedById,
        folderId: folderId || null,
      },
    });

    return {
      id: media.id,
      fileId: media.fileId,
      filename: media.filename,
      url: media.url,
      thumbnailUrl: media.thumbnailUrl || thumbnailUrl,
      mimeType: media.mimeType,
      size: media.size,
      width: media.width,
      height: media.height,
    };
  },

  /**
   * Get all media with pagination and optional folder filter
   * @requirements 5.3
   */
  async getAllMedia(
    page: number = 1,
    pageSize: number = 20,
    folderId?: string | null
  ): Promise<PaginatedMedia> {
    const skip = (page - 1) * pageSize;

    // Build where clause for folder filter
    const where = folderId !== undefined
      ? { folderId: folderId }
      : {};

    const [items, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { uploadedAt: 'desc' },
        include: {
          uploadedBy: {
            select: { firstName: true, lastName: true, email: true },
          },
          folder: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.media.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  /**
   * Get a single media item by ID
   */
  async getMediaById(id: string): Promise<Media | null> {
    return prisma.media.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  },

  /**
   * Get media by fileId (ImageKit ID)
   */
  async getMediaByFileId(fileId: string): Promise<Media | null> {
    return prisma.media.findUnique({
      where: { fileId },
    });
  },

  /**
   * Check if a media item is used in any posts
   */
  async getMediaUsage(id: string): Promise<{ postId: string; title: string }[]> {
    const media = await prisma.media.findUnique({
      where: { id },
      select: { url: true },
    });

    if (!media) return [];

    // Search for posts containing this media URL
    const posts = await prisma.post.findMany({
      where: {
        content: { contains: media.url },
      },
      select: { id: true, title: true },
    });

    return posts.map((p) => ({ postId: p.id, title: p.title }));
  },

  /**
   * Delete a media item
   * Optionally force delete even if used in posts
   */
  async deleteMedia(id: string, force: boolean = false): Promise<void> {
    const media = await prisma.media.findUnique({
      where: { id },
    });

    if (!media) {
      throw new Error('Media not found');
    }

    // Check usage unless force delete
    if (!force) {
      const usage = await this.getMediaUsage(id);
      if (usage.length > 0) {
        throw new Error(
          `Cannot delete media. It is used in ${usage.length} post(s): ${usage.map((u) => u.title).join(', ')}`
        );
      }
    }

    // Delete from ImageKit
    try {
      await imagekit.deleteFile(media.fileId);
    } catch (error) {
      console.error('Failed to delete from ImageKit:', error);
      // Continue with database deletion even if ImageKit fails
    }

    // Delete from database
    await prisma.media.delete({ where: { id } });
  },

  /**
   * Get optimized URL for a media item
   */
  getOptimizedUrl,

  /**
   * Get thumbnail URL for a media item
   */
  getThumbnailUrl,

  /**
   * Search media by filename with optional folder filter
   * @requirements 4.2, 5.3
   */
  async searchMedia(
    query: string,
    page: number = 1,
    pageSize: number = 20,
    folderId?: string | null
  ): Promise<PaginatedMedia> {
    const skip = (page - 1) * pageSize;

    const where: {
      filename: { contains: string; mode: 'insensitive' };
      folderId?: string | null;
    } = {
      filename: { contains: query, mode: 'insensitive' as const },
    };

    if (folderId !== undefined) {
      where.folderId = folderId;
    }

    const [items, total] = await Promise.all([
      prisma.media.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { uploadedAt: 'desc' },
        include: {
          folder: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.media.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },

  /**
   * Move media to a different folder
   * @requirements 5.4
   */
  async moveMediaToFolder(mediaId: string, folderId: string | null): Promise<Media> {
    const media = await prisma.media.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new Error('Media not found');
    }

    // Verify folder exists if folderId is provided
    if (folderId) {
      const folder = await prisma.mediaFolder.findUnique({
        where: { id: folderId },
      });
      if (!folder) {
        throw new Error('Folder not found');
      }
    }

    return prisma.media.update({
      where: { id: mediaId },
      data: { folderId },
      include: {
        folder: {
          select: { id: true, name: true },
        },
      },
    });
  },
};

export default mediaService;
