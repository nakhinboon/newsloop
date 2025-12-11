import { currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import type { ClerkUser } from './clerk';

// Role types
export type Role = 'admin' | 'editor';

// Role hierarchy - higher index = more permissions
const ROLE_HIERARCHY: Role[] = ['editor', 'admin'];

/**
 * Get the role level for comparison
 */
function getRoleLevel(role: Role | null | undefined): number {
  if (!role) return -1;
  return ROLE_HIERARCHY.indexOf(role);
}

/**
 * Check if a role has at least the required permission level
 */
export function hasMinimumRole(userRole: Role | null | undefined, requiredRole: Role): boolean {
  return getRoleLevel(userRole) >= getRoleLevel(requiredRole);
}

/**
 * Helper to get role from user object, checking ADMIN_EMAIL override
 * Handles case-insensitive role checking (e.g. 'ADMIN' -> 'admin')
 */
function getEffectiveRole(user: any): Role | null {
  if (!user) return null;

  // Check for admin override via environment variable (server-side only)
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.emailAddresses?.some((e: any) => e.emailAddress === adminEmail)) {
    return 'admin';
  }

  const metadata = user.publicMetadata as { role?: string };
  const role = metadata?.role;

  if (!role) return null;

  const normalizedRole = role.toLowerCase();
  if (normalizedRole === 'admin') return 'admin';
  if (normalizedRole === 'editor') return 'editor';

  return null;
}

/**
 * Get the user's role from Clerk publicMetadata
 */
export async function getUserRoleFromClerk(): Promise<Role | null> {
  const user = await currentUser();
  return getEffectiveRole(user);
}

/**
 * Check if the current user has admin role
 */
export async function checkIsAdmin(): Promise<boolean> {
  const role = await getUserRoleFromClerk();
  return role === 'admin';
}

/**
 * Check if the current user has at least editor role
 */
export async function checkIsEditor(): Promise<boolean> {
  const role = await getUserRoleFromClerk();
  return hasMinimumRole(role, 'editor');
}


/**
 * Require admin role - redirects to sign-in if not admin
 * Use this in server components/actions that require admin access
 */
export async function requireAdmin(): Promise<ClerkUser> {
  const user = await currentUser();
  
  if (!user) {
    redirect('/dashboard/sign-in');
  }

  const role = getEffectiveRole(user);

  if (role !== 'admin') {
    // User is authenticated but not an admin
    redirect('/dashboard/unauthorized');
  }

  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? '',
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    publicMetadata: { role: role ?? undefined },
  };
}

/**
 * Require editor role (or higher) - redirects to sign-in if not authorized
 * Use this in server components/actions that require editor access
 */
export async function requireEditor(): Promise<ClerkUser> {
  const user = await currentUser();
  
  if (!user) {
    redirect('/dashboard/sign-in');
  }

  const role = getEffectiveRole(user);

  if (!hasMinimumRole(role, 'editor')) {
    // User is authenticated but doesn't have editor role
    redirect('/dashboard/unauthorized');
  }

  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? '',
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    publicMetadata: { role: role ?? undefined },
  };
}

/**
 * Verify admin role for API routes
 * Returns the user if admin, throws error otherwise
 */
export async function verifyAdminRole(): Promise<ClerkUser> {
  const user = await currentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }

  const role = getEffectiveRole(user);

  if (role !== 'admin') {
    throw new Error('Admin role required');
  }

  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? '',
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    publicMetadata: { role: role ?? undefined },
  };
}

/**
 * Verify editor role (or higher) for API routes
 * Returns the user if authorized, throws error otherwise
 */
export async function verifyEditorRole(): Promise<ClerkUser> {
  const user = await currentUser();
  
  if (!user) {
    throw new Error('Authentication required');
  }

  const role = getEffectiveRole(user);

  if (!hasMinimumRole(role, 'editor')) {
    throw new Error('Editor role required');
  }

  return {
    id: user.id,
    email: user.emailAddresses[0]?.emailAddress ?? '',
    firstName: user.firstName,
    lastName: user.lastName,
    imageUrl: user.imageUrl,
    publicMetadata: { role: role ?? undefined },
  };
}
