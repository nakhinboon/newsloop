import { NextRequest, NextResponse } from 'next/server';
import { verifyEditorRole } from '@/lib/auth/roles';
import { mediaService } from '@/lib/admin/media';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { validateMethod, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/security/headers';
import {
  mediaListQuerySchema,
  validateQuery,
  formatValidationError,
  MAX_LIMIT,
} from '@/lib/security/api-schemas';

const ALLOWED_METHODS = ['GET'] as const;

/**
 * GET /api/admin/media - List media with pagination, search, and folder filter
 * Requirements: 1.1, 1.2, 4.1, 4.2, 4.3, 4.4, 5.3, 5.4, 8.1 - Rate limiting, role verification, method validation, and Zod validation applied
 */
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    
    // Validate query parameters with Zod schema - Requirements: 8.1, 4.3
    const validation = validateQuery(searchParams, mediaListQuerySchema);
    if (!validation.success) {
      return NextResponse.json(formatValidationError(validation), { status: 400 });
    }

    const { page, pageSize, search, folderId } = validation.data!;
    
    // Enforce pagination limit - Requirements: 4.3
    const enforcedPageSize = Math.min(pageSize, MAX_LIMIT);

    let result;
    
    if (search) {
      result = await mediaService.searchMedia(
        search,
        page,
        enforcedPageSize,
        folderId === 'null' ? null : folderId || undefined
      );
    } else {
      result = await mediaService.getAllMedia(
        page,
        enforcedPageSize,
        folderId === 'null' ? null : folderId || undefined
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Editor role required') {
        return createForbiddenResponse();
      }
    }
    console.error('Failed to get media:', error);
    return NextResponse.json(
      { error: 'Failed to get media' },
      { status: 500 }
    );
  }
}
