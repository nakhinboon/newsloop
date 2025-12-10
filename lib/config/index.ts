/**
 * Configuration Module Index
 * 
 * Centralized exports for all environment configuration modules.
 * Provides unified access to database, auth, cache, and media configuration.
 */

// Environment validation
export {
  REQUIRED_ENV_VARS,
  type EnvCategory,
  type ValidationResult,
  getEnvVar,
  getEnvVarOrDefault,
  getMissingVars,
  getMissingVarsForCategory,
  validateAll,
  validateAllWithDetails,
  validateCategory,
  isConfigValid,
  logValidationStatus,
} from './env';

// Database configuration
export {
  type DatabaseConfig,
  getDatabaseConfig,
  getDatabaseUrl,
  getDirectDatabaseUrl,
  isDatabaseConfigValid,
  isValidPostgresUrl,
} from './database';

// Auth configuration
export {
  type AuthConfig,
  getAuthConfig,
  getClerkPublishableKey,
  getClerkSecretKey,
  isAuthConfigValid,
  isValidPublishableKey,
  isValidSecretKey,
  isTestMode,
} from './auth';

// Cache configuration
export {
  type CacheConfig,
  getCacheConfig,
  getRedisUrl,
  getRedisToken,
  isCacheConfigValid,
  isValidRedisUrl,
  isValidRedisToken,
} from './cache';

// Media configuration
export {
  type MediaConfig,
  getMediaConfig,
  getImageKitPublicKey,
  getImageKitPrivateKey,
  getImageKitUrlEndpoint,
  isMediaConfigValid,
  isValidPublicKey,
  isValidPrivateKey,
  isValidUrlEndpoint,
} from './media';

// News configuration
export {
  type NewsConfig,
  type NewsCategoryId,
  type NewsLocale,
  NEWS_CATEGORIES,
  NEWS_SUPPORTED_LOCALES,
  getNewsConfig,
  getNewsApiKey,
  getNewsApiUrl,
  isNewsEnabled,
  isNewsConfigValid,
  isValidNewsApiKey,
  isValidNewsApiUrl,
  isSupportedCategory,
  isSupportedNewsLocale,
  getNewsFallbackLocale,
} from './news';

/**
 * Combined environment configuration interface
 */
export interface EnvConfig {
  database: import('./database').DatabaseConfig;
  auth: import('./auth').AuthConfig;
  cache: import('./cache').CacheConfig;
  media: import('./media').MediaConfig;
}

/**
 * Get complete environment configuration
 * Validates and returns all configuration modules
 */
export function getEnvConfig(): EnvConfig {
  return {
    database: getDatabaseConfig(),
    auth: getAuthConfig(),
    cache: getCacheConfig(),
    media: getMediaConfig(),
  };
}

// Import functions for getEnvConfig
import { getDatabaseConfig } from './database';
import { getAuthConfig } from './auth';
import { getCacheConfig } from './cache';
import { getMediaConfig } from './media';
