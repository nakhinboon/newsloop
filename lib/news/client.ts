/**
 * NewsAPI Client Module
 *
 * Handles communication with the external NewsAPI.org service.
 * Implements fetching headlines and search, error handling, and rate limit management.
 *
 * @requirements 4.1, 4.2, 4.3, 8.1
 */

import { getNewsConfig, isSupportedNewsLocale, getNewsFallbackLocale } from '@/lib/config/news';
import type {
  NewsArticle,
  RawNewsAPIResponse,
  RawNewsArticle,
  HeadlinesParams,
  EverythingParams,
} from './types';
import { isNewsAPIError } from './types';

/**
 * Error codes from NewsAPI
 */
export const NEWS_API_ERROR_CODES = {
  API_KEY_INVALID: 'apiKeyInvalid',
  API_KEY_EXHAUSTED: 'apiKeyExhausted',
  API_KEY_MISSING: 'apiKeyMissing',
  API_KEY_DISABLED: 'apiKeyDisabled',
  PARAMETERS_MISSING: 'parametersMissing',
  PARAMETERS_INCOMPATIBLE: 'parametersIncompatible',
  RATE_LIMITED: 'rateLimited',
  SOURCES_TOO_MANY: 'sourcesTooMany',
  SOURCE_DOES_NOT_EXIST: 'sourceDoesNotExist',
  UNEXPECTED_ERROR: 'unexpectedError',
} as const;

/**
 * Custom error class for NewsAPI errors
 */
export class NewsAPIClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly retryAfter?: number
  ) {
    super(message);
    this.name = 'NewsAPIClientError';
  }

  /**
   * Check if this is a rate limit error
   */
  isRateLimited(): boolean {
    return (
      this.code === NEWS_API_ERROR_CODES.RATE_LIMITED ||
      this.code === NEWS_API_ERROR_CODES.API_KEY_EXHAUSTED ||
      this.statusCode === 429
    );
  }

  /**
   * Check if this is an authentication error
   */
  isAuthError(): boolean {
    return (
      this.code === NEWS_API_ERROR_CODES.API_KEY_INVALID ||
      this.code === NEWS_API_ERROR_CODES.API_KEY_MISSING ||
      this.code === NEWS_API_ERROR_CODES.API_KEY_DISABLED ||
      this.statusCode === 401
    );
  }
}


/**
 * Generate a unique ID from article URL
 * Uses a simple hash function for consistent ID generation
 */
