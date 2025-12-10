import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/auth/roles';
import { revokeInvitation } from '@/lib/admin/invitations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/admin/invitations/[id]
 * Revoke a pending invitation
 */
export async function DELETE(request: Request, { params }: RouteParams) {
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
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      if (error.message === 'Admin role required') {
        return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
      }
    }
    console.error('Error revoking invitation:', error);
    return NextResponse.json({ error: 'Failed to revoke invitation' }, { status: 500 });
  }
}
