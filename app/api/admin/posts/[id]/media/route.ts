import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { postMediaService, PostMediaInput } from '@/lib/admin/post-media';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/posts/[id]/media - Get all media for a post
 * Requirements: 3.4
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await params;
    const media = await postMediaService.getPostMedia(postId);
    return NextResponse.json(media);
  } catch (error) {
    console.error('Failed to get post media:', error);
    return NextResponse.json(
      { error: 'Failed to get post media' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/posts/[id]/media - Update all media associations for a post
 * Requirements: 3.3
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await params;
    const body = await request.json();
    const { media } = body as { media: PostMediaInput[] };

    if (!Array.isArray(media)) {
      return NextResponse.json(
        { error: 'Media must be an array' },
        { status: 400 }
      );
    }

    const result = await postMediaService.setPostMedia(postId, media);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message.includes('Only one cover')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
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
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: postId } = await params;
    const body = await request.json();
    const { mediaId, isCover = false } = body;

    if (!mediaId || typeof mediaId !== 'string') {
      return NextResponse.json(
        { error: 'Media ID is required' },
        { status: 400 }
      );
    }

    const result = await postMediaService.addMediaToPost(postId, mediaId, isCover);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Failed to add media to post:', error);
    return NextResponse.json(
      { error: 'Failed to add media to post' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/posts/[id]/media - Remove a media from a post
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    console.error('Failed to remove media from post:', error);
    return NextResponse.json(
      { error: 'Failed to remove media from post' },
      { status: 500 }
    );
  }
}
