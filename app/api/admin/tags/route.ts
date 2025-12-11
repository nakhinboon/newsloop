import { verifyEditorRole } from '@/lib/auth/roles';
import { tagService } from '@/lib/admin/tags';
import { NextResponse } from 'next/server';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { validateMethod, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/security/headers';

const ALLOWED_METHODS = ['GET'] as const;

/**
 * GET /api/admin/tags
 * List all tags
 * Requirements: 1.1, 1.2, 4.1, 5.4 - Role verification, rate limiting, method validation
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

    // Verify editor role - Requirements: 1.1, 1.2, 1.4
    await verifyEditorRole();
    const tags = await tagService.getAllTags();
    return NextResponse.json(tags);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Editor role required') {
        return createForbiddenResponse();
      }
    }
    console.error('Failed to fetch tags:', error);
    return NextResponse.json({ error: 'Failed to fetch tags' }, { status: 500 });
  }
}
