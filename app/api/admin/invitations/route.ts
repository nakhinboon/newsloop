import { NextResponse } from 'next/server';
import { verifyAdminRole } from '@/lib/auth/roles';
import {
  createInvitation,
  listPendingInvitations,
} from '@/lib/admin/invitations';
import { logActivity } from '@/lib/admin/logger';
import { ensureUserExists } from '@/lib/admin/users';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { validateMethod, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/security/headers';
import {
  createInvitationSchema,
  validateBody,
  formatValidationError,
} from '@/lib/security/api-schemas';

const ALLOWED_METHODS = ['GET', 'POST'] as const;

/**
 * GET /api/admin/invitations
 * List all pending invitations
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
    
    const invitations = await listPendingInvitations();
    
    return NextResponse.json({ invitations });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Admin role required') {
        return createForbiddenResponse();
      }
    }
    console.error('Error listing invitations:', error);
    return NextResponse.json({ error: 'Failed to list invitations' }, { status: 500 });
  }
}

/**
 * POST /api/admin/invitations
 * Create a new invitation
 * Requirements: 4.1, 5.4 - Rate limiting applied, method validation, 8.1 - Zod schema validation
 */
export async function POST(request: Request) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;

  try {
    // Apply rate limiting for admin endpoints
    const rateLimitResult = await applyRateLimit(request, 'ADMIN');
    if (rateLimitResult) {
      return rateLimitResult.response;
    }

    const user = await verifyAdminRole();
    await ensureUserExists(user);
    
    const body = await request.json();
    
    // Validate input with Zod schema - Requirements: 8.1
    const validation = validateBody(body, createInvitationSchema);
    if (!validation.success) {
      return NextResponse.json(formatValidationError(validation), { status: 400 });
    }

    const { email, role } = validation.data!;
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
        return createUnauthorizedResponse();
      }
      if (error.message === 'Admin role required') {
        return createForbiddenResponse();
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