export function generateArticleId(url: string): string {
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    const char = url.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Transform raw NewsAPI article to our NewsArticle format
 */
export function transformRawArticle(
  raw: RawNewsArticle,
  category?: string
): NewsArticle {
  return {
    id: generateArticleId(raw.url),
    title: raw.title,
    description: raw.description,
    content: raw.content,
    url: raw.url,
    imageUrl: raw.urlToImage,
    source: {
      id: raw.source.id,
      name: raw.source.name,
    },
    publishedAt: new Date(raw.publishedAt),
    category,
  };
}

/**
 * Transform array of raw articles
 */
export function transformRawArticles(
  articles: RawNewsArticle[],
  category?: string
): NewsArticle[] {
  return articles
    .filter((article) => article.title && article.url) // Filter out invalid articles
    .map((article) => transformRawArticle(article, category));
}

/**
 * Map locale to NewsAPI country code for headlines
 * NewsAPI uses country codes for top-headlines endpoint
 */
function localeToCountry(locale: string): string {
  const mapping: Record<string, string> = {
    en: 'us',
    es: 'mx', // Mexico for Spanish
    fr: 'fr',
    th: 'th',
  };
  return mapping[locale] || 'us';
}

/**
 * Map locale to NewsAPI language code for everything endpoint
 */
function localeToLanguage(locale: string): string {
  // NewsAPI supports: ar, de, en, es, fr, he, it, nl, no, pt, ru, sv, ud, zh
  const supported = ['en', 'es', 'fr'];
  if (supported.includes(locale)) {
    return locale;
  }
  // Thai is not supported, fallback to English
  return getNewsFallbackLocale();
}


/**
 * NewsAPI Client
 *
 * Handles all communication with the NewsAPI.org service.
 * Supports fetching top headlines by category and searching all articles.
 */
export class NewsAPIClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly enabled: boolean;

  constructor() {
    const config = getNewsConfig();
    this.apiKey = config.apiKey;
    this.baseUrl = config.apiBaseUrl;
    this.enabled = config.enabled;
  }

  /**
   * Check if the client is enabled and configured
   */
  isEnabled(): boolean {
    return this.enabled && this.apiKey.length > 0;
  }

  /**
   * Make a request to the NewsAPI
   */
  private async request<T>(
    endpoint: string,
    params: Record<string, string | number | undefined>
  ): Promise<T> {
    if (!this.isEnabled()) {
      throw new NewsAPIClientError(
        'News API is not configured. Set NEWS_API_KEY environment variable.',
        NEWS_API_ERROR_CODES.API_KEY_MISSING
      );
    }

    // Build URL with query parameters
    const url = new URL(`${this.baseUrl}${endpoint}`);
    url.searchParams.set('apiKey', this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      // Extract retry-after header for rate limiting
      const retryAfter = response.headers.get('Retry-After');
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : undefined;

      const data = await response.json();

      // Handle error responses
      if (!response.ok || isNewsAPIError(data)) {
        const errorCode = data.code || NEWS_API_ERROR_CODES.UNEXPECTED_ERROR;
        const errorMessage = data.message || `HTTP ${response.status}`;

        throw new NewsAPIClientError(
          errorMessage,
          errorCode,
          response.status,
          retryAfterSeconds
        );
      }

      return data as T;
    } catch (error) {
      // Re-throw NewsAPIClientError
      if (error instanceof NewsAPIClientError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new NewsAPIClientError(
          'Network error: Unable to reach News API',
          NEWS_API_ERROR_CODES.UNEXPECTED_ERROR
        );
      }

      // Handle other errors
      throw new NewsAPIClientError(
        error instanceof Error ? error.message : 'Unknown error',
        NEWS_API_ERROR_CODES.UNEXPECTED_ERROR
      );
    }
  }


  /**
   * Fetch top headlines by category
   *
   * Uses the /top-headlines endpoint which requires a country parameter.
   * Optionally filters by category.
   *
   * @param params - Headlines parameters
   * @param locale - Locale for country selection
   * @returns Transformed news articles
   */
  async fetchTopHeadlines(
    params: HeadlinesParams,
    locale: string = 'en'
  ): Promise<{ articles: NewsArticle[]; totalResults: number }> {
    // Determine country from locale
    const country = params.country || localeToCountry(
      isSupportedNewsLocale(locale) ? locale : getNewsFallbackLocale()
    );

    const response = await this.request<RawNewsAPIResponse>('/top-headlines', {
      country,
      category: params.category,
      pageSize: params.pageSize,
      page: params.page,
    });

    return {
      articles: transformRawArticles(response.articles, params.category),
      totalResults: response.totalResults,
    };
  }

  /**
   * Search all articles
   *
   * Uses the /everything endpoint which supports full-text search.
   * Requires a search query.
   *
   * @param params - Search parameters
   * @param locale - Locale for language selection
   * @returns Transformed news articles
   */
  async fetchEverything(
    params: EverythingParams,
    locale: string = 'en'
  ): Promise<{ articles: NewsArticle[]; totalResults: number }> {
    // Determine language from locale
    const language = params.language || localeToLanguage(
      isSupportedNewsLocale(locale) ? locale : getNewsFallbackLocale()
    );

    const response = await this.request<RawNewsAPIResponse>('/everything', {
      q: params.q,
      language,
      pageSize: params.pageSize,
      page: params.page,
      sortBy: 'publishedAt', // Always sort by date
    });

    return {
      articles: transformRawArticles(response.articles),
      totalResults: response.totalResults,
    };
  }
}

/**
 * Create a new NewsAPI client instance
 */
export function createNewsAPIClient(): NewsAPIClient {
  return new NewsAPIClient();
}
