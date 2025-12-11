import { NextRequest, NextResponse } from 'next/server';
import { analyticsService } from '@/lib/admin/analytics';
import { adminPostService } from '@/lib/admin/posts';
import { validateMethod } from '@/lib/security/headers';

// Vercel Cron secret for authentication
const CRON_SECRET = process.env.CRON_SECRET;

const ALLOWED_METHODS = ['GET'] as const;

/**
 * GET /api/cron - Process scheduled tasks
 * Requirements: 5.4 - Method validation
 */
export async function GET(request: NextRequest) {
  // Validate HTTP method - Requirements: 5.4
  const methodError = validateMethod(request, [...ALLOWED_METHODS]);
  if (methodError) return methodError;
  // Verify cron secret if configured
  if (CRON_SECRET) {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    // Flush buffered page views to database
    const flushedViews = await analyticsService.flushViewsToDB();

    // Process scheduled posts
    const publishedPosts = await adminPostService.processScheduledPosts();

    return NextResponse.json({
      success: true,
      flushedViews,
      publishedPosts,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
