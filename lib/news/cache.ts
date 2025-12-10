/**
 * News Cache Service
 *
 * Provides caching layer for external news API responses using Upstash Redis.
 * Implements cache key generation, TTL management, and cache invalidation.
 *
 * @requirements 5.1, 5.2, 5.3
 */

import cacheService from '@/lib/cache/redis';
import { getNewsConfig } from '@/lib/config/news';
import type { NewsQueryOptions, NewsResponse } from './types';

/** Cache key prefix for news data */
export const NEWS_CACHE_PREFIX = 'news';

/** Default cache TTL in seconds (5 minutes) */
export const DEFAULT_NEWS_CACHE_TTL = 300;

/**
 * Generate a cache key based on query options
 *
 * Format: news:{locale}:{category}:{query}:{page}:{pageSize}
 *
 * @param options - Query options to generate key from
 * @returns Cache key string
 */
export function generateCacheKey(options: NewsQueryOptions): string {
  const {
    locale,
    category = '',
    query = '',
    page = 1,
    pageSize = getNewsConfig().defaultPageSize,
  } = options;

  // Normalize query to lowercase for consistent caching
  const normalizedQuery = query.trim().toLowerCase();

  return `${NEWS_CACHE_PREFIX}:${locale}:${category}:${normalizedQuery}:${page}:${pageSize}`;
}

/**
 * Parse a cache key back into query options
 *
 * @param key - Cache key to parse
 * @returns Parsed query options or null if invalid
 */
export function parseCacheKey(key: string): NewsQueryOptions | null {
  const parts = key.split(':');
  if (parts.length !== 6 || parts[0] !== NEWS_CACHE_PREFIX) {
    return null;
  }

  const [, locale, category, query, pageStr, pageSizeStr] = parts;
  const page = parseInt(pageStr, 10);
  const pageSize = parseInt(pageSizeStr, 10);

  if (isNaN(page) || isNaN(pageSize)) {
    return null;
  }

  return {
    locale,
    category: category || undefined,
    query: query || undefined,
    page,
    pageSize,
  };
}


/**
 * Serialized news response for cache storage
 * Dates are stored as ISO strings
 */
interface CachedNewsResponse {
  articles: Array<{
    id: string;
    title: string;
    description: string | null;
    content: string | null;
    url: string;
    imageUrl: string | null;
    source: { id: string | null; name: string };
    publishedAt: string; // ISO string
    category?: string;
  }>;
  totalResults: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Serialize NewsResponse for cache storage
 * Converts Date objects to ISO strings
 */
function serializeNewsResponse(response: NewsResponse): CachedNewsResponse {
  return {
    ...response,
    articles: response.articles.map((article) => ({
      ...article,
      publishedAt: article.publishedAt.toISOString(),
    })),
  };
}

/**
 * Deserialize cached response back to NewsResponse
 * Converts ISO strings back to Date objects
 */
function deserializeNewsResponse(cached: CachedNewsResponse): NewsResponse {
  return {
    ...cached,
    articles: cached.articles.map((article) => ({
      ...article,
      publishedAt: new Date(article.publishedAt),
    })),
  };
}

/**
 * News Cache Service
 *
 * Provides methods for caching and retrieving news data from Redis.
 */
export const newsCache = {
  /**
   * Get cached news response
   *
   * @param options - Query options to look up
   * @returns Cached response or null if not found/expired
   */
  async get(options: NewsQueryOptions): Promise<NewsResponse | null> {
    try {
      const key = generateCacheKey(options);
      const cached = await cacheService.get<CachedNewsResponse>(key);

      if (!cached) {
        return null;
      }

      return deserializeNewsResponse(cached);
    } catch (error) {
      console.error('News cache get error:', error);
      return null;
    }
  },

  /**
   * Get cached news response by key
   *
   * @param key - Cache key
   * @returns Cached response or null if not found/expired
   */
  async getByKey(key: string): Promise<NewsResponse | null> {
    try {
      const cached = await cacheService.get<CachedNewsResponse>(key);

      if (!cached) {
        return null;
      }

      return deserializeNewsResponse(cached);
    } catch (error) {
      console.error('News cache getByKey error:', error);
      return null;
    }
  },

  /**
   * Store news response in cache
   *
   * @param options - Query options used to generate key
   * @param response - News response to cache
   * @param ttlSeconds - Optional TTL override (defaults to config value)
   */
  async set(
    options: NewsQueryOptions,
    response: NewsResponse,
    ttlSeconds?: number
  ): Promise<void> {
    try {
      const key = generateCacheKey(options);
      const ttl = ttlSeconds ?? getNewsConfig().cacheTTL;
      const serialized = serializeNewsResponse(response);

      await cacheService.set(key, serialized, ttl);
    } catch (error) {
      console.error('News cache set error:', error);
    }
  },

  /**
   * Store news response in cache by key
   *
   * @param key - Cache key
   * @param response - News response to cache
   * @param ttlSeconds - Optional TTL override (defaults to config value)
   */
  async setByKey(
    key: string,
    response: NewsResponse,
    ttlSeconds?: number
  ): Promise<void> {
    try {
      const ttl = ttlSeconds ?? getNewsConfig().cacheTTL;
      const serialized = serializeNewsResponse(response);

      await cacheService.set(key, serialized, ttl);
    } catch (error) {
      console.error('News cache setByKey error:', error);
    }
  },

  /**
   * Invalidate cache entries matching a pattern
   *
   * @param pattern - Pattern to match (e.g., 'news:en:*' for all English news)
   */
  async invalidate(pattern: string): Promise<void> {
    try {
      await cacheService.invalidatePattern(pattern);
    } catch (error) {
      console.error('News cache invalidate error:', error);
    }
  },

  /**
   * Invalidate all news cache entries for a locale
   *
   * @param locale - Locale to invalidate
   */
  async invalidateLocale(locale: string): Promise<void> {
    await this.invalidate(`${NEWS_CACHE_PREFIX}:${locale}:*`);
  },

  /**
   * Invalidate all news cache entries for a category
   *
   * @param category - Category to invalidate
   */
  async invalidateCategory(category: string): Promise<void> {
    await this.invalidate(`${NEWS_CACHE_PREFIX}:*:${category}:*`);
  },

  /**
   * Invalidate all news cache entries
   */
  async invalidateAll(): Promise<void> {
    await this.invalidate(`${NEWS_CACHE_PREFIX}:*`);
  },

  /**
   * Generate a cache key from query options
   * Exposed for external use (e.g., testing)
   */
  generateKey: generateCacheKey,
};

export default newsCache;
