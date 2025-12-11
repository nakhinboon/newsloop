import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/admin/analytics';
import { validateMethod } from '@/lib/security/headers';

const ALLOWED_METHODS = ['POST'] as const;

/**
 * POST /api/analytics/view - Record a page view
 * Requirements: 5.4 - Method validation
 */
export async function POST(request: NextRequest) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;
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
