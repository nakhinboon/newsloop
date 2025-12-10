import prisma from '@/lib/db/prisma';
import { analyticsCache, type DashboardStats } from '@/lib/cache/analytics';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface ViewStats {
  total: number;
  byDate: { date: string; views: number }[];
}

export interface PostWithViews {
  id: string;
  title: string;
  slug: string;
  viewCount: number;
}

/**
 * Analytics Service - Track and query page views
 */
export const analyticsService = {
  /**
   * Record a page view (buffered in Redis)
   */
  async recordPageView(postId: string): Promise<void> {
    await analyticsCache.incrementPageView(postId);
  },

  /**
   * Flush buffered views from Redis to database
   * Should be called by a cron job periodically
   */
  async flushViewsToDB(): Promise<number> {
    const bufferedViews = await analyticsCache.getAllBufferedViews();
    let flushedCount = 0;

    for (const [postId, count] of bufferedViews) {
      if (count > 0) {
        // Create individual page view records
        const viewRecords = Array.from({ length: count }, () => ({
          postId,
          viewedAt: new Date(),
        }));

        await prisma.pageView.createMany({
          data: viewRecords,
        });

        await analyticsCache.clearBufferedViews(postId);
        flushedCount += count;
      }
    }

    // Invalidate dashboard stats cache after flush
    await analyticsCache.invalidateDashboardStats();

    return flushedCount;
  },

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    // Try cache first
    const cached = await analyticsCache.getCachedDashboardStats();
    if (cached) return cached;

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalPosts,
      publishedPosts,
      draftPosts,
      scheduledPosts,
      totalViews,
      viewsThisWeek,
      viewsToday,
      popularPosts,
    ] = await Promise.all([
      prisma.post.count(),
      prisma.post.count({ where: { status: 'PUBLISHED' } }),
      prisma.post.count({ where: { status: 'DRAFT' } }),
      prisma.post.count({ where: { status: 'SCHEDULED' } }),
      prisma.pageView.count(),
      prisma.pageView.count({ where: { viewedAt: { gte: weekAgo } } }),
      prisma.pageView.count({ where: { viewedAt: { gte: todayStart } } }),
      this.getPopularPosts(5),
    ]);

    const stats: DashboardStats = {
      totalPosts,
      publishedPosts,
      draftPosts,
      scheduledPosts,
      totalViews,
      viewsThisWeek,
      viewsToday,
      popularPosts,
    };

    // Cache the stats
    await analyticsCache.setCachedDashboardStats(stats);

    return stats;
  },

  /**
   * Get popular posts by view count
   */
  async getPopularPosts(limit: number = 10): Promise<PostWithViews[]> {
    const posts = await prisma.post.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        slug: true,
        locale: true,
        _count: {
          select: { pageViews: true },
        },
      },
      orderBy: {
        pageViews: { _count: 'desc' },
      },
      take: limit,
    });

    return posts.map((post) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      locale: post.locale,
      viewCount: post._count.pageViews,
    }));
  },

  /**
   * Get view statistics for a specific post
   */
  async getPostViews(postId: string, dateRange?: DateRange): Promise<ViewStats> {
    // Try cache first
    const cached = await analyticsCache.getCachedPostAnalytics(postId);
    if (cached && !dateRange) {
      return {
        total: cached.totalViews,
        byDate: cached.viewsByDate,
      };
    }

    const where = {
      postId,
      ...(dateRange && {
        viewedAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      }),
    };

    const [total, viewsByDay] = await Promise.all([
      prisma.pageView.count({ where }),
      prisma.pageView.groupBy({
        by: ['viewedAt'],
        where,
        _count: true,
        orderBy: { viewedAt: 'asc' },
      }),
    ]);

    // Aggregate by date (day)
    const dateMap = new Map<string, number>();
    for (const view of viewsByDay) {
      const dateStr = view.viewedAt.toISOString().split('T')[0];
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + view._count);
    }

    const byDate = Array.from(dateMap.entries()).map(([date, views]) => ({
      date,
      views,
    }));

    const stats: ViewStats = { total, byDate };

    // Cache if no date range filter
    if (!dateRange) {
      await analyticsCache.setCachedPostAnalytics(postId, {
        postId,
        totalViews: total,
        viewsByDate: byDate,
      });
    }

    return stats;
  },

  /**
   * Get views over time for all posts
   */
  async getViewsOverTime(dateRange: DateRange): Promise<{ date: string; views: number }[]> {
    const views = await prisma.pageView.groupBy({
      by: ['viewedAt'],
      where: {
        viewedAt: {
          gte: dateRange.start,
          lte: dateRange.end,
        },
      },
      _count: true,
      orderBy: { viewedAt: 'asc' },
    });

    // Aggregate by date
    const dateMap = new Map<string, number>();
    for (const view of views) {
      const dateStr = view.viewedAt.toISOString().split('T')[0];
      dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + view._count);
    }

    return Array.from(dateMap.entries()).map(([date, views]) => ({
      date,
      views,
    }));
  },

  /**
   * Get total view count for a post (including buffered)
   */
  async getTotalViewCount(postId: string): Promise<number> {
    const [dbViews, bufferedViews] = await Promise.all([
      prisma.pageView.count({ where: { postId } }),
      analyticsCache.getBufferedViews(postId),
    ]);

    return dbViews + bufferedViews;
  },
};

export default analyticsService;
