/**
 * Property-Based Tests for Database Configuration
 *
 * **Feature: advanced-web-blog, Property 31: Database configuration from environment**
 * **Validates: Requirements 19.1, 19.6**
 *
 * Property: For any valid DATABASE_URL and DIRECT_URL environment variables,
 * the Prisma client SHALL be configured with those exact connection strings.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  getDatabaseConfig,
  getDatabaseUrl,
  getDirectDatabaseUrl,
  isValidPostgresUrl,
  isDatabaseConfigValid,
} from './database';

// Store original env to restore after tests
const originalEnv = { ...process.env };

// Helper to clear database env vars
function clearDatabaseEnvVars() {
  delete process.env.DATABASE_URL;
  delete process.env.DIRECT_URL;
}

// Arbitrary for generating valid PostgreSQL connection URLs
const validPostgresUrlArb = fc
  .record({
    protocol: fc.constantFrom('postgresql', 'postgres'),
    user: fc.stringMatching(/^[a-z][a-z0-9_]{2,15}$/),
    password: fc.stringMatching(/^[a-zA-Z0-9]{8,20}$/),
    host: fc.stringMatching(/^[a-z][a-z0-9.-]{2,30}$/),
    port: fc.integer({ min: 1024, max: 65535 }),
    database: fc.stringMatching(/^[a-z][a-z0-9_]{2,20}$/),
  })
  .map(
    ({ protocol, user, password, host, port, database }) =>
      `${protocol}://${user}:${password}@${host}:${port}/${database}`
  );

// Arbitrary for generating invalid URLs (not PostgreSQL format)
const invalidUrlArb = fc.oneof(
  fc.constant(''),
  fc.constant('mysql://user:pass@host:3306/db'),
  fc.constant('mongodb://user:pass@host:27017/db'),
  fc.constant('http://example.com'),
  fc.constant('not-a-url'),
  fc.stringMatching(/^[a-z]{3,10}:\/\/[a-z]+$/)
);

describe('Property 31: Database configuration from environment', () => {
  beforeEach(() => {
    clearDatabaseEnvVars();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  /**
   * Property: For any valid PostgreSQL URL, isValidPostgresUrl SHALL return true.
   */
  it('isValidPostgresUrl returns true for valid PostgreSQL URLs', () => {
    fc.assert(
      fc.property(validPostgresUrlArb, (url: string) => {
        expect(isValidPostgresUrl(url)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any invalid URL (non-PostgreSQL format), isValidPostgresUrl SHALL return false.
   */
  it('isValidPostgresUrl returns false for invalid URLs', () => {
    fc.assert(
      fc.property(invalidUrlArb, (url: string) => {
        expect(isValidPostgresUrl(url)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid DATABASE_URL and DIRECT_URL environment variables,
   * getDatabaseConfig SHALL return a config object with those exact connection strings.
   */
  it('getDatabaseConfig returns exact connection strings from environment', () => {
    fc.assert(
      fc.property(
        validPostgresUrlArb,
        validPostgresUrlArb,
        (databaseUrl: string, directUrl: string) => {
          // Set environment variables
          process.env.DATABASE_URL = databaseUrl;
          process.env.DIRECT_URL = directUrl;

          // Get configuration
          const config = getDatabaseConfig();

          // Config should contain exact values from environment
          expect(config.url).toBe(databaseUrl);
          expect(config.directUrl).toBe(directUrl);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid DATABASE_URL, getDatabaseUrl SHALL return that exact string.
   */
  it('getDatabaseUrl returns exact DATABASE_URL from environment', () => {
    fc.assert(
      fc.property(validPostgresUrlArb, (databaseUrl: string) => {
        // Set environment variable (also need DIRECT_URL for full config)
        process.env.DATABASE_URL = databaseUrl;
        process.env.DIRECT_URL = 'postgresql://user:pass@host:5432/db';

        // Get URL
        const url = getDatabaseUrl();

        // Should return exact value
        expect(url).toBe(databaseUrl);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid DIRECT_URL, getDirectDatabaseUrl SHALL return that exact string.
   */
  it('getDirectDatabaseUrl returns exact DIRECT_URL from environment', () => {
    fc.assert(
      fc.property(validPostgresUrlArb, (directUrl: string) => {
        // Set environment variables
        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
        process.env.DIRECT_URL = directUrl;

        // Get URL
        const url = getDirectDatabaseUrl();

        // Should return exact value
        expect(url).toBe(directUrl);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: When DATABASE_URL is missing, getDatabaseConfig SHALL throw an error.
   */
  it('getDatabaseConfig throws when DATABASE_URL is missing', () => {
    process.env.DIRECT_URL = 'postgresql://user:pass@host:5432/db';
    // DATABASE_URL not set

    expect(() => getDatabaseConfig()).toThrow();
    expect(() => getDatabaseConfig()).toThrow(/DATABASE_URL/);
  });

  /**
   * Property: When DIRECT_URL is missing, getDatabaseConfig SHALL throw an error.
   */
  it('getDatabaseConfig throws when DIRECT_URL is missing', () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
    // DIRECT_URL not set

    expect(() => getDatabaseConfig()).toThrow();
    expect(() => getDatabaseConfig()).toThrow(/DIRECT_URL/);
  });

  /**
   * Property: For any invalid DATABASE_URL format, getDatabaseConfig SHALL throw
   * an error indicating invalid format.
   */
  it('getDatabaseConfig throws for invalid DATABASE_URL format', () => {
    fc.assert(
      fc.property(invalidUrlArb, (invalidUrl: string) => {
        // Skip empty strings as they trigger "missing" error instead
        fc.pre(invalidUrl.length > 0);

        process.env.DATABASE_URL = invalidUrl;
        process.env.DIRECT_URL = 'postgresql://user:pass@host:5432/db';

        expect(() => getDatabaseConfig()).toThrow();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any invalid DIRECT_URL format, getDatabaseConfig SHALL throw
   * an error indicating invalid format.
   */
  it('getDatabaseConfig throws for invalid DIRECT_URL format', () => {
    fc.assert(
      fc.property(invalidUrlArb, (invalidUrl: string) => {
        // Skip empty strings as they trigger "missing" error instead
        fc.pre(invalidUrl.length > 0);

        process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
        process.env.DIRECT_URL = invalidUrl;

        expect(() => getDatabaseConfig()).toThrow();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isDatabaseConfigValid returns true only when both URLs are valid.
   */
  it('isDatabaseConfigValid correctly reflects configuration validity', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        validPostgresUrlArb,
        validPostgresUrlArb,
        (setDatabaseUrl: boolean, setDirectUrl: boolean, dbUrl: string, directUrl: string) => {
          clearDatabaseEnvVars();

          if (setDatabaseUrl) {
            process.env.DATABASE_URL = dbUrl;
          }
          if (setDirectUrl) {
            process.env.DIRECT_URL = directUrl;
          }

          const expectedValid = setDatabaseUrl && setDirectUrl;
          expect(isDatabaseConfigValid()).toBe(expectedValid);
        }
      ),
      { numRuns: 100 }
    );
  });
});
