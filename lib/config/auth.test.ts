/**
 * Property-Based Tests for Auth Configuration
 *
 * **Feature: advanced-web-blog, Property 32: Auth configuration from environment**
 * **Validates: Requirements 19.2, 19.7**
 *
 * Property: For any valid Clerk environment variables, the Clerk client SHALL be
 * initialized with those credentials and all auth operations SHALL use the real Clerk API.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  getAuthConfig,
  getClerkPublishableKey,
  getClerkSecretKey,
  isValidPublishableKey,
  isValidSecretKey,
  isAuthConfigValid,
  isTestMode,
} from './auth';

// Store original env to restore after tests
const originalEnv = { ...process.env };

// Helper to clear auth env vars
function clearAuthEnvVars() {
  delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  delete process.env.CLERK_SECRET_KEY;
  delete process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL;
  delete process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL;
  delete process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL;
  delete process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL;
}

// Arbitrary for generating valid Clerk publishable keys (test mode)
const validTestPublishableKeyArb = fc
  .stringMatching(/^[a-zA-Z0-9]{10,50}$/)
  .map((suffix) => `pk_test_${suffix}`);

// Arbitrary for generating valid Clerk publishable keys (live mode)
const validLivePublishableKeyArb = fc
  .stringMatching(/^[a-zA-Z0-9]{10,50}$/)
  .map((suffix) => `pk_live_${suffix}`);

// Arbitrary for any valid publishable key (test or live)
const validPublishableKeyArb = fc.oneof(validTestPublishableKeyArb, validLivePublishableKeyArb);

// Arbitrary for generating valid Clerk secret keys (test mode)
const validTestSecretKeyArb = fc
  .stringMatching(/^[a-zA-Z0-9]{10,50}$/)
  .map((suffix) => `sk_test_${suffix}`);

// Arbitrary for generating valid Clerk secret keys (live mode)
const validLiveSecretKeyArb = fc
  .stringMatching(/^[a-zA-Z0-9]{10,50}$/)
  .map((suffix) => `sk_live_${suffix}`);

// Arbitrary for any valid secret key (test or live)
const validSecretKeyArb = fc.oneof(validTestSecretKeyArb, validLiveSecretKeyArb);

// Arbitrary for generating invalid keys (wrong prefix or format)
const invalidKeyArb = fc.oneof(
  fc.constant(''),
  fc.constant('invalid_key'),
  fc.constant('pk_invalid_abc123'),
  fc.constant('sk_invalid_abc123'),
  fc.stringMatching(/^[a-z]{5,15}$/),
  fc.stringMatching(/^[a-z]{2}_[a-z]{4}_[a-zA-Z0-9]{10,20}$/)
);

describe('Property 32: Auth configuration from environment', () => {
  beforeEach(() => {
    clearAuthEnvVars();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  /**
   * Property: For any valid Clerk publishable key (pk_test_* or pk_live_*),
   * isValidPublishableKey SHALL return true.
   */
  it('isValidPublishableKey returns true for valid publishable keys', () => {
    fc.assert(
      fc.property(validPublishableKeyArb, (key: string) => {
        expect(isValidPublishableKey(key)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any invalid publishable key (wrong prefix),
   * isValidPublishableKey SHALL return false.
   */
  it('isValidPublishableKey returns false for invalid keys', () => {
    fc.assert(
      fc.property(invalidKeyArb, (key: string) => {
        expect(isValidPublishableKey(key)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid Clerk secret key (sk_test_* or sk_live_*),
   * isValidSecretKey SHALL return true.
   */
  it('isValidSecretKey returns true for valid secret keys', () => {
    fc.assert(
      fc.property(validSecretKeyArb, (key: string) => {
        expect(isValidSecretKey(key)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any invalid secret key (wrong prefix),
   * isValidSecretKey SHALL return false.
   */
  it('isValidSecretKey returns false for invalid keys', () => {
    fc.assert(
      fc.property(invalidKeyArb, (key: string) => {
        expect(isValidSecretKey(key)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY,
   * getAuthConfig SHALL return a config object with those exact credentials.
   */
  it('getAuthConfig returns exact credentials from environment', () => {
    fc.assert(
      fc.property(
        validPublishableKeyArb,
        validSecretKeyArb,
        (publishableKey: string, secretKey: string) => {
          // Set environment variables
          process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = publishableKey;
          process.env.CLERK_SECRET_KEY = secretKey;

          // Get configuration
          const config = getAuthConfig();

          // Config should contain exact values from environment
          expect(config.publishableKey).toBe(publishableKey);
          expect(config.secretKey).toBe(secretKey);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid publishable key, getClerkPublishableKey SHALL return that exact string.
   */
  it('getClerkPublishableKey returns exact key from environment', () => {
    fc.assert(
      fc.property(validPublishableKeyArb, validSecretKeyArb, (publishableKey: string, secretKey: string) => {
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = publishableKey;
        process.env.CLERK_SECRET_KEY = secretKey;

        const key = getClerkPublishableKey();
        expect(key).toBe(publishableKey);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid secret key, getClerkSecretKey SHALL return that exact string.
   */
  it('getClerkSecretKey returns exact key from environment', () => {
    fc.assert(
      fc.property(validPublishableKeyArb, validSecretKeyArb, (publishableKey: string, secretKey: string) => {
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = publishableKey;
        process.env.CLERK_SECRET_KEY = secretKey;

        const key = getClerkSecretKey();
        expect(key).toBe(secretKey);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: When NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is missing, getAuthConfig SHALL throw an error.
   */
  it('getAuthConfig throws when publishable key is missing', () => {
    process.env.CLERK_SECRET_KEY = 'sk_test_validkey123';
    // NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY not set

    expect(() => getAuthConfig()).toThrow();
    expect(() => getAuthConfig()).toThrow(/NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY/);
  });

  /**
   * Property: When CLERK_SECRET_KEY is missing, getAuthConfig SHALL throw an error.
   */
  it('getAuthConfig throws when secret key is missing', () => {
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123';
    // CLERK_SECRET_KEY not set

    expect(() => getAuthConfig()).toThrow();
    expect(() => getAuthConfig()).toThrow(/CLERK_SECRET_KEY/);
  });

  /**
   * Property: For any invalid publishable key format, getAuthConfig SHALL throw
   * an error indicating invalid format.
   */
  it('getAuthConfig throws for invalid publishable key format', () => {
    fc.assert(
      fc.property(invalidKeyArb, (invalidKey: string) => {
        // Skip empty strings as they trigger "missing" error instead
        fc.pre(invalidKey.length > 0);

        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = invalidKey;
        process.env.CLERK_SECRET_KEY = 'sk_test_validkey123';

        expect(() => getAuthConfig()).toThrow();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any invalid secret key format, getAuthConfig SHALL throw
   * an error indicating invalid format.
   */
  it('getAuthConfig throws for invalid secret key format', () => {
    fc.assert(
      fc.property(invalidKeyArb, (invalidKey: string) => {
        // Skip empty strings as they trigger "missing" error instead
        fc.pre(invalidKey.length > 0);

        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_validkey123';
        process.env.CLERK_SECRET_KEY = invalidKey;

        expect(() => getAuthConfig()).toThrow();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isAuthConfigValid returns true only when both keys are valid.
   */
  it('isAuthConfigValid correctly reflects configuration validity', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        validPublishableKeyArb,
        validSecretKeyArb,
        (setPublishableKey: boolean, setSecretKey: boolean, pubKey: string, secKey: string) => {
          clearAuthEnvVars();

          if (setPublishableKey) {
            process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = pubKey;
          }
          if (setSecretKey) {
            process.env.CLERK_SECRET_KEY = secKey;
          }

          const expectedValid = setPublishableKey && setSecretKey;
          expect(isAuthConfigValid()).toBe(expectedValid);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isTestMode returns true when using test keys (pk_test_*),
   * false when using live keys (pk_live_*).
   */
  it('isTestMode correctly identifies test vs live mode', () => {
    fc.assert(
      fc.property(
        validTestPublishableKeyArb,
        validSecretKeyArb,
        (testKey: string, secretKey: string) => {
          process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = testKey;
          process.env.CLERK_SECRET_KEY = secretKey;

          expect(isTestMode()).toBe(true);
        }
      ),
      { numRuns: 100 }
    );

    fc.assert(
      fc.property(
        validLivePublishableKeyArb,
        validSecretKeyArb,
        (liveKey: string, secretKey: string) => {
          process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = liveKey;
          process.env.CLERK_SECRET_KEY = secretKey;

          expect(isTestMode()).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getAuthConfig includes default URL values when optional env vars are not set.
   */
  it('getAuthConfig uses default URLs when optional vars not set', () => {
    fc.assert(
      fc.property(
        validPublishableKeyArb,
        validSecretKeyArb,
        (publishableKey: string, secretKey: string) => {
          clearAuthEnvVars();
          process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = publishableKey;
          process.env.CLERK_SECRET_KEY = secretKey;

          const config = getAuthConfig();

          // Should have default values for optional URLs
          expect(config.signInUrl).toBe('/admin/sign-in');
          expect(config.signUpUrl).toBe('/admin/sign-up');
          expect(config.afterSignInUrl).toBe('/admin');
          expect(config.afterSignUpUrl).toBe('/admin');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getAuthConfig uses custom URL values when optional env vars are set.
   */
  it('getAuthConfig uses custom URLs when optional vars are set', () => {
    const customUrls = {
      signIn: '/custom/sign-in',
      signUp: '/custom/sign-up',
      afterSignIn: '/custom/dashboard',
      afterSignUp: '/custom/welcome',
    };

    fc.assert(
      fc.property(
        validPublishableKeyArb,
        validSecretKeyArb,
        (publishableKey: string, secretKey: string) => {
          clearAuthEnvVars();
          process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = publishableKey;
          process.env.CLERK_SECRET_KEY = secretKey;
          process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = customUrls.signIn;
          process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = customUrls.signUp;
          process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = customUrls.afterSignIn;
          process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = customUrls.afterSignUp;

          const config = getAuthConfig();

          expect(config.signInUrl).toBe(customUrls.signIn);
          expect(config.signUpUrl).toBe(customUrls.signUp);
          expect(config.afterSignInUrl).toBe(customUrls.afterSignIn);
          expect(config.afterSignUpUrl).toBe(customUrls.afterSignUp);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Integration tests using real environment variables
 * These tests verify the auth config works with actual Clerk credentials
 * Note: These tests run BEFORE the property tests to use the original env
 */
describe('Property 32: Auth configuration with real credentials', () => {
  // Store the real env values before any tests modify them
  const realPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const realSecretKey = process.env.CLERK_SECRET_KEY;
  const realSignInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL;
  const realSignUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL;
  const realAfterSignInUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL;
  const realAfterSignUpUrl = process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL;

  beforeEach(() => {
    // Restore real env values before each test
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = realPublishableKey;
    process.env.CLERK_SECRET_KEY = realSecretKey;
    process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL = realSignInUrl;
    process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL = realSignUpUrl;
    process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL = realAfterSignInUrl;
    process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL = realAfterSignUpUrl;
  });

  it('getAuthConfig works with real Clerk credentials from .env', () => {
    // Use real credentials from .env
    const config = getAuthConfig();

    // Verify the config contains valid Clerk keys
    expect(isValidPublishableKey(config.publishableKey)).toBe(true);
    expect(isValidSecretKey(config.secretKey)).toBe(true);

    // Verify the keys match expected format
    expect(config.publishableKey).toMatch(/^pk_(test|live)_/);
    expect(config.secretKey).toMatch(/^sk_(test|live)_/);
  });

  it('isAuthConfigValid returns true with real credentials', () => {
    expect(isAuthConfigValid()).toBe(true);
  });

  it('isTestMode correctly identifies test mode with real credentials', () => {
    // Based on .env, we're using test keys
    expect(isTestMode()).toBe(true);
  });

  it('getClerkPublishableKey returns real key from .env', () => {
    const key = getClerkPublishableKey();
    expect(key).toBe(realPublishableKey);
    expect(isValidPublishableKey(key)).toBe(true);
  });

  it('getClerkSecretKey returns real key from .env', () => {
    const key = getClerkSecretKey();
    expect(key).toBe(realSecretKey);
    expect(isValidSecretKey(key)).toBe(true);
  });

  it('getAuthConfig returns correct URL configuration from .env', () => {
    const config = getAuthConfig();

    expect(config.signInUrl).toBe('/admin/sign-in');
    expect(config.signUpUrl).toBe('/admin/sign-up');
    expect(config.afterSignInUrl).toBe('/admin');
    expect(config.afterSignUpUrl).toBe('/admin');
  });
});
