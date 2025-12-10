import cacheService, { CACHE_KEYS, CACHE_TTL } from './redis';
import type { Post, PostStatus } from '@/lib/generated/prisma';

// Type for cached post data
type CachedPost = Omit<Post, 'createdAt' | 'updatedAt' | 'publishedAt' | 'scheduledAt'> & {
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  scheduledAt: string | null;
};

/**
 * Post caching service
 */
export const postCache = {
  /**
   * Generic get from cache
   */
  async get<T>(key: string): Promise<T | null> {
    return cacheService.get<T>(key);
  },

  /**
   * Generic set to cache
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await cacheService.set(key, value, ttlSeconds);
  },

  /**
   * Get cached posts list for a locale
   */
  async getCachedPosts(locale: string, status?: PostStatus): Promise<CachedPost[] | null> {
    const key = `${CACHE_KEYS.POSTS_LIST}:${locale}${status ? `:${status}` : ''}`;
    return cacheService.get<CachedPost[]>(key);
  },

  /**
   * Set cached posts list for a locale
   */
  async setCachedPosts(locale: string, posts: Post[], status?: PostStatus): Promise<void> {
    const key = `${CACHE_KEYS.POSTS_LIST}:${locale}${status ? `:${status}` : ''}`;
    // Convert dates to strings for JSON serialization
    const serializedPosts = posts.map(post => ({
      ...post,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      publishedAt: post.publishedAt?.toISOString() ?? null,
      scheduledAt: post.scheduledAt?.toISOString() ?? null,
    }));
    await cacheService.set(key, serializedPosts, CACHE_TTL.POSTS_LIST);
  },

  /**
   * Get a single cached post
   */
  async getCachedPost(slug: string, locale: string): Promise<CachedPost | null> {
    const key = `${CACHE_KEYS.POST}:${slug}:${locale}`;
    return cacheService.get<CachedPost>(key);
  },

  /**
   * Set a single cached post
   */
  async setCachedPost(post: Post): Promise<void> {
    const key = `${CACHE_KEYS.POST}:${post.slug}:${post.locale}`;
    const serializedPost = {
      ...post,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      publishedAt: post.publishedAt?.toISOString() ?? null,
      scheduledAt: post.scheduledAt?.toISOString() ?? null,
    };
    await cacheService.set(key, serializedPost, CACHE_TTL.POST);
  },


  /**
   * Invalidate cache for a specific post
   */
  async invalidatePost(slug: string, locale?: string): Promise<void> {
    if (locale) {
      // Invalidate specific locale version
      await cacheService.del(`${CACHE_KEYS.POST}:${slug}:${locale}`);
    } else {
      // Invalidate all locale versions of this post
      await cacheService.invalidatePattern(`${CACHE_KEYS.POST}:${slug}:*`);
    }
    // Also invalidate list caches as they may contain this post
    await cacheService.invalidatePattern(`${CACHE_KEYS.POSTS_LIST}:*`);
  },

  /**
   * Invalidate all post caches
   */
  async invalidateAllPosts(): Promise<void> {
    await cacheService.invalidatePattern(`${CACHE_KEYS.POST}:*`);
    await cacheService.invalidatePattern(`${CACHE_KEYS.POSTS_LIST}:*`);
  },

  /**
   * Get cached categories
   */
  async getCachedCategories(): Promise<{ id: string; name: string; slug: string; postCount: number }[] | null> {
    return cacheService.get(`${CACHE_KEYS.CATEGORIES}`);
  },

  /**
   * Set cached categories
   */
  async setCachedCategories(categories: { id: string; name: string; slug: string; postCount: number }[]): Promise<void> {
    await cacheService.set(CACHE_KEYS.CATEGORIES, categories, CACHE_TTL.CATEGORIES);
  },

  /**
   * Invalidate categories cache
   */
  async invalidateCategories(): Promise<void> {
    await cacheService.del(CACHE_KEYS.CATEGORIES);
  },

  /**
   * Get cached tags
   */
  async getCachedTags(): Promise<{ id: string; name: string; slug: string; postCount: number }[] | null> {
    return cacheService.get(`${CACHE_KEYS.TAGS}`);
  },

  /**
   * Set cached tags
   */
  async setCachedTags(tags: { id: string; name: string; slug: string; postCount: number }[]): Promise<void> {
    await cacheService.set(CACHE_KEYS.TAGS, tags, CACHE_TTL.TAGS);
  },

  /**
   * Invalidate tags cache
   */
  async invalidateTags(): Promise<void> {
    await cacheService.del(CACHE_KEYS.TAGS);
  },
};

export default postCache;
