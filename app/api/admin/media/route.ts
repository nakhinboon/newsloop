import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { mediaService } from '@/lib/admin/media';

/**
 * GET /api/admin/media - List media with pagination, search, and folder filter
 * Requirements: 4.2, 4.4, 5.3
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const search = searchParams.get('search');
    const folderId = searchParams.get('folderId');

    let result;
    
    if (search) {
      result = await mediaService.searchMedia(
        search,
        page,
        pageSize,
        folderId === 'null' ? null : folderId || undefined
      );
    } else {
      result = await mediaService.getAllMedia(
        page,
        pageSize,
        folderId === 'null' ? null : folderId || undefined
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to get media:', error);
    return NextResponse.json(
      { error: 'Failed to get media' },
      { status: 500 }
    );
  }
}
