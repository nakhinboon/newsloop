import cacheService, { CACHE_KEYS, CACHE_TTL, redis } from './redis';

/**
 * Analytics caching service with Redis buffering
 * View counts are buffered in Redis and periodically flushed to the database
 */
export const analyticsCache = {
  /**
   * Increment page view count in Redis buffer
   * Returns the new count
   */
  async incrementPageView(postId: string): Promise<number> {
    const key = `${CACHE_KEYS.PAGE_VIEWS}:${postId}`;
    return cacheService.incr(key);
  },

  /**
   * Get buffered page view count for a post
   */
  async getBufferedViews(postId: string): Promise<number> {
    const key = `${CACHE_KEYS.PAGE_VIEWS}:${postId}`;
    const count = await cacheService.get<number>(key);
    return count ?? 0;
  },

  /**
   * Get all buffered view counts
   * Returns a map of postId -> view count
   */
  async getAllBufferedViews(): Promise<Map<string, number>> {
    const pattern = `${CACHE_KEYS.PAGE_VIEWS}:*`;
    const keys = await redis.keys(pattern);
    const viewsMap = new Map<string, number>();

    if (keys.length === 0) {
      return viewsMap;
    }

    const values = await redis.mget<number[]>(...keys);
    
    keys.forEach((key, index) => {
      const postId = key.replace(`${CACHE_KEYS.PAGE_VIEWS}:`, '');
      const count = values[index] ?? 0;
      if (count > 0) {
        viewsMap.set(postId, count);
      }
    });

    return viewsMap;
  },

  /**
   * Clear buffered views for a post after flushing to database
   */
  async clearBufferedViews(postId: string): Promise<void> {
    const key = `${CACHE_KEYS.PAGE_VIEWS}:${postId}`;
    await cacheService.del(key);
  },


  /**
   * Clear all buffered views after flushing to database
   */
  async clearAllBufferedViews(): Promise<void> {
    await cacheService.invalidatePattern(`${CACHE_KEYS.PAGE_VIEWS}:*`);
  },

  /**
   * Get cached dashboard stats
   */
  async getCachedDashboardStats(): Promise<DashboardStats | null> {
    return cacheService.get<DashboardStats>(`${CACHE_KEYS.ANALYTICS}:dashboard`);
  },

  /**
   * Set cached dashboard stats
   */
  async setCachedDashboardStats(stats: DashboardStats): Promise<void> {
    await cacheService.set(`${CACHE_KEYS.ANALYTICS}:dashboard`, stats, CACHE_TTL.ANALYTICS);
  },

  /**
   * Invalidate dashboard stats cache
   */
  async invalidateDashboardStats(): Promise<void> {
    await cacheService.del(`${CACHE_KEYS.ANALYTICS}:dashboard`);
  },

  /**
   * Get cached post analytics
   */
  async getCachedPostAnalytics(postId: string): Promise<PostAnalytics | null> {
    return cacheService.get<PostAnalytics>(`${CACHE_KEYS.ANALYTICS}:post:${postId}`);
  },

  /**
   * Set cached post analytics
   */
  async setCachedPostAnalytics(postId: string, analytics: PostAnalytics): Promise<void> {
    await cacheService.set(`${CACHE_KEYS.ANALYTICS}:post:${postId}`, analytics, CACHE_TTL.ANALYTICS);
  },

  /**
   * Invalidate post analytics cache
   */
  async invalidatePostAnalytics(postId: string): Promise<void> {
    await cacheService.del(`${CACHE_KEYS.ANALYTICS}:post:${postId}`);
  },
};

// Types for analytics data
export interface DashboardStats {
  totalPosts: number;
  publishedPosts: number;
  draftPosts: number;
  scheduledPosts: number;
  totalViews: number;
  viewsThisWeek: number;
  viewsToday: number;
  popularPosts: Array<{
    id: string;
    title: string;
    slug: string;
    viewCount: number;
  }>;
}

export interface PostAnalytics {
  postId: string;
  totalViews: number;
  viewsByDate: Array<{
    date: string;
    views: number;
  }>;
}

export default analyticsCache;
