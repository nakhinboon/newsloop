import { NextRequest, NextResponse } from 'next/server';
import { verifyEditorRole } from '@/lib/auth/roles';
import { mediaService } from '@/lib/admin/media';
import { validateMethod, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/security/headers';
import {
  moveMediaToFolderSchema,
  validateBody,
  formatValidationError,
} from '@/lib/security/api-schemas';

const ALLOWED_METHODS = ['PATCH'] as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/media/[id]/folder - Move media to a different folder
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
    const validation = validateBody(body, moveMediaToFolderSchema);
    if (!validation.success) {
      return NextResponse.json(formatValidationError(validation), { status: 400 });
    }

    const { folderId } = validation.data!;
    const media = await mediaService.moveMediaToFolder(id, folderId);
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
    console.error('Failed to move media:', error);
    return NextResponse.json(
      { error: 'Failed to move media' },
      { status: 500 }
    );
  }
}
