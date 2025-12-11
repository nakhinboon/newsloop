import { NextRequest, NextResponse } from 'next/server';
import { verifyEditorRole } from '@/lib/auth/roles';
import { mediaService } from '@/lib/admin/media';
import { logActivity } from '@/lib/admin/logger';
import { ensureUserExists } from '@/lib/admin/users';
import { applyRateLimit } from '@/lib/security/rate-limit';
import { validateMethod, createUnauthorizedResponse, createForbiddenResponse } from '@/lib/security/headers';

const ALLOWED_METHODS = ['POST'] as const;

/**
 * POST /api/admin/media/upload
 * Upload media file
 * Requirements: 4.1, 5.4 - Rate limiting applied (UPLOAD config), method validation
 */
export async function POST(request: NextRequest) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;
  try {
    // Apply stricter rate limiting for uploads
    const rateLimitResult = await applyRateLimit(request, 'UPLOAD');
    if (rateLimitResult) {
      return rateLimitResult.response;
    }

    const user = await verifyEditorRole();
    await ensureUserExists(user);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folderId = formData.get('folderId') as string | null;

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const result = await mediaService.uploadImage(
      buffer,
      file.name,
      file.type,
      user.id,
      '/blog',
      folderId || undefined
    );

    await logActivity({
      action: 'UPLOAD_MEDIA',
      entityType: 'MEDIA',
      entityId: result.id,
      userId: user.id,
      details: { filename: file.name, size: file.size, mimeType: file.type }
    });

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
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed' },
      { status: 500 }
    );
  }
}
