/**
 * Property-Based Tests for Environment Variable Validation
 *
 * **Feature: advanced-web-blog, Property 30: Environment variable validation**
 * **Validates: Requirements 19.5**
 *
 * Property: For any required environment variable that is missing or empty,
 * the system SHALL throw a descriptive error identifying the missing variable
 * and prevent initialization.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  REQUIRED_ENV_VARS,
  getEnvVar,
  getMissingVars,
  validateAll,
  validateCategory,
  isConfigValid,
  type EnvCategory,
} from './env';

// Store original env to restore after tests
const originalEnv = { ...process.env };

// Helper to clear all required env vars
function clearAllRequiredEnvVars() {
  const allVars = Object.values(REQUIRED_ENV_VARS).flat();
  for (const varName of allVars) {
    delete process.env[varName];
  }
}

// Helper to set all required env vars with valid values
function setAllRequiredEnvVars() {
  process.env.DATABASE_URL = 'postgresql://user:pass@host:5432/db';
  process.env.DIRECT_URL = 'postgresql://user:pass@host:5432/db';
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_abc123';
  process.env.CLERK_SECRET_KEY = 'sk_test_abc123';
  process.env.UPSTASH_REDIS_REST_URL = 'https://redis.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token123';
  process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY = 'public_key_123';
  process.env.IMAGEKIT_PRIVATE_KEY = 'private_key_123';
  process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/test';
}

describe('Property 30: Environment variable validation', () => {
  beforeEach(() => {
    // Start with a clean slate
    clearAllRequiredEnvVars();
  });

  afterEach(() => {
    // Restore original environment
    process.env = { ...originalEnv };
  });

  /**
   * Property: For any required environment variable that is missing,
   * getEnvVar SHALL throw an error identifying the missing variable.
   */
  it('getEnvVar throws descriptive error for any missing required variable', () => {
    // Get all required variable names
    const allRequiredVars = Object.values(REQUIRED_ENV_VARS).flat();

    fc.assert(
      fc.property(
        fc.constantFrom(...allRequiredVars),
        (varName: string) => {
          // Ensure the variable is not set
          delete process.env[varName];

          // Attempting to get the variable should throw
          expect(() => getEnvVar(varName)).toThrow();

          // The error message should identify the missing variable
          try {
            getEnvVar(varName);
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toContain(varName);
            expect((error as Error).message.toLowerCase()).toContain('missing');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any required environment variable set to empty string or whitespace,
   * getEnvVar SHALL throw an error (empty/whitespace is treated as missing).
   */
  it('getEnvVar throws for any variable set to empty or whitespace', () => {
    const allRequiredVars = Object.values(REQUIRED_ENV_VARS).flat();
    const emptyValues = fc.constantFrom('', ' ', '  ', '\t', '\n', '   \t\n  ');

    fc.assert(
      fc.property(
        fc.constantFrom(...allRequiredVars),
        emptyValues,
        (varName: string, emptyValue: string) => {
          // Set the variable to an empty/whitespace value
          process.env[varName] = emptyValue;

          // Attempting to get the variable should throw
          expect(() => getEnvVar(varName)).toThrow();

          // The error message should identify the missing variable
          try {
            getEnvVar(varName);
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toContain(varName);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any subset of required variables that are missing,
   * getMissingVars SHALL return exactly those missing variables.
   */
  it('getMissingVars returns exactly the missing variables', () => {
    const allRequiredVars = Object.values(REQUIRED_ENV_VARS).flat();

    fc.assert(
      fc.property(
        // Generate a random subset of variables to set (the rest will be missing)
        fc.subarray(allRequiredVars, { minLength: 0, maxLength: allRequiredVars.length }),
        (varsToSet: string[]) => {
          // Clear all vars first
          clearAllRequiredEnvVars();

          // Set only the selected variables
          for (const varName of varsToSet) {
            process.env[varName] = 'valid_value_123';
          }

          // Get missing vars
          const missing = getMissingVars();

          // The missing vars should be exactly those not in varsToSet
          const expectedMissing = allRequiredVars.filter((v) => !varsToSet.includes(v));

          expect(missing.sort()).toEqual(expectedMissing.sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: When any required variable is missing, validateAll SHALL throw
   * an error that lists all missing variables.
   */
  it('validateAll throws error listing all missing variables', () => {
    const allRequiredVars = Object.values(REQUIRED_ENV_VARS).flat();

    fc.assert(
      fc.property(
        // Generate a non-empty subset of variables to leave missing
        fc.subarray(allRequiredVars, { minLength: 1, maxLength: allRequiredVars.length }),
        (varsToLeaveOut: string[]) => {
          // Set all vars first
          setAllRequiredEnvVars();

          // Then remove the selected ones
          for (const varName of varsToLeaveOut) {
            delete process.env[varName];
          }

          // validateAll should throw
          expect(() => validateAll()).toThrow();

          // The error should mention all missing variables
          try {
            validateAll();
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
            const errorMessage = (error as Error).message;

            // Each missing variable should be mentioned in the error
            for (const missingVar of varsToLeaveOut) {
              expect(errorMessage).toContain(missingVar);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: When all required variables are set, validateAll SHALL NOT throw.
   */
  it('validateAll does not throw when all variables are set', () => {
    setAllRequiredEnvVars();
    expect(() => validateAll()).not.toThrow();
  });

  /**
   * Property: isConfigValid returns false when any variable is missing,
   * true when all are set.
   */
  it('isConfigValid correctly reflects configuration state', () => {
    const allRequiredVars = Object.values(REQUIRED_ENV_VARS).flat();

    fc.assert(
      fc.property(
        fc.subarray(allRequiredVars, { minLength: 0, maxLength: allRequiredVars.length }),
        (varsToSet: string[]) => {
          clearAllRequiredEnvVars();

          for (const varName of varsToSet) {
            process.env[varName] = 'valid_value_123';
          }

          const allSet = varsToSet.length === allRequiredVars.length;
          expect(isConfigValid()).toBe(allSet);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any category, validateCategory returns valid:false
   * when any variable in that category is missing.
   */
  it('validateCategory correctly validates each category', () => {
    const categories = Object.keys(REQUIRED_ENV_VARS) as EnvCategory[];

    fc.assert(
      fc.property(
        fc.constantFrom(...categories),
        (category: EnvCategory) => {
          // Set all vars first
          setAllRequiredEnvVars();

          // Validate should pass
          let result = validateCategory(category);
          expect(result.valid).toBe(true);
          expect(result.missing).toHaveLength(0);

          // Now remove one var from this category
          const categoryVars = REQUIRED_ENV_VARS[category];
          const varToRemove = categoryVars[0];
          delete process.env[varToRemove];

          // Validate should fail and identify the missing var
          result = validateCategory(category);
          expect(result.valid).toBe(false);
          expect(result.missing).toContain(varToRemove);
          expect(result.category).toBe(category);
        }
      ),
      { numRuns: 100 }
    );
  });
});
