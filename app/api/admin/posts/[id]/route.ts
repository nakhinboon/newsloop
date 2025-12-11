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
  updatePostSchema,
  validateBody,
  formatValidationError,
} from '@/lib/security/api-schemas';
import { sanitizeHtml } from '@/lib/sanitize';

const ALLOWED_METHODS = ['GET', 'PATCH', 'DELETE'] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/posts/[id] - Get a single post by ID
 * Requirements: 1.1, 1.2, 4.1, 5.4, 7.2 - Role verification, rate limiting, method validation, consistent auth error messages
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const post = await adminPostService.getPostById(id);

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    return NextResponse.json({ post });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Editor role required') {
        return createForbiddenResponse();
      }
    }
    console.error('Failed to get post:', error);
    return NextResponse.json({ error: 'Failed to get post' }, { status: 500 });
  }
}


/**
 * PATCH /api/admin/posts/[id] - Update a post
 * Requirements: 1.1, 1.2, 3.2, 4.1, 5.4, 8.1 - Role verification, XSS prevention, rate limiting, method validation, Zod validation
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;
    const body = await request.json();

    // Validate input with Zod schema - Requirements: 8.1
    const validation = validateBody(body, updatePostSchema);
    if (!validation.success) {
      return NextResponse.json(formatValidationError(validation), { status: 400 });
    }

    // Check if post exists
    const existingPost = await adminPostService.getPostById(id);
    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const updateData = validation.data!;

    // Sanitize HTML content if provided - Requirements: 3.2
    if (updateData.content) {
      updateData.content = sanitizeHtml(updateData.content);
    }
    if (updateData.excerpt) {
      updateData.excerpt = sanitizeHtml(updateData.excerpt);
    }

    // Trim title if provided
    if (updateData.title) {
      updateData.title = updateData.title.trim();
    }

    const post = await adminPostService.updatePost(id, updateData);

    // Log activity - Requirements: 9.1
    await logActivity({
      action: 'UPDATE_POST',
      entityType: 'POST',
      entityId: id,
      userId: user.id,
      details: { updatedFields: Object.keys(updateData) },
    });

    return NextResponse.json({ post });
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
    console.error('Failed to update post:', error);
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/posts/[id] - Delete a post
 * Requirements: 1.1, 1.2, 4.1, 5.4, 7.2 - Role verification, rate limiting, method validation, consistent auth error messages
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    const { id } = await params;

    // Check if post exists
    const existingPost = await adminPostService.getPostById(id);
    if (!existingPost) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    await adminPostService.deletePost(id);

    // Log activity - Requirements: 9.1
    await logActivity({
      action: 'DELETE_POST',
      entityType: 'POST',
      entityId: id,
      userId: user.id,
      details: { title: existingPost.title, slug: existingPost.slug },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Editor role required') {
        return createForbiddenResponse();
      }
    }
    console.error('Failed to delete post:', error);
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 });
  }
}
