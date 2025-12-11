import { NextRequest, NextResponse } from 'next/server';
import { verifyEditorRole } from '@/lib/auth/roles';
import { mediaService } from '@/lib/admin/media';
import { logActivity } from '@/lib/admin/logger';
import { ensureUserExists } from '@/lib/admin/users';
import { validateMethod, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/security/headers';

const ALLOWED_METHODS = ['GET', 'PATCH', 'DELETE'] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/media/[id] - Get a single media item
 * Requirements: 5.4, 7.2 - Method validation, consistent auth error messages
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;
  try {
    const user = await verifyEditorRole();
    await ensureUserExists(user);
    
    const { id } = await params;
    const media = await mediaService.getMediaById(id);

    if (!media) {
      return NextResponse.json(
        { error: 'Media not found' },
        { status: 404 }
      );
    }

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
    return NextResponse.json(
      { error: 'Failed to get media' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/media/[id] - Update media (rename)
 * Requirements: 5.4, 7.2 - Method validation, consistent auth error messages
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;

  try {
    const user = await verifyEditorRole();
    await ensureUserExists(user);
    
    const { id } = await params;
    const body = await request.json();
    const { filename } = body;

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json(
        { error: 'Filename is required' },
        { status: 400 }
      );
    }

    const media = await mediaService.renameMedia(id, filename.trim());

    await logActivity({
      action: 'RENAME_MEDIA',
      entityType: 'MEDIA',
      entityId: id,
      userId: user.id,
      details: { filename }
    });

    return NextResponse.json(media);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Editor role required') {
        return createForbiddenResponse();
      }
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    return NextResponse.json(
      { error: 'Failed to rename media' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/media/[id] - Delete a media item
 * Requirements: 5.4, 7.2 - Method validation, consistent auth error messages
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;

  try {
    const user = await verifyEditorRole();
    await ensureUserExists(user);
    
    const { id } = await params;
    
    // Check for force delete query param
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    await mediaService.deleteMedia(id, force);

    await logActivity({
      action: 'DELETE_MEDIA',
      entityType: 'MEDIA',
      entityId: id,
      userId: user.id,
      details: { force }
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
    return NextResponse.json(
      { error: 'Failed to delete media' },
      { status: 500 }
    );
  }
}
