import { NextRequest, NextResponse } from 'next/server';
import { verifyEditorRole } from '@/lib/auth/roles';
import { folderService } from '@/lib/admin/folders';
import { validateMethod, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/security/headers';

const ALLOWED_METHODS = ['GET', 'PATCH', 'DELETE'] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/media/folders/[id] - Get a single folder
 * Requirements: 1.1, 1.2, 5.4, 7.2 - Role verification, method validation, consistent auth error messages
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;
  try {
    // Verify editor role - Requirements: 1.1, 1.2, 1.4
    await verifyEditorRole();

    const { id } = await params;
    const folder = await folderService.getFolderById(id);

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json(folder);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Editor role required') {
        return createForbiddenResponse();
      }
    }
    console.error('Failed to get folder:', error);
    return NextResponse.json(
      { error: 'Failed to get folder' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/media/folders/[id] - Update folder name
 * Requirements: 1.1, 1.2, 5.4, 7.2, 8.1 - Role verification, method validation, consistent auth error messages, Zod validation
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;

  try {
    // Verify editor role - Requirements: 1.1, 1.2, 1.4
    await verifyEditorRole();

    const { id } = await params;
    const body = await request.json();

    // Validate input with Zod schema - Requirements: 8.1
    const { folderSchema, validateBody, formatValidationError } = await import('@/lib/security/api-schemas');
    const validation = validateBody(body, folderSchema);
    if (!validation.success) {
      return NextResponse.json(formatValidationError(validation), { status: 400 });
    }

    const { name } = validation.data!;
    const folder = await folderService.updateFolder(id, name);
    return NextResponse.json(folder);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Editor role required') {
        return createForbiddenResponse();
      }
      if (error.message.includes('already exists')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    console.error('Failed to update folder:', error);
    return NextResponse.json(
      { error: 'Failed to update folder' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/media/folders/[id] - Delete a folder
 * Requirements: 1.1, 1.2, 5.1, 5.4, 7.2 - Role verification, method validation, consistent auth error messages
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;

  try {
    // Verify editor role - Requirements: 1.1, 1.2, 1.4
    await verifyEditorRole();

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const force = searchParams.get('force') === 'true';

    await folderService.deleteFolder(id, force);
    return NextResponse.json({ success: true });
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
      if (error.message.includes('Cannot delete')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    console.error('Failed to delete folder:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
