import { NextRequest, NextResponse } from 'next/server';
import { verifyEditorRole } from '@/lib/auth/roles';
import { adminPostService } from '@/lib/admin/posts';
import { logActivity } from '@/lib/admin/logger';
import { ensureUserExists } from '@/lib/admin/users';
import { applyRateLimit } from '@/lib/security/rate-limit';
import {
  validateMethod,
  createUnauthorizedResponse,
  createForbiddenResponse,
} from '@/lib/security/headers';
import {
  adminPostsListQuerySchema,
  createPostSchema,
  validateQuery,
  validateBody,
  formatValidationError,
  MAX_LIMIT,
} from '@/lib/security/api-schemas';
import { sanitizeHtml } from '@/lib/sanitize';

const ALLOWED_METHODS = ['GET', 'POST'] as const;

/**
 * GET /api/admin/posts - List all posts with filters and pagination
 * Requirements: 1.1, 1.2, 4.1, 4.3, 5.4, 8.1 - Role verification, rate limiting, pagination, method validation, Zod validation
 */
export async function GET(request: NextRequest) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;

  try {
    // Apply rate limiting for admin endpoints - Requirements: 4.1
    const rateLimitResult = await applyRateLimit(request, 'ADMIN');
    if (rateLimitResult) {
      return rateLimitResult.response;
    }

    // Verify editor role - Requirements: 1.1, 1.2, 1.4
    await verifyEditorRole();

    const { searchParams } = new URL(request.url);

    // Validate query parameters with Zod schema - Requirements: 8.1, 4.3
    const validation = validateQuery(searchParams, adminPostsListQuerySchema);
    if (!validation.success) {
      return NextResponse.json(formatValidationError(validation), { status: 400 });
    }

    const { page, limit: requestedLimit, status, categoryId, locale, search } = validation.data!;

    // Enforce pagination limit - Requirements: 4.3
    const limit = Math.min(requestedLimit, MAX_LIMIT);

    const result = await adminPostService.getPaginatedPosts(
      { status, categoryId, locale, search },
      { page, limit }
    );

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
    console.error('Failed to list posts:', error);
    return NextResponse.json({ error: 'Failed to list posts' }, { status: 500 });
  }
}

/**
 * POST /api/admin/posts - Create a new post
 * Requirements: 1.1, 1.2, 3.2, 4.1, 5.4, 8.1 - Role verification, XSS prevention, rate limiting, method validation, Zod validation
 */
export async function POST(request: NextRequest) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;

  try {
    // Apply rate limiting for admin endpoints - Requirements: 4.1
    const rateLimitResult = await applyRateLimit(request, 'ADMIN');
    if (rateLimitResult) {
      return rateLimitResult.response;
    }

    // Verify editor role - Requirements: 1.1, 1.2, 1.4
    const user = await verifyEditorRole();
    await ensureUserExists(user);

    const body = await request.json();

    // Validate input with Zod schema - Requirements: 8.1
    const validation = validateBody(body, createPostSchema);
    if (!validation.success) {
      return NextResponse.json(formatValidationError(validation), { status: 400 });
    }

    const { title, content, excerpt, slug, locale, status, categoryId, tagIds, scheduledAt, featured, readingTime } =
      validation.data!;

    // Sanitize HTML content to prevent XSS - Requirements: 3.2
    const sanitizedContent = sanitizeHtml(content);
    const sanitizedExcerpt = excerpt ? sanitizeHtml(excerpt) : undefined;

    const post = await adminPostService.createPost({
      title: title.trim(),
      content: sanitizedContent,
      excerpt: sanitizedExcerpt,
      slug,
      locale,
      status,
      categoryId,
      tagIds,
      authorId: user.id,
      scheduledAt,
      featured,
      readingTime,
    });

    // Log activity - Requirements: 9.1
    await logActivity({
      action: 'CREATE_POST',
      entityType: 'POST',
      entityId: post.id,
      userId: user.id,
      details: { title, slug, locale, status },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Editor role required') {
        return createForbiddenResponse();
      }
      // Handle unique constraint violation (duplicate slug+locale)
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { error: 'A post with this slug and locale already exists' },
          { status: 409 }
        );
      }
    }
    console.error('Failed to create post:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}
