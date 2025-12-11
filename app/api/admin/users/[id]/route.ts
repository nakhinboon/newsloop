import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/auth/roles';
import { updateUserRole, deleteUser, getUserById, ensureUserExists } from '@/lib/admin/users';
import { logActivity } from '@/lib/admin/logger';
import { Role } from '@/lib/generated/prisma';
import { validateMethod, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/security/headers';
import {
  updateUserRoleSchema,
  validateBody,
  formatValidationError,
} from '@/lib/security/api-schemas';

const ALLOWED_METHODS = ['GET', 'PATCH', 'DELETE'] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/users/[id]
 * Get a single user
 * Requirements: 5.4, 7.2 - Method validation, consistent auth error messages
 */
export async function GET(request: Request, { params }: RouteParams) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;
  try {
    await verifyAdminRole();
    
    const { id } = await params;
    const user = await getUserById(id);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Admin role required') {
        return createForbiddenResponse();
      }
    }
    console.error('Error getting user:', error);
    return NextResponse.json({ error: 'Failed to get user' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user role
 * Requirements: 5.4, 7.2 - Method validation, consistent auth error messages, 8.1 - Zod schema validation
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;

  try {
    const currentUser = await verifyAdminRole();
    await ensureUserExists(currentUser);
    
    const { id } = await params;
    const body = await request.json();

    // Validate input with Zod schema - Requirements: 8.1
    const validation = validateBody(body, updateUserRoleSchema);
    if (!validation.success) {
      return NextResponse.json(formatValidationError(validation), { status: 400 });
    }

    const { role } = validation.data!;
    const result = await updateUserRole(id, role as Role, currentUser.id);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logActivity({
      action: 'UPDATE_USER',
      entityType: 'USER',
      entityId: id,
      userId: currentUser.id,
      details: { role }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Admin role required') {
        return createForbiddenResponse();
      }
    }
    console.error('Error updating user role:', error);
    return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete a user
 * Requirements: 5.4, 7.2 - Method validation, consistent auth error messages
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;

  try {
    const currentUser = await verifyAdminRole();
    await ensureUserExists(currentUser);
    
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const reassignTo = searchParams.get('reassignTo') || undefined;

    const result = await deleteUser(id, currentUser.id, reassignTo);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await logActivity({
      action: 'DELETE_USER',
      entityType: 'USER',
      entityId: id,
      userId: currentUser.id,
      details: { reassignTo }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Admin role required') {
        return createForbiddenResponse();
      }
    }
    console.error('Error deleting user:', error);
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
