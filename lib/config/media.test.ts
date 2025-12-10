/**
 * Property-Based Tests for Media Configuration
 *
 * **Feature: advanced-web-blog, Property 34: Media configuration from environment**
 * **Validates: Requirements 19.4, 19.9**
 *
 * Property: For any valid ImageKit environment variables, the ImageKit client SHALL be
 * configured with those credentials and all image URLs SHALL use the ImageKit CDN endpoint.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import {
  getMediaConfig,
  getImageKitPublicKey,
  getImageKitPrivateKey,
  getImageKitUrlEndpoint,
  isValidPublicKey,
  isValidPrivateKey,
  isValidUrlEndpoint,
  isMediaConfigValid,
} from './media';

// Store original env to restore after tests
const originalEnv = { ...process.env };

// Helper to clear media env vars
function clearMediaEnvVars() {
  delete process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  delete process.env.IMAGEKIT_PRIVATE_KEY;
  delete process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;
}

// Arbitrary for generating valid ImageKit public keys (start with 'public_')
const validPublicKeyArb = fc
  .stringMatching(/^[a-zA-Z0-9]{10,50}$/)
  .map((suffix) => `public_${suffix}`);

// Arbitrary for generating valid ImageKit private keys (start with 'private_')
const validPrivateKeyArb = fc
  .stringMatching(/^[a-zA-Z0-9]{10,50}$/)
  .map((suffix) => `private_${suffix}`);

// Arbitrary for generating valid ImageKit URL endpoints
const validUrlEndpointArb = fc
  .record({
    subdomain: fc.stringMatching(/^[a-z][a-z0-9]{3,15}$/),
  })
  .map(({ subdomain }) => `https://ik.imagekit.io/${subdomain}`);

// Arbitrary for generating invalid public keys (wrong prefix)
const invalidPublicKeyArb = fc.oneof(
  fc.constant(''),
  fc.constant('private_abc123'),
  fc.constant('pk_test_abc123'),
  fc.stringMatching(/^[a-z]{5,15}$/),
  fc.stringMatching(/^[a-z]{2}_[a-z]{4}_[a-zA-Z0-9]{10,20}$/)
);

// Arbitrary for generating invalid private keys (wrong prefix)
const invalidPrivateKeyArb = fc.oneof(
  fc.constant(''),
  fc.constant('public_abc123'),
  fc.constant('sk_test_abc123'),
  fc.stringMatching(/^[a-z]{5,15}$/),
  fc.stringMatching(/^[a-z]{2}_[a-z]{4}_[a-zA-Z0-9]{10,20}$/)
);


// Arbitrary for generating invalid URL endpoints (not ImageKit format)
const invalidUrlEndpointArb = fc.oneof(
  fc.constant(''),
  fc.constant('http://ik.imagekit.io/test'), // http instead of https
  fc.constant('https://example.com/images'), // wrong domain
  fc.constant('https://localhost:3000'),
  fc.constant('ftp://ik.imagekit.io/test'),
  fc.constant('not-a-url'),
  fc.stringMatching(/^[a-z]{3,10}:\/\/[a-z]+$/)
);

describe('Property 34: Media configuration from environment', () => {
  beforeEach(() => {
    clearMediaEnvVars();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  /**
   * Property: For any valid ImageKit public key (public_*),
   * isValidPublicKey SHALL return true.
   */
  it('isValidPublicKey returns true for valid public keys', () => {
    fc.assert(
      fc.property(validPublicKeyArb, (key: string) => {
        expect(isValidPublicKey(key)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any invalid public key (wrong prefix),
   * isValidPublicKey SHALL return false.
   */
  it('isValidPublicKey returns false for invalid keys', () => {
    fc.assert(
      fc.property(invalidPublicKeyArb, (key: string) => {
        expect(isValidPublicKey(key)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid ImageKit private key (private_*),
   * isValidPrivateKey SHALL return true.
   */
  it('isValidPrivateKey returns true for valid private keys', () => {
    fc.assert(
      fc.property(validPrivateKeyArb, (key: string) => {
        expect(isValidPrivateKey(key)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any invalid private key (wrong prefix),
   * isValidPrivateKey SHALL return false.
   */
  it('isValidPrivateKey returns false for invalid keys', () => {
    fc.assert(
      fc.property(invalidPrivateKeyArb, (key: string) => {
        expect(isValidPrivateKey(key)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid ImageKit URL endpoint (HTTPS with imagekit.io),
   * isValidUrlEndpoint SHALL return true.
   */
  it('isValidUrlEndpoint returns true for valid endpoints', () => {
    fc.assert(
      fc.property(validUrlEndpointArb, (url: string) => {
        expect(isValidUrlEndpoint(url)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any invalid URL endpoint (non-ImageKit format),
   * isValidUrlEndpoint SHALL return false.
   */
  it('isValidUrlEndpoint returns false for invalid endpoints', () => {
    fc.assert(
      fc.property(invalidUrlEndpointArb, (url: string) => {
        expect(isValidUrlEndpoint(url)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid ImageKit environment variables,
   * getMediaConfig SHALL return a config object with those exact credentials.
   */
  it('getMediaConfig returns exact credentials from environment', () => {
    fc.assert(
      fc.property(
        validPublicKeyArb,
        validPrivateKeyArb,
        validUrlEndpointArb,
        (publicKey: string, privateKey: string, urlEndpoint: string) => {
          // Set environment variables
          process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY = publicKey;
          process.env.IMAGEKIT_PRIVATE_KEY = privateKey;
          process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT = urlEndpoint;

          // Get configuration
          const config = getMediaConfig();

          // Config should contain exact values from environment
          expect(config.publicKey).toBe(publicKey);
          expect(config.privateKey).toBe(privateKey);
          expect(config.urlEndpoint).toBe(urlEndpoint);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid public key, getImageKitPublicKey SHALL return that exact string.
   */
  it('getImageKitPublicKey returns exact key from environment', () => {
    fc.assert(
      fc.property(
        validPublicKeyArb,
        validPrivateKeyArb,
        validUrlEndpointArb,
        (publicKey: string, privateKey: string, urlEndpoint: string) => {
          process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY = publicKey;
          process.env.IMAGEKIT_PRIVATE_KEY = privateKey;
          process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT = urlEndpoint;

          const key = getImageKitPublicKey();
          expect(key).toBe(publicKey);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid private key, getImageKitPrivateKey SHALL return that exact string.
   */
  it('getImageKitPrivateKey returns exact key from environment', () => {
    fc.assert(
      fc.property(
        validPublicKeyArb,
        validPrivateKeyArb,
        validUrlEndpointArb,
        (publicKey: string, privateKey: string, urlEndpoint: string) => {
          process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY = publicKey;
          process.env.IMAGEKIT_PRIVATE_KEY = privateKey;
          process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT = urlEndpoint;

          const key = getImageKitPrivateKey();
          expect(key).toBe(privateKey);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid URL endpoint, getImageKitUrlEndpoint SHALL return that exact string.
   */
  it('getImageKitUrlEndpoint returns exact endpoint from environment', () => {
    fc.assert(
      fc.property(
        validPublicKeyArb,
        validPrivateKeyArb,
        validUrlEndpointArb,
        (publicKey: string, privateKey: string, urlEndpoint: string) => {
          process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY = publicKey;
          process.env.IMAGEKIT_PRIVATE_KEY = privateKey;
          process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT = urlEndpoint;

          const endpoint = getImageKitUrlEndpoint();
          expect(endpoint).toBe(urlEndpoint);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: When NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY is missing, getMediaConfig SHALL throw an error.
   */
  it('getMediaConfig throws when public key is missing', () => {
    process.env.IMAGEKIT_PRIVATE_KEY = 'private_validkey123';
    process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/test';
    // NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY not set

    expect(() => getMediaConfig()).toThrow();
    expect(() => getMediaConfig()).toThrow(/NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY/);
  });

  /**
   * Property: When IMAGEKIT_PRIVATE_KEY is missing, getMediaConfig SHALL throw an error.
   */
  it('getMediaConfig throws when private key is missing', () => {
    process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY = 'public_validkey123';
    process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/test';
    // IMAGEKIT_PRIVATE_KEY not set

    expect(() => getMediaConfig()).toThrow();
    expect(() => getMediaConfig()).toThrow(/IMAGEKIT_PRIVATE_KEY/);
  });

  /**
   * Property: When NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT is missing, getMediaConfig SHALL throw an error.
   */
  it('getMediaConfig throws when URL endpoint is missing', () => {
    process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY = 'public_validkey123';
    process.env.IMAGEKIT_PRIVATE_KEY = 'private_validkey123';
    // NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT not set

    expect(() => getMediaConfig()).toThrow();
    expect(() => getMediaConfig()).toThrow(/NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT/);
  });

  /**
   * Property: For any invalid public key format, getMediaConfig SHALL throw
   * an error indicating invalid format.
   */
  it('getMediaConfig throws for invalid public key format', () => {
    fc.assert(
      fc.property(invalidPublicKeyArb, (invalidKey: string) => {
        // Skip empty strings as they trigger "missing" error instead
        fc.pre(invalidKey.length > 0);

        process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY = invalidKey;
        process.env.IMAGEKIT_PRIVATE_KEY = 'private_validkey123';
        process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/test';

        expect(() => getMediaConfig()).toThrow();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any invalid private key format, getMediaConfig SHALL throw
   * an error indicating invalid format.
   */
  it('getMediaConfig throws for invalid private key format', () => {
    fc.assert(
      fc.property(invalidPrivateKeyArb, (invalidKey: string) => {
        // Skip empty strings as they trigger "missing" error instead
        fc.pre(invalidKey.length > 0);

        process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY = 'public_validkey123';
        process.env.IMAGEKIT_PRIVATE_KEY = invalidKey;
        process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT = 'https://ik.imagekit.io/test';

        expect(() => getMediaConfig()).toThrow();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any invalid URL endpoint format, getMediaConfig SHALL throw
   * an error indicating invalid format.
   */
  it('getMediaConfig throws for invalid URL endpoint format', () => {
    fc.assert(
      fc.property(invalidUrlEndpointArb, (invalidUrl: string) => {
        // Skip empty strings as they trigger "missing" error instead
        fc.pre(invalidUrl.length > 0);

        process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY = 'public_validkey123';
        process.env.IMAGEKIT_PRIVATE_KEY = 'private_validkey123';
        process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT = invalidUrl;

        expect(() => getMediaConfig()).toThrow();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isMediaConfigValid returns true only when all credentials are valid.
   */
  it('isMediaConfigValid correctly reflects configuration validity', () => {
    fc.assert(
      fc.property(
        fc.boolean(),
        fc.boolean(),
        fc.boolean(),
        validPublicKeyArb,
        validPrivateKeyArb,
        validUrlEndpointArb,
        (
          setPublicKey: boolean,
          setPrivateKey: boolean,
          setUrlEndpoint: boolean,
          publicKey: string,
          privateKey: string,
          urlEndpoint: string
        ) => {
          clearMediaEnvVars();

          if (setPublicKey) {
            process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY = publicKey;
          }
          if (setPrivateKey) {
            process.env.IMAGEKIT_PRIVATE_KEY = privateKey;
          }
          if (setUrlEndpoint) {
            process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT = urlEndpoint;
          }

          const expectedValid = setPublicKey && setPrivateKey && setUrlEndpoint;
          expect(isMediaConfigValid()).toBe(expectedValid);
        }
      ),
      { numRuns: 100 }
    );
  });
});


/**
 * Integration tests using real environment variables
 * These tests verify the media config works with actual ImageKit credentials
 */
describe('Property 34: Media configuration with real credentials', () => {
  // Store the real env values before any tests modify them
  const realPublicKey = process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
  const realPrivateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const realUrlEndpoint = process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

  beforeEach(() => {
    // Restore real env values before each test
    process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY = realPublicKey;
    process.env.IMAGEKIT_PRIVATE_KEY = realPrivateKey;
    process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT = realUrlEndpoint;
  });

  it('getMediaConfig works with real ImageKit credentials from .env', () => {
    // Use real credentials from .env
    const config = getMediaConfig();

    // Verify the config contains valid ImageKit credentials
    expect(isValidPublicKey(config.publicKey)).toBe(true);
    expect(isValidPrivateKey(config.privateKey)).toBe(true);
    expect(isValidUrlEndpoint(config.urlEndpoint)).toBe(true);

    // Verify the keys match expected format
    expect(config.publicKey).toMatch(/^public_/);
    expect(config.privateKey).toMatch(/^private_/);
    expect(config.urlEndpoint).toMatch(/^https:\/\/.*imagekit\.io/);
  });

  it('isMediaConfigValid returns true with real credentials', () => {
    expect(isMediaConfigValid()).toBe(true);
  });

  it('getImageKitPublicKey returns real key from .env', () => {
    const key = getImageKitPublicKey();
    expect(key).toBe(realPublicKey);
    expect(isValidPublicKey(key)).toBe(true);
  });

  it('getImageKitPrivateKey returns real key from .env', () => {
    const key = getImageKitPrivateKey();
    expect(key).toBe(realPrivateKey);
    expect(isValidPrivateKey(key)).toBe(true);
  });

  it('getImageKitUrlEndpoint returns real endpoint from .env', () => {
    const endpoint = getImageKitUrlEndpoint();
    expect(endpoint).toBe(realUrlEndpoint);
    expect(isValidUrlEndpoint(endpoint)).toBe(true);
  });

  it('URL endpoint uses ImageKit CDN', () => {
    const config = getMediaConfig();
    
    // Verify the URL endpoint is an ImageKit CDN URL
    const url = new URL(config.urlEndpoint);
    expect(url.protocol).toBe('https:');
    expect(url.hostname).toContain('imagekit.io');
  });
});
