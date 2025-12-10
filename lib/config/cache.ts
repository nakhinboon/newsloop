/**
 * Cache Configuration Module
 * 
 * Reads and validates Upstash Redis environment variables.
 * Exports configuration for Redis client.
 * 
 * @requirements 19.3, 19.8
 */

import { getEnvVar } from './env';

/**
 * Cache configuration interface
 */
export interface CacheConfig {
  /** Upstash Redis REST URL */
  redisUrl: string;
  /** Upstash Redis REST token */
  redisToken: string;
}

/**
 * Validate Upstash Redis URL format
 * Should be a valid HTTPS URL ending with upstash.io
 */
export function isValidRedisUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('upstash.io');
  } catch {
    return false;
  }
}

/**
 * Validate Upstash Redis token format
 * Tokens are base64-like strings, typically starting with 'A'
 */
export function isValidRedisToken(token: string): boolean {
  // Upstash tokens are non-empty strings with reasonable length
  return token.length >= 20;
}

/**
 * Get cache configuration from environment variables
 * Validates URL format and token presence
 */
export function getCacheConfig(): CacheConfig {
  const redisUrl = getEnvVar('UPSTASH_REDIS_REST_URL');
  const redisToken = getEnvVar('UPSTASH_REDIS_REST_TOKEN');
  
  // Validate URL format
  if (!isValidRedisUrl(redisUrl)) {
    throw new Error(
      `Invalid Upstash Redis URL format. ` +
      `Expected HTTPS URL ending with 'upstash.io'. ` +
      `Received: ${redisUrl}`
    );
  }
  
  // Validate token
  if (!isValidRedisToken(redisToken)) {
    throw new Error(
      `Invalid Upstash Redis token. ` +
      `Token appears to be too short or malformed.`
    );
  }
  
  return {
    redisUrl,
    redisToken,
  };
}

/**
 * Get Upstash Redis REST URL
 */
export function getRedisUrl(): string {
  const url = getEnvVar('UPSTASH_REDIS_REST_URL');
  if (!isValidRedisUrl(url)) {
    throw new Error('Invalid Upstash Redis URL format');
  }
  return url;
}

/**
 * Get Upstash Redis REST token
 */
export function getRedisToken(): string {
  const token = getEnvVar('UPSTASH_REDIS_REST_TOKEN');
  if (!isValidRedisToken(token)) {
    throw new Error('Invalid Upstash Redis token');
  }
  return token;
}

/**
 * Check if cache configuration is valid
 * Returns false if any required variables are missing or invalid
 */
export function isCacheConfigValid(): boolean {
  try {
    getCacheConfig();
    return true;
  } catch {
    return false;
  }
}
