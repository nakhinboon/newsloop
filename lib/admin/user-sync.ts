/**
 * User Sync Service
 * 
 * Handles synchronization of user data from Clerk to the database.
 * Used by Clerk webhooks to keep user records in sync.
 */

import { prisma } from '@/lib/db/prisma';
import { Role } from '@/lib/generated/prisma';

// Clerk user data structure from webhooks
export interface ClerkUserData {
  id: string;
  email_addresses: Array<{ email_address: string }>;
  first_name: string | null;
  last_name: string | null;
  image_url: string;
  public_metadata: { role?: 'ADMIN' | 'EDITOR' };
}

// Validated user data for database operations
export interface ValidatedUserData {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string | null;
  role: Role;
}

/**
 * Validate and transform Clerk user data for database operations
 */
export function validateClerkUserData(data: unknown): ValidatedUserData | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const userData = data as Record<string, unknown>;

  // Validate required fields
  if (typeof userData.id !== 'string' || !userData.id) {
    return null;
  }

  // Extract email - may be empty for some social logins
  let email: string | null = null;
  if (Array.isArray(userData.email_addresses) && userData.email_addresses.length > 0) {
    const firstEmail = userData.email_addresses[0];
    if (firstEmail && typeof firstEmail === 'object') {
      const emailObj = firstEmail as Record<string, unknown>;
      if (typeof emailObj.email_address === 'string' && emailObj.email_address) {
        email = emailObj.email_address;
      }
    }
  }

  // Email is required for our system
  if (!email) {
    console.warn(`User ${userData.id} has no email address, skipping sync`);
    return null;
  }

  // Extract role from public_metadata
  const publicMetadata = userData.public_metadata as Record<string, unknown> | undefined;
  const roleValue = publicMetadata?.role;
  const role: Role = roleValue === 'ADMIN' ? Role.ADMIN : Role.EDITOR;

  return {
    id: userData.id,
    email,
    firstName: typeof userData.first_name === 'string' ? userData.first_name : null,
    lastName: typeof userData.last_name === 'string' ? userData.last_name : null,
    imageUrl: typeof userData.image_url === 'string' ? userData.image_url : null,
    role,
  };
}

/**
 * Create a new user in the database from Clerk user data
 */
export async function syncUserFromClerk(clerkUser: ClerkUserData): Promise<ValidatedUserData> {
  const validated = validateClerkUserData(clerkUser);
  
  if (!validated) {
    throw new Error('Invalid Clerk user data');
  }

  await prisma.user.create({
    data: {
      id: validated.id,
      email: validated.email,
      firstName: validated.firstName,
      lastName: validated.lastName,
      imageUrl: validated.imageUrl,
      role: validated.role,
    },
  });

  return validated;
}

/**
 * Update an existing user in the database from Clerk user data
 */
export async function updateUserFromClerk(clerkUser: ClerkUserData): Promise<ValidatedUserData> {
  const validated = validateClerkUserData(clerkUser);
  
  if (!validated) {
    throw new Error('Invalid Clerk user data');
  }

  await prisma.user.update({
    where: { id: validated.id },
    data: {
      email: validated.email,
      firstName: validated.firstName,
      lastName: validated.lastName,
      imageUrl: validated.imageUrl,
      role: validated.role,
    },
  });

  return validated;
}

/**
 * Handle user deletion from Clerk
 * If user has posts/media, we keep the record but could mark as deleted
 * If user has no content, we can safely delete
 */
export async function handleUserDeletion(clerkUserId: string): Promise<{ deleted: boolean; reason?: string }> {
  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: clerkUserId },
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
    return { deleted: false, reason: 'User not found' };
  }

  // If user has content, we cannot delete (need reassignment first)
  if (user._count.posts > 0 || user._count.media > 0) {
    return { 
      deleted: false, 
      reason: `User has ${user._count.posts} posts and ${user._count.media} media items` 
    };
  }

  // Safe to delete
  await prisma.user.delete({
    where: { id: clerkUserId },
  });

  return { deleted: true };
}
