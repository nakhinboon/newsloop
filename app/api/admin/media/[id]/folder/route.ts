import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { mediaService } from '@/lib/admin/media';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/admin/media/[id]/folder - Move media to a different folder
 * Requirements: 5.4
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { folderId } = body;

    // folderId can be null to remove from folder
    if (folderId !== null && folderId !== undefined && typeof folderId !== 'string') {
      return NextResponse.json(
        { error: 'Invalid folder ID' },
        { status: 400 }
      );
    }

    const media = await mediaService.moveMediaToFolder(id, folderId ?? null);
    return NextResponse.json(media);
  } catch (error) {
    if (error instanceof Error) {
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
