import prisma from '@/lib/db/prisma';
import type { MediaFolder } from '@/lib/generated/prisma';

export interface FolderWithCount extends MediaFolder {
  _count: {
    media: number;
  };
}

/**
 * Folder Service - Manage media folders
 * Requirements: 5.1, 5.5
 */
export const folderService = {
  /**
   * Create a new folder with unique name validation
   * @throws Error if folder name already exists
   */
  async createFolder(name: string): Promise<MediaFolder> {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      throw new Error('Folder name is required');
    }

    // Check for duplicate name
    const existing = await prisma.mediaFolder.findUnique({
      where: { name: trimmedName },
    });

    if (existing) {
      throw new Error('A folder with this name already exists');
    }

    return prisma.mediaFolder.create({
      data: { name: trimmedName },
    });
  },

  /**
   * Get all folders with media count
   */
  async getFolders(): Promise<FolderWithCount[]> {
    return prisma.mediaFolder.findMany({
      include: {
        _count: {
          select: { media: true },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  /**
   * Get a single folder by ID
   */
  async getFolderById(id: string): Promise<FolderWithCount | null> {
    return prisma.mediaFolder.findUnique({
      where: { id },
      include: {
        _count: {
          select: { media: true },
        },
      },
    });
  },

  /**
   * Update folder name
   * @throws Error if new name already exists
   */
  async updateFolder(id: string, name: string): Promise<MediaFolder> {
    const trimmedName = name.trim();
    
    if (!trimmedName) {
      throw new Error('Folder name is required');
    }

    // Check for duplicate name (excluding current folder)
    const existing = await prisma.mediaFolder.findFirst({
      where: {
        name: trimmedName,
        NOT: { id },
      },
    });

    if (existing) {
      throw new Error('A folder with this name already exists');
    }

    return prisma.mediaFolder.update({
      where: { id },
      data: { name: trimmedName },
    });
  },

  /**
   * Delete a folder
   * @throws Error if folder contains media
   */
  async deleteFolder(id: string, force: boolean = false): Promise<void> {
    const folder = await prisma.mediaFolder.findUnique({
      where: { id },
      include: {
        _count: {
          select: { media: true },
        },
      },
    });

    if (!folder) {
      throw new Error('Folder not found');
    }

    if (!force && folder._count.media > 0) {
      throw new Error(
        `Cannot delete folder containing ${folder._count.media} media item(s). Move or delete media first.`
      );
    }

    // If force delete, unassign media from folder first
    if (force && folder._count.media > 0) {
      await prisma.media.updateMany({
        where: { folderId: id },
        data: { folderId: null },
      });
    }

    await prisma.mediaFolder.delete({ where: { id } });
  },
};

export default folderService;
