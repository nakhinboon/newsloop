import { NextRequest, NextResponse } from 'next/server';
import { verifyEditorRole } from '@/lib/auth/roles';
import { folderService } from '@/lib/admin/folders';
import { validateMethod, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/security/headers';
import {
  folderSchema,
  validateBody,
  formatValidationError,
} from '@/lib/security/api-schemas';

const ALLOWED_METHODS = ['GET', 'POST'] as const;

/**
 * GET /api/admin/media/folders - List all folders
 * Requirements: 1.1, 1.2, 5.1, 5.4, 7.2 - Role verification, method validation, consistent auth error messages
 */
export async function GET(request: NextRequest) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;
  try {
    // Verify editor role - Requirements: 1.1, 1.2, 1.4
    await verifyEditorRole();

    const folders = await folderService.getFolders();
    return NextResponse.json(folders);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Authentication required') {
        return createUnauthorizedResponse();
      }
      if (error.message === 'Editor role required') {
        return createForbiddenResponse();
      }
    }
    console.error('Failed to get folders:', error);
    return NextResponse.json(
      { error: 'Failed to get folders' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/media/folders - Create a new folder
 * Requirements: 1.1, 1.2, 5.1, 5.4, 5.5, 7.2, 8.1 - Role verification, method validation, consistent auth error messages, Zod validation
 */
export async function POST(request: NextRequest) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;

  try {
    // Verify editor role - Requirements: 1.1, 1.2, 1.4
    await verifyEditorRole();

    const body = await request.json();

    // Validate input with Zod schema - Requirements: 8.1
    const validation = validateBody(body, folderSchema);
    if (!validation.success) {
      return NextResponse.json(formatValidationError(validation), { status: 400 });
    }

    const { name } = validation.data!;
    const folder = await folderService.createFolder(name);
    return NextResponse.json(folder, { status: 201 });
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
    }
    console.error('Failed to create folder:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
