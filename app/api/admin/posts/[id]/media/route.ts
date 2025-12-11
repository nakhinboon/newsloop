import { NextRequest, NextResponse } from 'next/server';
import { verifyEditorRole } from '@/lib/auth/roles';
import { postMediaService, PostMediaInput } from '@/lib/admin/post-media';
import { validateMethod, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/security/headers';
import {
  updatePostMediaSchema,
  addMediaToPostSchema,
  validateBody,
  formatValidationError,
} from '@/lib/security/api-schemas';

const ALLOWED_METHODS = ['GET', 'PUT', 'POST', 'DELETE'] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/posts/[id]/media - Get all media for a post
 * Requirements: 1.1, 1.2, 3.4, 5.4, 7.2 - Role verification, method validation, consistent auth error messages
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;
  try {
    // Verify editor role - Requirements: 1.1, 1.2, 1.4
    await verifyEditorRole();

    const { id: postId } = await params;
    const media = await postMediaService.getPostMedia(postId);
    return NextResponse.json(media);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Editor role required') {
        return createForbiddenResponse();
      }
    }
    console.error('Failed to get post media:', error);
    return NextResponse.json(
      { error: 'Failed to get post media' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/posts/[id]/media - Update all media associations for a post
 * Requirements: 1.1, 1.2, 3.3, 5.4, 7.2, 8.1 - Role verification, method validation, consistent auth error messages, Zod validation
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;

  try {
    // Verify editor role - Requirements: 1.1, 1.2, 1.4
    await verifyEditorRole();

    const { id: postId } = await params;
    const body = await request.json();

    // Validate input with Zod schema - Requirements: 8.1
    const validation = validateBody(body, updatePostMediaSchema);
    if (!validation.success) {
      return NextResponse.json(formatValidationError(validation), { status: 400 });
    }

    const { media } = validation.data!;
    const result = await postMediaService.setPostMedia(postId, media as PostMediaInput[]);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Editor role required') {
        return createForbiddenResponse();
      }
      if (error.message.includes('Only one cover')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error('Failed to update post media:', error);
    return NextResponse.json(
      { error: 'Failed to update post media' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/posts/[id]/media - Add a single media to a post
 * Requirements: 1.1, 1.2, 5.4, 7.2, 8.1 - Role verification, method validation, consistent auth error messages, Zod validation
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;

  try {
    // Verify editor role - Requirements: 1.1, 1.2, 1.4
    await verifyEditorRole();

    const { id: postId } = await params;
    const body = await request.json();

    // Validate input with Zod schema - Requirements: 8.1
    const validation = validateBody(body, addMediaToPostSchema);
    if (!validation.success) {
      return NextResponse.json(formatValidationError(validation), { status: 400 });
    }

    const { mediaId, isCover } = validation.data!;
    const result = await postMediaService.addMediaToPost(postId, mediaId, isCover);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Editor role required') {
        return createForbiddenResponse();
      }
    }
    console.error('Failed to add media to post:', error);
    return NextResponse.json(
      { error: 'Failed to add media to post' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/posts/[id]/media - Remove a media from a post
 * Requirements: 1.1, 1.2, 5.4, 7.2 - Role verification, method validation, consistent auth error messages
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;

  try {
    // Verify editor role - Requirements: 1.1, 1.2, 1.4
    await verifyEditorRole();

    const { id: postId } = await params;
    const { searchParams } = new URL(request.url);
    const mediaId = searchParams.get('mediaId');

    if (!mediaId) {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    const result = await postMediaService.removeMediaFromPost(postId, mediaId);
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
    console.error('Failed to remove media from post:', error);
    return NextResponse.json(
      { error: 'Failed to remove media from post' },
      { status: 500 }
    );
  }
}
