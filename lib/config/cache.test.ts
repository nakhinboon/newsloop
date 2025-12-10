/**
 * Property-Based Tests for Cache Configuration
 *
 * **Feature: advanced-web-blog, Property 33: Cache configuration from environment**
 * **Validates: Requirements 19.3, 19.8**
 *
 * Property: For any valid Upstash Redis environment variables, the Redis client SHALL be
 * configured with those credentials and all cache operations SHALL use the real Upstash service.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  getCacheConfig,
  getRedisUrl,
  getRedisToken,
  isValidRedisUrl,
  isValidRedisToken,
  isCacheConfigValid,
} from './cache';

// Store original env to restore after tests
const originalEnv = { ...process.env };

// Helper to clear cache env vars
function clearCacheEnvVars() {
  delete process.env.UPSTASH_REDIS_REST_URL;
  delete process.env.UPSTASH_REDIS_REST_TOKEN;
}

// Arbitrary for generating valid Upstash Redis URLs
const validRedisUrlArb = fc
  .record({
    subdomain: fc.stringMatching(/^[a-z][a-z0-9-]{5,20}$/),
    region: fc.constantFrom('us1', 'eu1', 'ap1', 'global'),
  })
  .map(
    ({ subdomain, region }) =>
      `https://${subdomain}-${region}.upstash.io`
  );

// Arbitrary for generating valid Upstash Redis tokens (base64-like, 20+ chars)
const validRedisTokenArb = fc
  .stringMatching(/^[A-Za-z][A-Za-z0-9+/=]{24,60}$/)
  .filter((token) => token.length >= 20);

// Arbitrary for generating invalid URLs (not Upstash format)
const invalidUrlArb = fc.oneof(
  fc.constant(''),
  fc.constant('http://redis.upstash.io'), // http instead of https
  fc.constant('https://redis.example.com'), // wrong domain
  fc.constant('https://localhost:6379'),
  fc.constant('redis://user:pass@host:6379'),
  fc.constant('not-a-url'),
  fc.stringMatching(/^[a-z]{3,10}:\/\/[a-z]+$/)
);

// Arbitrary for generating invalid tokens (too short)
const invalidTokenArb = fc.oneof(
  fc.constant(''),
  fc.stringMatching(/^[a-zA-Z0-9]{1,19}$/), // too short (< 20 chars)
  fc.constant('short')
);

describe('Property 33: Cache configuration from environment', () => {
  beforeEach(() => {
    clearCacheEnvVars();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  /**
   * Property: For any valid Upstash Redis URL (HTTPS ending with upstash.io),
   * isValidRedisUrl SHALL return true.
   */
  it('isValidRedisUrl returns true for valid Upstash URLs', () => {
    fc.assert(
      fc.property(validRedisUrlArb, (url: string) => {
        expect(isValidRedisUrl(url)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any invalid URL (non-Upstash format),
   * isValidRedisUrl SHALL return false.
   */
  it('isValidRedisUrl returns false for invalid URLs', () => {
    fc.assert(
      fc.property(invalidUrlArb, (url: string) => {
        expect(isValidRedisUrl(url)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid Upstash Redis token (20+ characters),
   * isValidRedisToken SHALL return true.
   */
  it('isValidRedisToken returns true for valid tokens', () => {
    fc.assert(
      fc.property(validRedisTokenArb, (token: string) => {
        expect(isValidRedisToken(token)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any invalid token (too short),
   * isValidRedisToken SHALL return false.
   */
  it('isValidRedisToken returns false for invalid tokens', () => {
    fc.assert(
      fc.property(invalidTokenArb, (token: string) => {
        expect(isValidRedisToken(token)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN,
   * getCacheConfig SHALL return a config object with those exact credentials.
   */
  it('getCacheConfig returns exact credentials from environment', () => {
    fc.assert(
      fc.property(
        validRedisUrlArb,
        validRedisTokenArb,
        (redisUrl: string, redisToken: string) => {
          // Set environment variables
          process.env.UPSTASH_REDIS_REST_URL = redisUrl;
          process.env.UPSTASH_REDIS_REST_TOKEN = redisToken;

          // Get configuration
          const config = getCacheConfig();

          // Config should contain exact values from environment
          expect(config.redisUrl).toBe(redisUrl);
          expect(config.redisToken).toBe(redisToken);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid Redis URL, getRedisUrl SHALL return that exact string.
   */
  it('getRedisUrl returns exact URL from environment', () => {
    fc.assert(
      fc.property(validRedisUrlArb, validRedisTokenArb, (redisUrl: string, redisToken: string) => {
        process.env.UPSTASH_REDIS_REST_URL = redisUrl;
        process.env.UPSTASH_REDIS_REST_TOKEN = redisToken;

        const url = getRedisUrl();
        expect(url).toBe(redisUrl);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid Redis token, getRedisToken SHALL return that exact string.
   */
  it('getRedisToken returns exact token from environment', () => {
    fc.assert(
      fc.property(validRedisUrlArb, validRedisTokenArb, (redisUrl: string, redisToken: string) => {
        process.env.UPSTASH_REDIS_REST_URL = redisUrl;
        process.env.UPSTASH_REDIS_REST_TOKEN = redisToken;

        const token = getRedisToken();
        expect(token).toBe(redisToken);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: When UPSTASH_REDIS_REST_URL is missing, getCacheConfig SHALL throw an error.
   */
  it('getCacheConfig throws when Redis URL is missing', () => {
    process.env.UPSTASH_REDIS_REST_TOKEN = 'AValidTokenThatIsLongEnough123456';
    // UPSTASH_REDIS_REST_URL not set

    expect(() => getCacheConfig()).toThrow();
    expect(() => getCacheConfig()).toThrow(/UPSTASH_REDIS_REST_URL/);
  });

  /**
   * Property: When UPSTASH_REDIS_REST_TOKEN is missing, getCacheConfig SHALL throw an error.
   */
  it('getCacheConfig throws when Redis token is missing', () => {
    process.env.UPSTASH_REDIS_REST_URL = 'https://test-us1.upstash.io';
    // UPSTASH_REDIS_REST_TOKEN not set

    expect(() => getCacheConfig()).toThrow();
    expect(() => getCacheConfig()).toThrow(/UPSTASH_REDIS_REST_TOKEN/);
  });

  /**
   * Property: For any invalid UPSTASH_REDIS_REST_URL format, getCacheConfig SHALL throw
   * an error indicating invalid format.
   */
  it('getCacheConfig throws for invalid Redis URL format', () => {
    fc.assert(
      fc.property(invalidUrlArb, (invalidUrl: string) => {
        // Skip empty strings as they trigger "missing" error instead
        fc.pre(invalidUrl.length > 0);

        process.env.UPSTASH_REDIS_REST_URL = invalidUrl;
        process.env.UPSTASH_REDIS_REST_TOKEN = 'AValidTokenThatIsLongEnough123456';

        expect(() => getCacheConfig()).toThrow();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any invalid UPSTASH_REDIS_REST_TOKEN format, getCacheConfig SHALL throw
   * an error indicating invalid format.
   */
  it('getCacheConfig throws for invalid Redis token format', () => {
    fc.assert(
      fc.property(invalidTokenArb, (invalidToken: string) => {
        // Skip empty strings as they trigger "missing" error instead
        fc.pre(invalidToken.length > 0);

        process.env.UPSTASH_REDIS_REST_URL = 'https://test-us1.upstash.io';
        process.env.UPSTASH_REDIS_REST_TOKEN = invalidToken;

        expect(() => getCacheConfig()).toThrow();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isCacheConfigValid returns true only when both URL and token are valid.
   */
  it('isCacheConfigValid correctly reflects configuration validity', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        validRedisUrlArb,
        validRedisTokenArb,
        (setRedisUrl: boolean, setRedisToken: boolean, url: string, token: string) => {
          clearCacheEnvVars();

          if (setRedisUrl) {
            process.env.UPSTASH_REDIS_REST_URL = url;
          }
          if (setRedisToken) {
            process.env.UPSTASH_REDIS_REST_TOKEN = token;
          }

          const expectedValid = setRedisUrl && setRedisToken;
          expect(isCacheConfigValid()).toBe(expectedValid);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Integration tests using real environment variables
 * These tests verify the cache config works with actual Upstash credentials
 */
describe('Property 33: Cache configuration with real credentials', () => {
  // Store the real env values before any tests modify them
  const realRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const realRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  beforeEach(() => {
    // Restore real env values before each test
    process.env.UPSTASH_REDIS_REST_URL = realRedisUrl;
    process.env.UPSTASH_REDIS_REST_TOKEN = realRedisToken;
  });

  it('getCacheConfig works with real Upstash credentials from .env', () => {
    // Use real credentials from .env
    const config = getCacheConfig();

    // Verify the config contains valid Upstash credentials
    expect(isValidRedisUrl(config.redisUrl)).toBe(true);
    expect(isValidRedisToken(config.redisToken)).toBe(true);

    // Verify the URL matches expected format
    expect(config.redisUrl).toMatch(/^https:\/\/.*\.upstash\.io$/);
  });

  it('isCacheConfigValid returns true with real credentials', () => {
    expect(isCacheConfigValid()).toBe(true);
  });

  it('getRedisUrl returns real URL from .env', () => {
    const url = getRedisUrl();
    expect(url).toBe(realRedisUrl);
    expect(isValidRedisUrl(url)).toBe(true);
  });

  it('getRedisToken returns real token from .env', () => {
    const token = getRedisToken();
    expect(token).toBe(realRedisToken);
    expect(isValidRedisToken(token)).toBe(true);
  });
});
