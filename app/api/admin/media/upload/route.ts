import { NextRequest, NextResponse } from 'next/server';
import { verifyEditorRole } from '@/lib/auth/roles';
import { mediaService } from '@/lib/admin/media';
import { logActivity } from '@/lib/admin/logger';
import { ensureUserExists } from '@/lib/admin/users';

export async function POST(request: NextRequest) {
  try {
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
    console.error('Upload error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Upload failed' },
      { status: 500 }
    );
  }
}
