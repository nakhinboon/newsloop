/**
 * News Module Barrel Export
 *
 * Exports all types and services for the external news feed feature.
 *
 * @requirements 1.2
 */

// Types
export type {
  NewsSource,
  NewsArticle,
  NewsCategory,
  NewsQueryOptions,
  NewsResponse,
  RawNewsArticle,
  RawNewsAPIResponse,
  HeadlinesParams,
  EverythingParams,
  NewsAPIError,
} from './types';

export { NEWS_CATEGORY_LIST, isNewsAPIError } from './types';

// Client
export {
  NewsAPIClient,
  NewsAPIClientError,
  NEWS_API_ERROR_CODES,
  createNewsAPIClient,
  generateArticleId,
  transformRawArticle,
  transformRawArticles,
} from './client';

// Cache
export {
  newsCache,
  generateCacheKey,
  parseCacheKey,
  NEWS_CACHE_PREFIX,
  DEFAULT_NEWS_CACHE_TTL,
} from './cache';

// Service
export {
  NewsService,
  createNewsService,
  getNewsService,
  sortArticlesByDate,
  resolveLocale,
  isEmptyQuery,
} from './service';
