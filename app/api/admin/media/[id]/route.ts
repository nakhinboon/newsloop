import { NextRequest, NextResponse } from 'next/server';
import { verifyEditorRole } from '@/lib/auth/roles';
import { mediaService } from '@/lib/admin/media';
import { logActivity } from '@/lib/admin/logger';
import { ensureUserExists } from '@/lib/admin/users';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await verifyEditorRole();
    await ensureUserExists(user);
    
    const { id } = await params;
    const media = await mediaService.getMediaById(id);

    if (!media) {
      return NextResponse.json(
        { message: 'Media not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(media);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to get media' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to delete media' },
      { status: 500 }
    );
  }
}
