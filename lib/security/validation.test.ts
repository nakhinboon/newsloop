/**
 * Property-Based Tests for Input Validation
 *
 * **Feature: owasp-security-audit, Property 11: Internal IP Blocking**
 * **Validates: Requirements 10.2**
 *
 * **Feature: owasp-security-audit, Property 4: File Type Validation**
 * **Validates: Requirements 3.3**
 *
 * **Feature: owasp-security-audit, Property 5: Pagination Limit Enforcement**
 * **Validates: Requirements 4.3**
 *
 * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
 * **Validates: Requirements 8.1**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { isInternalIP, validateUrl, validateFileUpload, DEFAULT_ALLOWED_FILE_TYPES } from './validation';
import {
  MAX_LIMIT,
  enforcePaginationLimit,
  paginationSchema,
  postsListQuerySchema,
  categoriesListQuerySchema,
  mediaListQuerySchema,
  validateBody,
  validateQuery,
  createInvitationSchema,
  updateUserRoleSchema,
  folderSchema,
  addMediaToPostSchema,
  updatePostMediaSchema,
  moveMediaToFolderSchema,
} from './api-schemas';

// Arbitrary for generating IPv4 loopback addresses (127.x.x.x)
const loopbackIPv4Arb = fc.tuple(
  fc.constant(127),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 })
).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

// Arbitrary for generating 10.x.x.x private addresses
const privateClass10Arb = fc.tuple(
  fc.constant(10),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 })
).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

// Arbitrary for generating 172.16.x.x - 172.31.x.x private addresses
const privateClass172Arb = fc.tuple(
  fc.constant(172),
  fc.integer({ min: 16, max: 31 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 })
).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

// Arbitrary for generating 192.168.x.x private addresses
const privateClass192Arb = fc.tuple(
  fc.constant(192),
  fc.constant(168),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 })
).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

// Arbitrary for generating 169.254.x.x link-local addresses
const linkLocalArb = fc.tuple(
  fc.constant(169),
  fc.constant(254),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 })
).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

// Arbitrary for all internal IPv4 addresses
const internalIPv4Arb = fc.oneof(
  loopbackIPv4Arb,
  privateClass10Arb,
  privateClass172Arb,
  privateClass192Arb,
  linkLocalArb
);

// Arbitrary for internal hostnames
const internalHostnameArb = fc.oneof(
  fc.constant('localhost'),
  fc.constant('localhost.localdomain'),
  fc.constant('local'),
  fc.constant('0.0.0.0'),
  fc.constant('[::1]'),
  fc.constant('[::0]')
);

// Arbitrary for IPv6 internal addresses
const internalIPv6Arb = fc.oneof(
  fc.constant('::1'),
  fc.constant('fe80::1'),
  fc.constant('fc00::1'),
  fc.constant('fd00::1'),
  fc.constant('::ffff:127.0.0.1'),
  fc.constant('::ffff:10.0.0.1'),
  fc.constant('::ffff:192.168.1.1'),
  fc.constant('::ffff:172.16.0.1')
);

// Arbitrary for all internal addresses (IPv4, IPv6, and hostnames)
const allInternalAddressArb = fc.oneof(
  internalIPv4Arb,
  internalIPv6Arb,
  internalHostnameArb
);

// Arbitrary for generating public IPv4 addresses (non-internal)
const publicIPv4Arb = fc.tuple(
  fc.integer({ min: 1, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 0, max: 255 }),
  fc.integer({ min: 1, max: 254 })
).filter(([a, b, c, d]) => {
  // Exclude loopback (127.x.x.x)
  if (a === 127) return false;
  // Exclude private 10.x.x.x
  if (a === 10) return false;
  // Exclude private 172.16-31.x.x
  if (a === 172 && b >= 16 && b <= 31) return false;
  // Exclude private 192.168.x.x
  if (a === 192 && b === 168) return false;
  // Exclude link-local 169.254.x.x
  if (a === 169 && b === 254) return false;
  // Exclude 0.x.x.x (reserved)
  if (a === 0) return false;
  // Exclude multicast 224-239.x.x.x
  if (a >= 224 && a <= 239) return false;
  // Exclude reserved 240-255.x.x.x
  if (a >= 240) return false;
  return true;
}).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

describe('Property 11: Internal IP Blocking', () => {
  /**
   * **Feature: owasp-security-audit, Property 11: Internal IP Blocking**
   * **Validates: Requirements 10.2**
   *
   * Property: For any IPv4 loopback address (127.x.x.x), isInternalIP SHALL return true.
   */
  it('blocks all IPv4 loopback addresses (127.x.x.x)', () => {
    fc.assert(
      fc.property(loopbackIPv4Arb, (ip: string) => {
        expect(isInternalIP(ip)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 11: Internal IP Blocking**
   * **Validates: Requirements 10.2**
   *
   * Property: For any 10.x.x.x private address, isInternalIP SHALL return true.
   */
  it('blocks all 10.x.x.x private addresses', () => {
    fc.assert(
      fc.property(privateClass10Arb, (ip: string) => {
        expect(isInternalIP(ip)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 11: Internal IP Blocking**
   * **Validates: Requirements 10.2**
   *
   * Property: For any 172.16-31.x.x private address, isInternalIP SHALL return true.
   */
  it('blocks all 172.16-31.x.x private addresses', () => {
    fc.assert(
      fc.property(privateClass172Arb, (ip: string) => {
        expect(isInternalIP(ip)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 11: Internal IP Blocking**
   * **Validates: Requirements 10.2**
   *
   * Property: For any 192.168.x.x private address, isInternalIP SHALL return true.
   */
  it('blocks all 192.168.x.x private addresses', () => {
    fc.assert(
      fc.property(privateClass192Arb, (ip: string) => {
        expect(isInternalIP(ip)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 11: Internal IP Blocking**
   * **Validates: Requirements 10.2**
   *
   * Property: For any 169.254.x.x link-local address, isInternalIP SHALL return true.
   */
  it('blocks all 169.254.x.x link-local addresses', () => {
    fc.assert(
      fc.property(linkLocalArb, (ip: string) => {
        expect(isInternalIP(ip)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 11: Internal IP Blocking**
   * **Validates: Requirements 10.2**
   *
   * Property: For localhost and related hostnames, isInternalIP SHALL return true.
   */
  it('blocks localhost and related hostnames', () => {
    fc.assert(
      fc.property(internalHostnameArb, (hostname: string) => {
        expect(isInternalIP(hostname)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 11: Internal IP Blocking**
   * **Validates: Requirements 10.2**
   *
   * Property: For any IPv6 internal address, isInternalIP SHALL return true.
   */
  it('blocks IPv6 internal addresses', () => {
    fc.assert(
      fc.property(internalIPv6Arb, (ip: string) => {
        expect(isInternalIP(ip)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 11: Internal IP Blocking**
   * **Validates: Requirements 10.2**
   *
   * Property: For any internal address (IPv4, IPv6, or hostname),
   * isInternalIP SHALL return true.
   */
  it('blocks all internal addresses regardless of format', () => {
    fc.assert(
      fc.property(allInternalAddressArb, (address: string) => {
        expect(isInternalIP(address)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 11: Internal IP Blocking**
   * **Validates: Requirements 10.2**
   *
   * Property: For any public IPv4 address, isInternalIP SHALL return false.
   */
  it('allows public IPv4 addresses', () => {
    fc.assert(
      fc.property(publicIPv4Arb, (ip: string) => {
        expect(isInternalIP(ip)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 11: Internal IP Blocking**
   * **Validates: Requirements 10.2**
   *
   * Property: isInternalIP is case-insensitive for hostnames.
   */
  it('is case-insensitive for hostnames', () => {
    const caseVariantsArb = fc.oneof(
      fc.constant('LOCALHOST'),
      fc.constant('LocalHost'),
      fc.constant('LOCALHOST.LOCALDOMAIN'),
      fc.constant('LOCAL')
    );

    fc.assert(
      fc.property(caseVariantsArb, (hostname: string) => {
        expect(isInternalIP(hostname)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 11: Internal IP Blocking**
   * **Validates: Requirements 10.2**
   *
   * Property: isInternalIP handles whitespace correctly.
   */
  it('handles whitespace in input', () => {
    fc.assert(
      fc.property(internalIPv4Arb, (ip: string) => {
        // Add random whitespace
        const withWhitespace = `  ${ip}  `;
        expect(isInternalIP(withWhitespace)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 11: Internal IP Blocking**
   * **Validates: Requirements 10.2**
   *
   * Property: validateUrl rejects URLs with internal IP addresses.
   */
  it('validateUrl rejects URLs with internal addresses', () => {
    fc.assert(
      fc.property(internalIPv4Arb, (ip: string) => {
        const url = `http://${ip}/api/data`;
        const result = validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('internal network');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 11: Internal IP Blocking**
   * **Validates: Requirements 10.2**
   *
   * Property: validateUrl rejects URLs with localhost.
   */
  it('validateUrl rejects URLs with localhost', () => {
    const localhostUrls = [
      'http://localhost/api',
      'http://localhost:3000/api',
      'https://localhost/api',
      'http://127.0.0.1/api',
      'http://127.0.0.1:8080/api',
    ];

    localhostUrls.forEach((url) => {
      const result = validateUrl(url);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('internal network');
    });
  });
});


/**
 * Property-Based Tests for File Type Validation
 *
 * **Feature: owasp-security-audit, Property 4: File Type Validation**
 * **Validates: Requirements 3.3**
 *
 * Property: For any file upload with disallowed MIME type, the API SHALL reject
 * the upload with appropriate error message.
 */

// Magic bytes for different file types
const FILE_MAGIC_BYTES = {
  jpeg: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]),
  png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  gif: Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00]),
  webp: Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
  pdf: Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]),
};

// Disallowed file types that ARE detected by the validator (PDF is detected but not in default allowed list)
const DISALLOWED_DETECTED_FILE_TYPES = ['pdf'] as const;

// Allowed file types
const ALLOWED_FILE_TYPES = ['jpeg', 'png', 'gif', 'webp'] as const;

// Extension mapping for file types
const FILE_EXTENSIONS: Record<string, string> = {
  jpeg: 'jpg',
  png: 'png',
  gif: 'gif',
  webp: 'webp',
  pdf: 'pdf',
};

// Arbitrary for generating disallowed file buffers (files that are detected but not allowed)
const disallowedFileArb = fc.constantFrom(...DISALLOWED_DETECTED_FILE_TYPES).map((type) => ({
  type,
  buffer: FILE_MAGIC_BYTES[type],
  filename: `test.${FILE_EXTENSIONS[type]}`,
}));

// Arbitrary for generating allowed file buffers
const allowedFileArb = fc.constantFrom(...ALLOWED_FILE_TYPES).map((type) => ({
  type,
  buffer: FILE_MAGIC_BYTES[type],
  filename: `test.${FILE_EXTENSIONS[type]}`,
}));

// Arbitrary for generating random bytes (unknown file type)
const randomBytesArb = fc.uint8Array({ minLength: 8, maxLength: 100 })
  .filter((arr) => {
    // Ensure it doesn't accidentally match known magic bytes
    const buf = Buffer.from(arr);
    // Not JPEG
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return false;
    // Not PNG
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return false;
    // Not GIF
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return false;
    // Not WebP
    if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46) return false;
    // Not PDF
    if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return false;
    return true;
  })
  .map((arr) => ({
    type: 'unknown',
    buffer: Buffer.from(arr),
    filename: 'test.bin',
  }));

describe('Property 4: File Type Validation', () => {
  /**
   * **Feature: owasp-security-audit, Property 4: File Type Validation**
   * **Validates: Requirements 3.3**
   *
   * Property: For any file with disallowed MIME type, validateFileUpload SHALL
   * return valid: false with an appropriate error message.
   */
  it('rejects files with disallowed MIME types', () => {
    fc.assert(
      fc.property(disallowedFileArb, ({ buffer, filename }) => {
        const result = validateFileUpload(buffer, filename);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('not allowed');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 4: File Type Validation**
   * **Validates: Requirements 3.3**
   *
   * Property: For any file with allowed MIME type and matching extension,
   * validateFileUpload SHALL return valid: true.
   */
  it('accepts files with allowed MIME types and matching extensions', () => {
    fc.assert(
      fc.property(allowedFileArb, ({ buffer, filename }) => {
        const result = validateFileUpload(buffer, filename);
        expect(result.valid).toBe(true);
        expect(result.mimeType).toBeDefined();
        expect(DEFAULT_ALLOWED_FILE_TYPES).toContain(result.mimeType);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 4: File Type Validation**
   * **Validates: Requirements 3.3**
   *
   * Property: For any file with unknown/undetectable MIME type,
   * validateFileUpload SHALL return valid: false.
   */
  it('rejects files with unknown MIME types', () => {
    fc.assert(
      fc.property(randomBytesArb, ({ buffer, filename }) => {
        const result = validateFileUpload(buffer, filename);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 4: File Type Validation**
   * **Validates: Requirements 3.3**
   *
   * Property: For any allowed file type with mismatched extension,
   * validateFileUpload SHALL return valid: false.
   */
  it('rejects files with mismatched extensions', () => {
    // Generate allowed file content with wrong extension
    const mismatchedFileArb = fc.tuple(
      fc.constantFrom(...ALLOWED_FILE_TYPES),
      fc.constantFrom('exe', 'php', 'js', 'html', 'bat')
    ).map(([type, wrongExt]) => ({
      type,
      buffer: FILE_MAGIC_BYTES[type],
      filename: `malicious.${wrongExt}`,
    }));

    fc.assert(
      fc.property(mismatchedFileArb, ({ buffer, filename }) => {
        const result = validateFileUpload(buffer, filename);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('does not match');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 4: File Type Validation**
   * **Validates: Requirements 3.3**
   *
   * Property: For any file buffer that is too small to detect MIME type,
   * validateFileUpload SHALL return valid: false.
   */
  it('rejects files that are too small to detect', () => {
    const tooSmallArb = fc.uint8Array({ minLength: 0, maxLength: 7 }).map((arr) => ({
      buffer: Buffer.from(arr),
      filename: 'small.bin',
    }));

    fc.assert(
      fc.property(tooSmallArb, ({ buffer, filename }) => {
        const result = validateFileUpload(buffer, filename);
        expect(result.valid).toBe(false);
        expect(result.mimeType).toBe('unknown');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 4: File Type Validation**
   * **Validates: Requirements 3.3**
   *
   * Property: The detected MIME type in the result SHALL always be a string.
   */
  it('always returns a mimeType string in the result', () => {
    const anyFileArb = fc.oneof(
      disallowedFileArb,
      allowedFileArb,
      randomBytesArb
    );

    fc.assert(
      fc.property(anyFileArb, ({ buffer, filename }) => {
        const result = validateFileUpload(buffer, filename);
        expect(typeof result.mimeType).toBe('string');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 4: File Type Validation**
   * **Validates: Requirements 3.3**
   *
   * Property: Custom allowedTypes parameter SHALL be respected.
   */
  it('respects custom allowedTypes parameter', () => {
    // Only allow PNG
    const customAllowedTypes = ['image/png'] as const;

    fc.assert(
      fc.property(allowedFileArb, ({ type, buffer, filename }) => {
        const result = validateFileUpload(buffer, filename, customAllowedTypes);
        if (type === 'png') {
          expect(result.valid).toBe(true);
        } else {
          expect(result.valid).toBe(false);
          expect(result.error).toContain('not allowed');
        }
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Property-Based Tests for Pagination Limit Enforcement
 *
 * **Feature: owasp-security-audit, Property 5: Pagination Limit Enforcement**
 * **Validates: Requirements 4.3**
 *
 * Property: For any API request with limit parameter exceeding MAX_LIMIT,
 * the response SHALL contain at most MAX_LIMIT items.
 */

describe('Property 5: Pagination Limit Enforcement', () => {
  /**
   * **Feature: owasp-security-audit, Property 5: Pagination Limit Enforcement**
   * **Validates: Requirements 4.3**
   *
   * Property: For any requested limit exceeding MAX_LIMIT, enforcePaginationLimit
   * SHALL return MAX_LIMIT.
   */
  it('enforces MAX_LIMIT for any limit exceeding the maximum', () => {
    // Generate limits that exceed MAX_LIMIT
    const exceedingLimitArb = fc.integer({ min: MAX_LIMIT + 1, max: 10000 });

    fc.assert(
      fc.property(exceedingLimitArb, (requestedLimit: number) => {
        const enforced = enforcePaginationLimit(requestedLimit);
        expect(enforced).toBe(MAX_LIMIT);
        expect(enforced).toBeLessThanOrEqual(MAX_LIMIT);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 5: Pagination Limit Enforcement**
   * **Validates: Requirements 4.3**
   *
   * Property: For any requested limit within valid range (1 to MAX_LIMIT),
   * enforcePaginationLimit SHALL return the requested limit unchanged.
   */
  it('preserves valid limits within the allowed range', () => {
    // Generate valid limits (1 to MAX_LIMIT)
    const validLimitArb = fc.integer({ min: 1, max: MAX_LIMIT });

    fc.assert(
      fc.property(validLimitArb, (requestedLimit: number) => {
        const enforced = enforcePaginationLimit(requestedLimit);
        expect(enforced).toBe(requestedLimit);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 5: Pagination Limit Enforcement**
   * **Validates: Requirements 4.3**
   *
   * Property: For any requested limit less than or equal to 0,
   * enforcePaginationLimit SHALL return at least 1.
   */
  it('enforces minimum limit of 1 for zero or negative values', () => {
    // Generate zero or negative limits
    const invalidLimitArb = fc.integer({ min: -1000, max: 0 });

    fc.assert(
      fc.property(invalidLimitArb, (requestedLimit: number) => {
        const enforced = enforcePaginationLimit(requestedLimit);
        expect(enforced).toBeGreaterThanOrEqual(1);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 5: Pagination Limit Enforcement**
   * **Validates: Requirements 4.3**
   *
   * Property: For any requested limit, enforcePaginationLimit SHALL always
   * return a value between 1 and MAX_LIMIT (inclusive).
   */
  it('always returns a value within bounds [1, MAX_LIMIT]', () => {
    // Generate any integer limit
    const anyLimitArb = fc.integer({ min: -10000, max: 10000 });

    fc.assert(
      fc.property(anyLimitArb, (requestedLimit: number) => {
        const enforced = enforcePaginationLimit(requestedLimit);
        expect(enforced).toBeGreaterThanOrEqual(1);
        expect(enforced).toBeLessThanOrEqual(MAX_LIMIT);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 5: Pagination Limit Enforcement**
   * **Validates: Requirements 4.3**
   *
   * Property: enforcePaginationLimit with custom maxLimit SHALL respect
   * the custom maximum.
   */
  it('respects custom maxLimit parameter', () => {
    // Generate custom max limits and requested limits
    const customLimitArb = fc.tuple(
      fc.integer({ min: 1, max: 100 }),  // customMaxLimit
      fc.integer({ min: 1, max: 200 })   // requestedLimit
    );

    fc.assert(
      fc.property(customLimitArb, ([customMaxLimit, requestedLimit]) => {
        const enforced = enforcePaginationLimit(requestedLimit, customMaxLimit);
        expect(enforced).toBeLessThanOrEqual(customMaxLimit);
        expect(enforced).toBeGreaterThanOrEqual(1);
        
        // If requested is within bounds, it should be preserved
        if (requestedLimit >= 1 && requestedLimit <= customMaxLimit) {
          expect(enforced).toBe(requestedLimit);
        }
        // If requested exceeds max, it should be capped
        if (requestedLimit > customMaxLimit) {
          expect(enforced).toBe(customMaxLimit);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 5: Pagination Limit Enforcement**
   * **Validates: Requirements 4.3**
   *
   * Property: Zod paginationSchema SHALL reject limits exceeding MAX_LIMIT.
   */
  it('paginationSchema rejects limits exceeding MAX_LIMIT', () => {
    // Generate limits that exceed MAX_LIMIT
    const exceedingLimitArb = fc.integer({ min: MAX_LIMIT + 1, max: 10000 });

    fc.assert(
      fc.property(exceedingLimitArb, (limit: number) => {
        const result = paginationSchema.safeParse({ limit });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 5: Pagination Limit Enforcement**
   * **Validates: Requirements 4.3**
   *
   * Property: Zod paginationSchema SHALL accept limits within valid range.
   */
  it('paginationSchema accepts valid limits', () => {
    // Generate valid limits (1 to MAX_LIMIT)
    const validLimitArb = fc.integer({ min: 1, max: MAX_LIMIT });

    fc.assert(
      fc.property(validLimitArb, (limit: number) => {
        const result = paginationSchema.safeParse({ limit });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.limit).toBe(limit);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 5: Pagination Limit Enforcement**
   * **Validates: Requirements 4.3**
   *
   * Property: postsListQuerySchema SHALL enforce MAX_LIMIT on limit parameter.
   */
  it('postsListQuerySchema enforces MAX_LIMIT', () => {
    // Generate limits that exceed MAX_LIMIT
    const exceedingLimitArb = fc.integer({ min: MAX_LIMIT + 1, max: 10000 });

    fc.assert(
      fc.property(exceedingLimitArb, (limit: number) => {
        const result = postsListQuerySchema.safeParse({ limit: String(limit) });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 5: Pagination Limit Enforcement**
   * **Validates: Requirements 4.3**
   *
   * Property: categoriesListQuerySchema SHALL enforce MAX_LIMIT on limit parameter.
   */
  it('categoriesListQuerySchema enforces MAX_LIMIT', () => {
    // Generate limits that exceed MAX_LIMIT
    const exceedingLimitArb = fc.integer({ min: MAX_LIMIT + 1, max: 10000 });

    fc.assert(
      fc.property(exceedingLimitArb, (limit: number) => {
        const result = categoriesListQuerySchema.safeParse({ limit: String(limit) });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 5: Pagination Limit Enforcement**
   * **Validates: Requirements 4.3**
   *
   * Property: mediaListQuerySchema SHALL enforce MAX_LIMIT on pageSize parameter.
   */
  it('mediaListQuerySchema enforces MAX_LIMIT on pageSize', () => {
    // Generate pageSizes that exceed MAX_LIMIT
    const exceedingPageSizeArb = fc.integer({ min: MAX_LIMIT + 1, max: 10000 });

    fc.assert(
      fc.property(exceedingPageSizeArb, (pageSize: number) => {
        const result = mediaListQuerySchema.safeParse({ pageSize: String(pageSize) });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 5: Pagination Limit Enforcement**
   * **Validates: Requirements 4.3**
   *
   * Property: For any valid pagination parameters, the parsed limit/pageSize
   * SHALL never exceed MAX_LIMIT.
   */
  it('parsed pagination values never exceed MAX_LIMIT', () => {
    // Generate any string that could be a limit value
    const anyLimitStringArb = fc.oneof(
      fc.integer({ min: 1, max: MAX_LIMIT }).map(String),
      fc.constant(''),
      fc.constant(undefined)
    );

    fc.assert(
      fc.property(anyLimitStringArb, (limitStr) => {
        const input = limitStr !== undefined ? { limit: limitStr } : {};
        const result = paginationSchema.safeParse(input);
        
        if (result.success) {
          expect(result.data.limit).toBeLessThanOrEqual(MAX_LIMIT);
          expect(result.data.pageSize).toBeLessThanOrEqual(MAX_LIMIT);
        }
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Property-Based Tests for Input Schema Validation
 *
 * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
 * **Validates: Requirements 8.1**
 *
 * Property: For any API request with malformed input data, the API SHALL reject
 * the request with validation error before processing.
 */

describe('Property 9: Input Schema Validation', () => {
  /**
   * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
   * **Validates: Requirements 8.1**
   *
   * Property: For any non-email string, createInvitationSchema SHALL reject it.
   */
  it('createInvitationSchema rejects invalid email formats', () => {
    // Generate strings that are not valid emails
    const invalidEmailArb = fc.oneof(
      fc.string().filter(s => !s.includes('@') || !s.includes('.')),
      fc.constant(''),
      fc.constant('notanemail'),
      fc.constant('@missing.local'),
      fc.constant('missing@'),
      fc.constant('spaces in@email.com'),
      fc.constant('double@@at.com')
    );

    fc.assert(
      fc.property(invalidEmailArb, (email) => {
        const result = validateBody({ email, role: 'ADMIN' }, createInvitationSchema);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
   * **Validates: Requirements 8.1**
   *
   * Property: For any invalid role value, updateUserRoleSchema SHALL reject it.
   */
  it('updateUserRoleSchema rejects invalid role values', () => {
    // Generate strings that are not valid roles
    const invalidRoleArb = fc.string()
      .filter(s => s !== 'ADMIN' && s !== 'EDITOR');

    fc.assert(
      fc.property(invalidRoleArb, (role) => {
        const result = validateBody({ role }, updateUserRoleSchema);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
   * **Validates: Requirements 8.1**
   *
   * Property: For any empty or whitespace-only folder name, folderSchema SHALL reject it.
   */
  it('folderSchema rejects empty or whitespace-only names', () => {
    // Generate empty string or strings of only spaces
    const emptyOrWhitespaceArb = fc.oneof(
      fc.constant(''),
      fc.integer({ min: 1, max: 20 }).map(n => ' '.repeat(n))
    ).filter(s => s.trim() === '');

    fc.assert(
      fc.property(emptyOrWhitespaceArb, (name) => {
        const result = validateBody({ name }, folderSchema);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
   * **Validates: Requirements 8.1**
   *
   * Property: For any folder name exceeding 100 characters, folderSchema SHALL reject it.
   */
  it('folderSchema rejects names exceeding 100 characters', () => {
    const longNameArb = fc.string({ minLength: 101, maxLength: 500 });

    fc.assert(
      fc.property(longNameArb, (name) => {
        const result = validateBody({ name }, folderSchema);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
   * **Validates: Requirements 8.1**
   *
   * Property: For any addMediaToPostSchema with empty mediaId, validation SHALL fail.
   */
  it('addMediaToPostSchema rejects empty mediaId', () => {
    const emptyMediaIdArb = fc.constant({ mediaId: '', isCover: false });

    fc.assert(
      fc.property(emptyMediaIdArb, (input) => {
        const result = validateBody(input, addMediaToPostSchema);
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
   * **Validates: Requirements 8.1**
   *
   * Property: For any updatePostMediaSchema with invalid media array items, validation SHALL fail.
   */
  it('updatePostMediaSchema rejects invalid media items', () => {
    // Generate invalid media items (missing required fields or wrong types)
    const invalidMediaItemArb = fc.oneof(
      fc.constant({ mediaId: '', isCover: false, order: 0 }), // empty mediaId
      fc.constant({ isCover: false, order: 0 }), // missing mediaId
      fc.constant({ mediaId: 123, isCover: false, order: 0 }), // wrong type
      fc.constant({ mediaId: 'valid', isCover: 'not-boolean', order: 0 }) // wrong isCover type
    );

    fc.assert(
      fc.property(invalidMediaItemArb, (item) => {
        const result = validateBody({ media: [item] }, updatePostMediaSchema);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
   * **Validates: Requirements 8.1**
   *
   * Property: For any non-object input, validateBody SHALL reject it.
   */
  it('validateBody rejects non-object inputs', () => {
    const nonObjectArb = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.string(),
      fc.integer(),
      fc.boolean(),
      fc.array(fc.anything())
    );

    fc.assert(
      fc.property(nonObjectArb, (input) => {
        const result = validateBody(input, createInvitationSchema);
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
   * **Validates: Requirements 8.1**
   *
   * Property: For any valid input matching schema, validateBody SHALL return success.
   */
  it('validateBody accepts valid inputs', () => {
    // Generate valid invitation inputs with Zod-compatible emails
    // Zod is stricter than fast-check's emailAddress(), so we generate safe emails
    const safeEmailArb = fc.tuple(
      fc.stringMatching(/^[a-z][a-z0-9]{2,10}$/),
      fc.constantFrom('example.com', 'test.org', 'mail.net', 'company.io')
    ).map(([local, domain]) => `${local}@${domain}`);

    const validInvitationArb = fc.record({
      email: safeEmailArb,
      role: fc.constantFrom('ADMIN', 'EDITOR'),
    });

    fc.assert(
      fc.property(validInvitationArb, (input) => {
        const result = validateBody(input, createInvitationSchema);
        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.email).toBe(input.email);
        expect(result.data?.role).toBe(input.role);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
   * **Validates: Requirements 8.1**
   *
   * Property: For any query with non-numeric page values, validateQuery SHALL reject or coerce.
   */
  it('validateQuery handles non-numeric pagination values', () => {
    const nonNumericArb = fc.oneof(
      fc.constant('abc'),
      fc.constant(''),
      fc.constant('1.5.3'),
      fc.constant('NaN'),
      fc.constant('Infinity')
    );

    fc.assert(
      fc.property(nonNumericArb, (pageValue) => {
        const params = new URLSearchParams({ page: pageValue });
        const result = validateQuery(params, paginationSchema);
        // Either fails validation or coerces to a valid number
        if (result.success) {
          expect(typeof result.data?.page).toBe('number');
          expect(Number.isFinite(result.data?.page)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
   * **Validates: Requirements 8.1**
   *
   * Property: For any negative page number, paginationSchema SHALL reject it.
   */
  it('paginationSchema rejects negative page numbers', () => {
    const negativePageArb = fc.integer({ min: -1000, max: -1 });

    fc.assert(
      fc.property(negativePageArb, (page) => {
        const result = paginationSchema.safeParse({ page });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
   * **Validates: Requirements 8.1**
   *
   * Property: For any negative offset, paginationSchema SHALL reject it.
   */
  it('paginationSchema rejects negative offsets', () => {
    const negativeOffsetArb = fc.integer({ min: -1000, max: -1 });

    fc.assert(
      fc.property(negativeOffsetArb, (offset) => {
        const result = paginationSchema.safeParse({ offset });
        expect(result.success).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
   * **Validates: Requirements 8.1**
   *
   * Property: For any valid pagination parameters, the parsed result SHALL have correct types.
   */
  it('paginationSchema returns correctly typed values for valid input', () => {
    const validPaginationArb = fc.record({
      page: fc.integer({ min: 1, max: 1000 }),
      pageSize: fc.integer({ min: 1, max: MAX_LIMIT }),
      limit: fc.integer({ min: 1, max: MAX_LIMIT }),
      offset: fc.integer({ min: 0, max: 10000 }),
    });

    fc.assert(
      fc.property(validPaginationArb, (input) => {
        const result = paginationSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.data.page).toBe('number');
          expect(typeof result.data.pageSize).toBe('number');
          expect(typeof result.data.limit).toBe('number');
          expect(typeof result.data.offset).toBe('number');
          expect(Number.isInteger(result.data.page)).toBe(true);
          expect(Number.isInteger(result.data.pageSize)).toBe(true);
          expect(Number.isInteger(result.data.limit)).toBe(true);
          expect(Number.isInteger(result.data.offset)).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
   * **Validates: Requirements 8.1**
   *
   * Property: Validation errors SHALL always include error message.
   */
  it('validation errors always include error message', () => {
    // Generate various invalid inputs
    const invalidInputArb = fc.oneof(
      fc.constant({ email: 'invalid', role: 'ADMIN' }),
      fc.constant({ email: 'test@test.com', role: 'INVALID' }),
      fc.constant({ email: '', role: 'ADMIN' }),
      fc.constant({})
    );

    fc.assert(
      fc.property(invalidInputArb, (input) => {
        const result = validateBody(input, createInvitationSchema);
        if (!result.success) {
          expect(result.error).toBeDefined();
          expect(typeof result.error).toBe('string');
          expect(result.error!.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 9: Input Schema Validation**
   * **Validates: Requirements 8.1**
   *
   * Property: For any input with extra fields, validation SHALL still succeed (Zod strips extra fields by default).
   */
  it('validation succeeds with extra fields (Zod passthrough behavior)', () => {
    // Generate valid emails that Zod will accept
    const safeEmailArb = fc.tuple(
      fc.stringMatching(/^[a-z][a-z0-9]{2,10}$/),
      fc.constantFrom('example.com', 'test.org', 'mail.net', 'company.io')
    ).map(([local, domain]) => `${local}@${domain}`);

    const validWithExtraArb = fc.record({
      email: safeEmailArb,
      role: fc.constantFrom('ADMIN', 'EDITOR'),
      extraField: fc.string(),
      anotherExtra: fc.integer(),
    });

    fc.assert(
      fc.property(validWithExtraArb, (input) => {
        const result = validateBody(input, createInvitationSchema);
        expect(result.success).toBe(true);
        // Extra fields should be stripped
        if (result.success) {
          expect(result.data?.email).toBe(input.email);
          expect(result.data?.role).toBe(input.role);
        }
      }),
      { numRuns: 100 }
    );
  });
});
