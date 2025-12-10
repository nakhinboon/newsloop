/**
 * News Configuration Module
 * 
 * Reads and validates external news API environment variables.
 * Exports configuration for News API client.
 * 
 * @requirements 4.1, 4.3
 */

import { getEnvVar, getEnvVarOrDefault } from './env';

/**
 * News configuration interface
 */
export interface NewsConfig {
  /** News API key for authentication */
  apiKey: string;
  /** News API base URL */
  apiBaseUrl: string;
  /** Whether news feature is enabled */
  enabled: boolean;
  /** Default page size for news listings */
  defaultPageSize: number;
  /** Cache TTL in seconds */
  cacheTTL: number;
  /** Supported news categories */
  supportedCategories: string[];
  /** Supported locales for news API */
  supportedLocales: string[];
}

/**
 * Supported news categories from NewsAPI
 */
export const NEWS_CATEGORIES = [
  'general',
  'business',
  'technology',
  'entertainment',
  'health',
  'science',
  'sports',
] as const;

export type NewsCategoryId = (typeof NEWS_CATEGORIES)[number];

/**
 * Supported locales for news API
 * Maps to NewsAPI language codes
 */
export const NEWS_SUPPORTED_LOCALES = ['en', 'es', 'fr', 'th'] as const;

export type NewsLocale = (typeof NEWS_SUPPORTED_LOCALES)[number];

/**
 * Default configuration values
 */
const DEFAULT_API_BASE_URL = 'https://newsapi.org/v2';
const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_CACHE_TTL = 300; // 5 minutes

/**
 * Validate News API key format
 * NewsAPI keys are 32-character hexadecimal strings
 */
export function isValidNewsApiKey(key: string): boolean {
  return key.length >= 20 && /^[a-zA-Z0-9]+$/.test(key);
}

/**
 * Validate News API URL format
 * Should be a valid HTTPS URL
 */
export function isValidNewsApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if news feature is enabled
 * Returns true if NEWS_API_KEY is set
 */
export function isNewsEnabled(): boolean {
  const apiKey = process.env.NEWS_API_KEY;
  return apiKey !== undefined && apiKey.trim() !== '';
}

/**
 * Get news configuration from environment variables
 * Returns config with enabled=false if API key is missing
 */
export function getNewsConfig(): NewsConfig {
  const apiKey = process.env.NEWS_API_KEY?.trim() ?? '';
  const apiBaseUrl = getEnvVarOrDefault('NEWS_API_URL', DEFAULT_API_BASE_URL);
  const enabled = isNewsEnabled();
  
  // Validate API key if provided
  if (enabled && !isValidNewsApiKey(apiKey)) {
    console.warn(
      `Invalid News API key format. ` +
      `Expected alphanumeric string of at least 20 characters.`
    );
  }
  
  // Validate API URL format
  if (!isValidNewsApiUrl(apiBaseUrl)) {
    throw new Error(
      `Invalid News API URL format. ` +
      `Expected HTTPS URL. ` +
      `Received: ${apiBaseUrl}`
    );
  }
  
  return {
    apiKey,
    apiBaseUrl,
    enabled,
    defaultPageSize: DEFAULT_PAGE_SIZE,
    cacheTTL: DEFAULT_CACHE_TTL,
    supportedCategories: [...NEWS_CATEGORIES],
    supportedLocales: [...NEWS_SUPPORTED_LOCALES],
  };
}

/**
 * Get News API key
 * Throws if not set
 */
export function getNewsApiKey(): string {
  const key = getEnvVar('NEWS_API_KEY');
  if (!isValidNewsApiKey(key)) {
    throw new Error('Invalid News API key format');
  }
  return key;
}

/**
 * Get News API base URL
 */
export function getNewsApiUrl(): string {
  const url = getEnvVarOrDefault('NEWS_API_URL', DEFAULT_API_BASE_URL);
  if (!isValidNewsApiUrl(url)) {
    throw new Error('Invalid News API URL format');
  }
  return url;
}

/**
 * Check if news configuration is valid
 * Returns false if API key is missing or invalid
 */
export function isNewsConfigValid(): boolean {
  try {
    const config = getNewsConfig();
    return config.enabled && isValidNewsApiKey(config.apiKey);
  } catch {
    return false;
  }
}

/**
 * Check if a category is supported
 */
export function isSupportedCategory(category: string): category is NewsCategoryId {
  return NEWS_CATEGORIES.includes(category as NewsCategoryId);
}

/**
 * Check if a locale is supported by the news API
 */
export function isSupportedNewsLocale(locale: string): locale is NewsLocale {
  return NEWS_SUPPORTED_LOCALES.includes(locale as NewsLocale);
}

/**
 * Get the fallback locale for unsupported locales
 */
export function getNewsFallbackLocale(): NewsLocale {
  return 'en';
}
