import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/admin/analytics';

export async function POST(request: NextRequest) {
  try {
    const { postId } = await request.json();

    if (!postId) {
      return NextResponse.json(
        { message: 'Post ID is required' },
        { status: 400 }
      );
    }

    await analyticsService.recordPageView(postId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to record page view:', error);
    return NextResponse.json(
      { message: 'Failed to record view' },
      { status: 500 }
    );
  }
}
