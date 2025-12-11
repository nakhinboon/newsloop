import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/auth/roles';
import { revokeInvitation } from '@/lib/admin/invitations';
import { validateMethod, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/security/headers';

const ALLOWED_METHODS = ['DELETE'] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/admin/invitations/[id]
 * Revoke a pending invitation
 * Requirements: 5.4, 7.2 - Method validation, consistent auth error messages
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;
  try {
    await verifyAdminRole();
    
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Invitation ID is required' }, { status: 400 });
    }

    await revokeInvitation(id);
    
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
    console.error('Error revoking invitation:', error);
    return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 });
  }
}
