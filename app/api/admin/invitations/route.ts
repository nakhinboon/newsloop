import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/auth/roles';
import {
  createInvitation,
  listPendingInvitations,
} from '@/lib/admin/invitations';
import { logActivity } from '@/lib/admin/logger';
import { ensureUserExists } from '@/lib/admin/users';

/**
 * GET /api/admin/invitations
 * List all pending invitations
 */
export async function GET() {
  try {
    await verifyAdminRole();
    
    const invitations = await listPendingInvitations();
    
    return NextResponse.json({ invitations });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      if (error.message === 'Admin role required') {
        return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
      }
    }
    console.error('Error listing invitations:', error);
    return NextResponse.json({ error: 'Failed to list invitations' }, { status: 500 });
  }
}

/**
 * POST /api/admin/invitations
 * Create a new invitation
 */
export async function POST(request: Request) {
  try {
    const user = await verifyAdminRole();
    await ensureUserExists(user);
    
    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      );
    }

    if (role !== 'ADMIN' && role !== 'EDITOR') {
      return NextResponse.json(
        { error: 'Role must be ADMIN or EDITOR' },
        { status: 400 }
      );
    }

    const invitation = await createInvitation({ email, role });

    await logActivity({
      action: 'INVITE_USER',
      entityType: 'USER',
      entityId: invitation.id,
      userId: user.id,
      details: { email, role }
    });
    
    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      if (error.message === 'Admin role required') {
        return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
      }
      if (error.message === 'Invalid email format') {
        return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
      }
      if (error.message.includes('already exists') || error.message.includes('already pending')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
    }
    console.error('Error creating invitation:', error);
    return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 });
  }
}
