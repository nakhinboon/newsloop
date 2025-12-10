import { auth, currentUser } from '@clerk/nextjs/server';

// Type for Clerk user with admin metadata
export interface ClerkUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  imageUrl: string;
  publicMetadata: {
    role?: 'admin' | 'editor';
  };
}

// Type for raw Clerk user data (as returned from Clerk API)
export interface RawClerkUserData {
  id: string;
  emailAddresses?: Array<{ emailAddress: string }>;
  firstName?: string | null;
  lastName?: string | null;
  imageUrl?: string;
  publicMetadata?: Record<string, unknown>;
}

/**
 * Validate that a user ID is in valid Clerk format
 * Clerk user IDs start with 'user_' followed by alphanumeric characters
 */
export function isValidClerkUserId(userId: string | null | undefined): boolean {
  if (!userId || typeof userId !== 'string') {
    return false;
  }
  // Clerk user IDs follow the pattern: user_<alphanumeric>
  return /^user_[a-zA-Z0-9]+$/.test(userId);
}

/**
 * Extract and validate role from Clerk publicMetadata
 * Returns the role if valid, null otherwise
 */
export function extractRoleFromMetadata(
  metadata: Record<string, unknown> | null | undefined
): 'admin' | 'editor' | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  
  const role = metadata.role;
  if (role === 'admin' || role === 'editor') {
    return role;
  }
  
  return null;
}

/**
 * Check if a role indicates admin privileges
 */
export function isAdminRole(role: string | null | undefined): boolean {
  return role === 'admin';
}

/**
 * Check if a role indicates at least editor privileges
 */
export function hasEditorOrHigherRole(role: string | null | undefined): boolean {
  return role === 'admin' || role === 'editor';
}

/**
 * Transform raw Clerk user data into our ClerkUser type
 * Validates and extracts required fields
 */
export function transformClerkUserData(rawUser: RawClerkUserData | null | undefined): ClerkUser | null {
  if (!rawUser) {
    return null;
  }

  // Validate user ID
  if (!isValidClerkUserId(rawUser.id)) {
    return null;
  }

  // Extract email (first email address)
  const email = rawUser.emailAddresses?.[0]?.emailAddress ?? '';

  // Extract role from metadata
  const role = extractRoleFromMetadata(rawUser.publicMetadata);

  return {
    id: rawUser.id,
    email,
    firstName: rawUser.firstName ?? null,
    lastName: rawUser.lastName ?? null,
    imageUrl: rawUser.imageUrl ?? '',
    publicMetadata: { role: role ?? undefined },
  };
}

/**
 * Validate a ClerkUser object has all required fields
 */
export function isValidClerkUser(user: ClerkUser | null | undefined): boolean {
  if (!user) {
    return false;
  }

  // Must have valid user ID
  if (!isValidClerkUserId(user.id)) {
    return false;
  }

  // Must have publicMetadata object
  if (!user.publicMetadata || typeof user.publicMetadata !== 'object') {
    return false;
  }

  return true;
}

/**
 * Get the current authenticated user
 * Returns null if not authenticated
 */
export async function getCurrentUser(): Promise<ClerkUser | null> {
  const user = await currentUser();
  
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? '',
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    publicMetadata: user.publicMetadata as ClerkUser['publicMetadata'],
  };
}

/**
 * Get the current user's ID from the session
 * Returns null if not authenticated
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const { userId } = await auth();
  return !!userId;
}


/**
 * Check if a user has admin role
 */
export async function isAdmin(userId?: string): Promise<boolean> {
  const user = await currentUser();
  
  if (!user) {
    return false;
  }

  // If userId is provided, verify it matches the current user
  if (userId && user.id !== userId) {
    return false;
  }

  const role = (user.publicMetadata as ClerkUser['publicMetadata'])?.role;
  return role === 'admin';
}

/**
 * Check if a user has editor role (or higher)
 */
export async function isEditor(userId?: string): Promise<boolean> {
  const user = await currentUser();
  
  if (!user) {
    return false;
  }

  // If userId is provided, verify it matches the current user
  if (userId && user.id !== userId) {
    return false;
  }

  const role = (user.publicMetadata as ClerkUser['publicMetadata'])?.role;
  return role === 'admin' || role === 'editor';
}

/**
 * Get the user's role
 */
export async function getUserRole(): Promise<'admin' | 'editor' | null> {
  const user = await currentUser();
  
  if (!user) {
    return null;
  }

  return (user.publicMetadata as ClerkUser['publicMetadata'])?.role ?? null;
}

/**
 * Require authentication - throws redirect if not authenticated
 * Use this in server components/actions that require auth
 */
export async function requireAuth(): Promise<ClerkUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }

  return user;
}
