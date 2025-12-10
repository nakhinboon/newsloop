import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/auth/roles';
import { listUsers } from '@/lib/admin/users';

/**
 * GET /api/admin/users
 * List all users with stats
 */
export async function GET() {
  try {
    await verifyAdminRole();
    
    const users = await listUsers();
    
    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
      }
      if (error.message === 'Admin role required') {
        return NextResponse.json({ error: 'Admin role required' }, { status: 403 });
      }
    }
    console.error('Error listing users:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}
