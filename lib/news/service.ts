/**
 * News Service Module
 *
 * Provides high-level news operations with caching support.
 * Orchestrates between the API client and cache layer.
 *
 * @requirements 1.1, 2.1, 3.1, 7.1, 7.3
 */

import { NewsAPIClient, NewsAPIClientError, createNewsAPIClient } from './client';
import { newsCache, generateCacheKey } from './cache';
import { getNewsConfig, isSupportedNewsLocale, getNewsFallbackLocale } from '@/lib/config/news';
import type {
  NewsArticle,
  NewsCategory,
  NewsQueryOptions,
  NewsResponse,
} from './types';
import { NEWS_CATEGORY_LIST } from './types';

/**
 * Sort articles by publication date (newest first)
 * @requirements 1.1
 */
export function sortArticlesByDate(articles: NewsArticle[]): NewsArticle[] {
  return [...articles].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()
  );
}

/**
 * Calculate pagination metadata
 */
function calculatePagination(
  totalResults: number,
  page: number,
  pageSize: number
): { totalPages: number; currentPage: number } {
  const totalPages = Math.ceil(totalResults / pageSize);
  const currentPage = Math.min(page, totalPages || 1);
  return { totalPages, currentPage };
}

/**
 * Resolve locale for API requests
 * Falls back to English for unsupported locales
 * @requirements 7.1, 7.3
 */
export function resolveLocale(locale: string): string {
  if (isSupportedNewsLocale(locale)) {
    return locale;
  }
  return getNewsFallbackLocale();
}

/**
 * Check if a search query is empty or whitespace-only
 * @requirements 3.2
 */
export function isEmptyQuery(query: string | undefined): boolean {
  return !query || query.trim().length === 0;
}

/**
 * News Service
 *
 * High-level service for fetching news with caching support.
 * Handles locale resolution, caching, and error recovery.
 */
export class NewsService {
  private readonly client: NewsAPIClient;
  private readonly config: ReturnType<typeof getNewsConfig>;

  constructor(client?: NewsAPIClient) {
    this.client = client ?? createNewsAPIClient();
    this.config = getNewsConfig();
  }

  /**
   * Check if the news service is available
   */
  isAvailable(): boolean {
    return this.client.isEnabled();
  }

  /**
   * Get news articles with caching
   *
   * @param options - Query options including locale, pagination
   * @returns Paginated news response
   * @requirements 1.1, 7.1, 7.3
   */
  async getNews(options: NewsQueryOptions): Promise<NewsResponse> {
    const {
      page = 1,
      pageSize = this.config.defaultPageSize,
      locale,
      category,
      query,
    } = options;

    // Resolve locale with fallback
    const resolvedLocale = resolveLocale(locale);
    const resolvedOptions: NewsQueryOptions = {
      ...options,
      locale: resolvedLocale,
      page,
      pageSize,
    };

    // Check cache first
    const cached = await newsCache.get(resolvedOptions);
    if (cached) {
      return cached;
    }

    // Determine which API method to use
    let response: NewsResponse;

    if (!isEmptyQuery(query)) {
      // Use search endpoint for queries
      response = await this.fetchSearchResults(resolvedOptions);
    } else if (category) {
      // Use headlines endpoint with category
      response = await this.fetchHeadlines(resolvedOptions);
    } else {
      // Use headlines endpoint without category
      response = await this.fetchHeadlines(resolvedOptions);
    }

    // Cache the response
    await newsCache.set(resolvedOptions, response);

    return response;
  }

  /**
   * Get news by category
   *
   * @param category - Category to filter by
   * @param options - Additional query options
   * @returns Paginated news response filtered by category
   * @requirements 2.1
   */
  async getNewsByCategory(
    category: string,
    options?: Omit<NewsQueryOptions, 'category'>
  ): Promise<NewsResponse> {
    const locale = options?.locale ?? 'en';
    return this.getNews({
      ...options,
      locale,
      category,
    });
  }

  /**
   * Search news articles
   *
   * @param query - Search query
   * @param options - Additional query options
   * @returns Paginated news response matching the query
   * @requirements 3.1, 3.2
   */
  async searchNews(
    query: string,
    options?: Omit<NewsQueryOptions, 'query'>
  ): Promise<NewsResponse> {
    const locale = options?.locale ?? 'en';

    // If query is empty/whitespace, return all news
    if (isEmptyQuery(query)) {
      return this.getNews({
        ...options,
        locale,
        query: undefined,
      });
    }

    return this.getNews({
      ...options,
      locale,
      query: query.trim(),
    });
  }

  /**
   * Get available news categories
   */
  getCategories(): NewsCategory[] {
    return NEWS_CATEGORY_LIST;
  }

  /**
   * Fetch headlines from API
   */
  private async fetchHeadlines(options: NewsQueryOptions): Promise<NewsResponse> {
    const { page = 1, pageSize = this.config.defaultPageSize, locale, category } = options;

    try {
      const result = await this.client.fetchTopHeadlines(
        {
          category,
          page,
          pageSize,
        },
        locale
      );

      // Sort articles by date (newest first)
      const sortedArticles = sortArticlesByDate(result.articles);
      const { totalPages, currentPage } = calculatePagination(
        result.totalResults,
        page,
        pageSize
      );

      return {
        articles: sortedArticles,
        totalResults: result.totalResults,
        page: currentPage,
        pageSize,
        totalPages,
      };
    } catch (error) {
      // Handle rate limiting - try to serve stale cache
      if (error instanceof NewsAPIClientError && error.isRateLimited()) {
        const staleCache = await this.getStaleCache(options);
        if (staleCache) {
          console.warn('Serving stale cache due to rate limiting');
          return staleCache;
        }
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Fetch search results from API
   */
  private async fetchSearchResults(options: NewsQueryOptions): Promise<NewsResponse> {
    const {
      page = 1,
      pageSize = this.config.defaultPageSize,
      locale,
      query,
    } = options;

    if (!query || query.trim().length === 0) {
      // Return empty results for empty queries
      return {
        articles: [],
        totalResults: 0,
        page: 1,
        pageSize,
        totalPages: 0,
      };
    }

    try {
      const result = await this.client.fetchEverything(
        {
          q: query.trim(),
          page,
          pageSize,
        },
        locale
      );

      // Sort articles by date (newest first)
      const sortedArticles = sortArticlesByDate(result.articles);
      const { totalPages, currentPage } = calculatePagination(
        result.totalResults,
        page,
        pageSize
      );

      return {
        articles: sortedArticles,
        totalResults: result.totalResults,
        page: currentPage,
        pageSize,
        totalPages,
      };
    } catch (error) {
      // Handle rate limiting - try to serve stale cache
      if (error instanceof NewsAPIClientError && error.isRateLimited()) {
        const staleCache = await this.getStaleCache(options);
        if (staleCache) {
          console.warn('Serving stale cache due to rate limiting');
          return staleCache;
        }
      }

      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Attempt to get stale cache data for fallback
   */
  private async getStaleCache(options: NewsQueryOptions): Promise<NewsResponse | null> {
    // Try to get any cached data (even if expired, Redis might still have it)
    const key = generateCacheKey(options);
    return newsCache.getByKey(key);
  }
}

/**
 * Create a new NewsService instance
 */
export function createNewsService(client?: NewsAPIClient): NewsService {
  return new NewsService(client);
}

/**
 * Default news service instance
 */
let defaultNewsService: NewsService | null = null;

/**
 * Get the default news service instance (singleton)
 */
export function getNewsService(): NewsService {
  if (!defaultNewsService) {
    defaultNewsService = createNewsService();
  }
  return defaultNewsService;
}

export default NewsService;
