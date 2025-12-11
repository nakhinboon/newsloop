import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/auth/roles';
import { listUsers } from '@/lib/admin/users';
import { applyRateLimit, getRateLimitHeaders } from '@/lib/security/rate-limit';
import { validateMethod, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/security/headers';

const ALLOWED_METHODS = ['GET'] as const;

/**
 * GET /api/admin/users
 * List all users with stats
 * Requirements: 4.1, 5.4 - Rate limiting applied, method validation
 */
export async function GET(request: Request) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;
  try {
    // Apply rate limiting for admin endpoints
    const rateLimitResult = await applyRateLimit(request, 'ADMIN');
    if (rateLimitResult) {
      return rateLimitResult.response;
    }

    await verifyAdminRole();
    
    const users = await listUsers();
    
    return NextResponse.json({ users });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Admin role required') {
        return createForbiddenResponse();
      }
    }
    console.error('Error listing users:', error);
    return NextResponse.json({ error: 'Failed to list users' }, { status: 500 });
  }
}
