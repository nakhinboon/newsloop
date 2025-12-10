/**
 * News Types Module
 * 
 * Defines TypeScript interfaces for external news data structures.
 * 
 * @requirements 1.2
 */

/**
 * News source information
 */
export interface NewsSource {
  /** Source identifier (may be null for some sources) */
  id: string | null;
  /** Display name of the news source */
  name: string;
}

/**
 * News article from external API
 */
export interface NewsArticle {
  /** Unique identifier (generated from URL hash) */
  id: string;
  /** Article title */
  title: string;
  /** Article description/excerpt (may be null) */
  description: string | null;
  /** Full article content (may be null or truncated) */
  content: string | null;
  /** Original article URL */
  url: string;
  /** Thumbnail image URL (may be null) */
  imageUrl: string | null;
  /** News source information */
  source: NewsSource;
  /** Publication date */
  publishedAt: Date;
  /** Category if available */
  category?: string;
}

/**
 * News category definition
 */
export interface NewsCategory {
  /** Category identifier */
  id: string;
  /** Display name */
  name: string;
  /** URL-friendly slug */
  slug: string;
}

/**
 * Predefined news categories
 */
export const NEWS_CATEGORY_LIST: NewsCategory[] = [
  { id: 'general', name: 'General', slug: 'general' },
  { id: 'business', name: 'Business', slug: 'business' },
  { id: 'technology', name: 'Technology', slug: 'technology' },
  { id: 'entertainment', name: 'Entertainment', slug: 'entertainment' },
  { id: 'health', name: 'Health', slug: 'health' },
  { id: 'science', name: 'Science', slug: 'science' },
  { id: 'sports', name: 'Sports', slug: 'sports' },
];

/**
 * Query options for fetching news
 */
export interface NewsQueryOptions {
  /** Page number (1-indexed) */
  page?: number;
  /** Number of articles per page */
  pageSize?: number;
  /** Locale for news content (required) */
  locale: string;
  /** Filter by category */
  category?: string;
  /** Search query */
  query?: string;
}

/**
 * Paginated news response
 */
export interface NewsResponse {
  /** List of news articles */
  articles: NewsArticle[];
  /** Total number of results available */
  totalResults: number;
  /** Current page number */
  page: number;
  /** Page size used */
  pageSize: number;
  /** Total number of pages */
  totalPages: number;
}

/**
 * Raw article from NewsAPI response
 */
export interface RawNewsArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

/**
 * Raw response from NewsAPI
 */
export interface RawNewsAPIResponse {
  status: string;
  totalResults: number;
  articles: RawNewsArticle[];
  code?: string;
  message?: string;
}

/**
 * Parameters for top headlines endpoint
 */
export interface HeadlinesParams {
  /** Country code (e.g., 'us', 'gb') */
  country?: string;
  /** News category */
  category?: string;
  /** Number of results per page */
  pageSize?: number;
  /** Page number */
  page?: number;
}

/**
 * Parameters for everything endpoint
 */
export interface EverythingParams {
  /** Search query (required) */
  q: string;
  /** Language code (e.g., 'en', 'es') */
  language?: string;
  /** Number of results per page */
  pageSize?: number;
  /** Page number */
  page?: number;
}

/**
 * News API error response
 */
export interface NewsAPIError {
  status: 'error';
  code: string;
  message: string;
}

/**
 * Check if response is an error
 */
export function isNewsAPIError(response: unknown): response is NewsAPIError {
  return (
    typeof response === 'object' &&
    response !== null &&
    'status' in response &&
    (response as NewsAPIError).status === 'error'
  );
}
