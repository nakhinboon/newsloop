import { Redis } from '@upstash/redis';

// Initialize Upstash Redis client
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Cache key prefixes
export const CACHE_KEYS = {
  POSTS_LIST: 'posts:list',
  POST: 'post',
  CATEGORIES: 'categories',
  TAGS: 'tags',
  PAGE_VIEWS: 'pageviews',
  ANALYTICS: 'analytics',
  NEWS: 'news',
} as const;

// Default TTL values (in seconds)
export const CACHE_TTL = {
  POSTS_LIST: 60 * 5, // 5 minutes
  POST: 60 * 10, // 10 minutes
  CATEGORIES: 60 * 30, // 30 minutes
  TAGS: 60 * 30, // 30 minutes
  ANALYTICS: 60 * 15, // 15 minutes
  NEWS: 60 * 5, // 5 minutes
} as const;

/**
 * Generic cache service for Redis operations
 */
export const cacheService = {
  /**
   * Get a value from cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get<T>(key);
      return data;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  },

  /**
   * Set a value in cache with optional TTL
   */
  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await redis.set(key, value, { ex: ttlSeconds });
      } else {
        await redis.set(key, value);
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
    }
  },


  /**
   * Delete a key from cache
   */
  async del(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  },

  /**
   * Delete all keys matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error(`Cache invalidate pattern error for ${pattern}:`, error);
    }
  },

  /**
   * Increment a counter
   */
  async incr(key: string): Promise<number> {
    try {
      return await redis.incr(key);
    } catch (error) {
      console.error(`Cache incr error for key ${key}:`, error);
      return 0;
    }
  },

  /**
   * Get multiple keys at once
   */
  async mget<T>(...keys: string[]): Promise<(T | null)[]> {
    try {
      return await redis.mget<T[]>(...keys);
    } catch (error) {
      console.error(`Cache mget error:`, error);
      return keys.map(() => null);
    }
  },
};

export { redis };
export default cacheService;
