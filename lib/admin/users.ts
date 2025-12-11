/**
 * User Management Service
 * 
 * Handles user listing, role updates, and deletion.
 * Includes protection for last admin and self-deletion.
 */

import { prisma } from '@/lib/db/prisma';
import { clerkClient } from '@clerk/nextjs/server';
import { Role } from '@/lib/generated/prisma';
import type { ClerkUser } from '@/lib/auth/clerk';

export interface UserWithStats {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  role: Role;
  createdAt: Date;
  postCount: number;
  mediaCount: number;
}

/**
 * List all users with their post and media counts
 */
export async function listUsers(): Promise<UserWithStats[]> {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          posts: true,
          media: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return users.map((user) => ({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    role: user.role,
    createdAt: user.createdAt,
    postCount: user._count.posts,
    mediaCount: user._count.media,
  }));
}

/**
 * Check if a user is the last admin in the system
 */
export async function isLastAdmin(userId: string): Promise<boolean> {
  const adminCount = await prisma.user.count({
    where: { role: Role.ADMIN },
  });

  if (adminCount <= 1) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    return user?.role === Role.ADMIN;
  }

  return false;
}

/**
 * Check if a user can be deleted
 */
export async function canDeleteUser(
  userId: string,
  currentUserId: string
): Promise<{ canDelete: boolean; reason?: string }> {
  // Cannot delete yourself
  if (userId === currentUserId) {
    return { canDelete: false, reason: 'Cannot delete your own account' };
  }

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          posts: true,
          media: true,
        },
      },
    },
  });

  if (!user) {
    return { canDelete: false, reason: 'User not found' };
  }

  // Check if last admin
  if (await isLastAdmin(userId)) {
    return { canDelete: false, reason: 'Cannot delete the last admin' };
  }

  // If user has content, need reassignment
  if (user._count.posts > 0 || user._count.media > 0) {
    return {
      canDelete: false,
      reason: `User has ${user._count.posts} posts and ${user._count.media} media items. Reassign content first.`,
    };
  }

  return { canDelete: true };
}

/**
 * Update a user's role
 */
export async function updateUserRole(
  userId: string,
  newRole: Role,
  _currentUserId: string
): Promise<{ success: boolean; error?: string }> {
  // Check if trying to demote last admin
  if (newRole !== Role.ADMIN && (await isLastAdmin(userId))) {
    return { success: false, error: 'Cannot demote the last admin' };
  }

  // Update in database
  await prisma.user.update({
    where: { id: userId },
    data: { role: newRole },
  });

  // Update in Clerk
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: newRole,
      },
    });
  } catch (error) {
    console.error('Failed to update role in Clerk:', error);
    // Rollback database change
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user) {
      await prisma.user.update({
        where: { id: userId },
        data: { role: user.role },
      });
    }
    return { success: false, error: 'Failed to sync role with Clerk' };
  }

  return { success: true };
}

/**
 * Delete a user
 */
export async function deleteUser(
  userId: string,
  currentUserId: string,
  reassignTo?: string
): Promise<{ success: boolean; error?: string }> {
  // Check if can delete
  const canDelete = await canDeleteUser(userId, currentUserId);
  
  if (!canDelete.canDelete && !reassignTo) {
    return { success: false, error: canDelete.reason };
  }

  // If reassignment needed
  if (reassignTo) {
    // Reassign posts
    await prisma.post.updateMany({
      where: { authorId: userId },
      data: { authorId: reassignTo },
    });

    // Reassign media
    await prisma.media.updateMany({
      where: { uploadedById: userId },
      data: { uploadedById: reassignTo },
    });
  }

  // Delete from database
  await prisma.user.delete({
    where: { id: userId },
  });

  // Delete from Clerk
  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
  } catch (error) {
    console.error('Failed to delete user from Clerk:', error);
    // User is already deleted from DB, log but don't fail
  }

  return { success: true };
}

/**
 * Get a single user by ID
 */
export async function getUserById(userId: string): Promise<UserWithStats | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          posts: true,
          media: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    role: user.role,
    createdAt: user.createdAt,
    postCount: user._count.posts,
    mediaCount: user._count.media,
  };
}

/**
 * Ensure a user exists in the database (sync from Clerk if needed)
 */
export async function ensureUserExists(user: ClerkUser): Promise<void> {
  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });

  if (!dbUser) {
    // Map role
    let role: Role = Role.EDITOR; // Default
    if (user.publicMetadata?.role === 'admin') {
      role = Role.ADMIN;
    }

    await prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        imageUrl: user.imageUrl,
        role: role,
      },
    });
  }
}
