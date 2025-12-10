/**
 * Property-Based Tests for Media Upload Validation
 *
 * **Feature: advanced-web-blog, Property 26: Media upload validation**
 * **Validates: Requirements 17.2**
 *
 * Property 26: For any uploaded file F, the system SHALL validate file type is an
 * allowed image format and size is within limits before storing.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  validateFile,
  validateFileType,
  validateFileSize,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  sanitizeFilename,
  getExtensionFromMimeType,
} from './upload';

// Arbitrary for generating valid MIME types (allowed image formats)
const validMimeTypeArb = fc.constantFrom(...ALLOWED_MIME_TYPES);

// Arbitrary for generating invalid MIME types
const invalidMimeTypeArb = fc.oneof(
  fc.constant(''),
  fc.constant('text/plain'),
  fc.constant('text/html'),
  fc.constant('application/json'),
  fc.constant('application/pdf'),
  fc.constant('video/mp4'),
  fc.constant('audio/mpeg'),
  fc.constant('image/bmp'), // Not in allowed list
  fc.constant('image/tiff'), // Not in allowed list
  fc.stringMatching(/^[a-z]+\/[a-z]+$/).filter(
    (mime) => !ALLOWED_MIME_TYPES.includes(mime as typeof ALLOWED_MIME_TYPES[number])
  )
);

// Arbitrary for generating valid file sizes (within limit)
const validFileSizeArb = fc.integer({ min: 1, max: MAX_FILE_SIZE });

// Arbitrary for generating invalid file sizes (exceeding limit)
const invalidFileSizeArb = fc.integer({ min: MAX_FILE_SIZE + 1, max: MAX_FILE_SIZE * 3 });

// Arbitrary for generating filenames
const filenameArb = fc.record({
  name: fc.stringMatching(/^[a-zA-Z0-9 _-]{1,50}$/),
  ext: fc.constantFrom('.jpg', '.png', '.gif', '.webp', '.svg', '.JPEG', '.PNG'),
}).map(({ name, ext }) => name + ext);

describe('Property 26: Media upload validation', () => {
  /**
   * **Feature: advanced-web-blog, Property 26: Media upload validation**
   * **Validates: Requirements 17.2**
   *
   * Property: For any valid MIME type (allowed image format),
   * validateFileType SHALL return { valid: true }.
   */
  it('validateFileType returns valid for allowed image formats', () => {
    fc.assert(
      fc.property(validMimeTypeArb, (mimeType: string) => {
        const result = validateFileType(mimeType);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 26: Media upload validation**
   * **Validates: Requirements 17.2**
   *
   * Property: For any invalid MIME type (not an allowed image format),
   * validateFileType SHALL return { valid: false } with an error message.
   */
  it('validateFileType returns invalid for disallowed formats', () => {
    fc.assert(
      fc.property(invalidMimeTypeArb, (mimeType: string) => {
        const result = validateFileType(mimeType);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('Invalid file type');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 26: Media upload validation**
   * **Validates: Requirements 17.2**
   *
   * Property: For any file size within the limit (≤ MAX_FILE_SIZE),
   * validateFileSize SHALL return { valid: true }.
   */
  it('validateFileSize returns valid for sizes within limit', () => {
    fc.assert(
      fc.property(validFileSizeArb, (size: number) => {
        const result = validateFileSize(size);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 26: Media upload validation**
   * **Validates: Requirements 17.2**
   *
   * Property: For any file size exceeding the limit (> MAX_FILE_SIZE),
   * validateFileSize SHALL return { valid: false } with an error message.
   */
  it('validateFileSize returns invalid for sizes exceeding limit', () => {
    fc.assert(
      fc.property(invalidFileSizeArb, (size: number) => {
        const result = validateFileSize(size);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('File too large');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 26: Media upload validation**
   * **Validates: Requirements 17.2**
   *
   * Property: For any valid MIME type AND valid file size,
   * validateFile SHALL return { valid: true }.
   */
  it('validateFile returns valid for allowed type and size within limit', () => {
    fc.assert(
      fc.property(validMimeTypeArb, validFileSizeArb, (mimeType: string, size: number) => {
        const result = validateFile(mimeType, size);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 26: Media upload validation**
   * **Validates: Requirements 17.2**
   *
   * Property: For any invalid MIME type (regardless of size),
   * validateFile SHALL return { valid: false } with a type error.
   */
  it('validateFile returns invalid for disallowed type regardless of size', () => {
    fc.assert(
      fc.property(
        invalidMimeTypeArb,
        fc.integer({ min: 1, max: MAX_FILE_SIZE * 2 }),
        (mimeType: string, size: number) => {
          const result = validateFile(mimeType, size);
          expect(result.valid).toBe(false);
          expect(result.error).toBeDefined();
          expect(result.error).toContain('Invalid file type');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: advanced-web-blog, Property 26: Media upload validation**
   * **Validates: Requirements 17.2**
   *
   * Property: For any valid MIME type but invalid file size,
   * validateFile SHALL return { valid: false } with a size error.
   */
  it('validateFile returns invalid for valid type but size exceeding limit', () => {
    fc.assert(
      fc.property(validMimeTypeArb, invalidFileSizeArb, (mimeType: string, size: number) => {
        const result = validateFile(mimeType, size);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        expect(result.error).toContain('File too large');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: validateFile checks type before size (type error takes precedence).
   */
  it('validateFile returns type error before size error when both are invalid', () => {
    fc.assert(
      fc.property(invalidMimeTypeArb, invalidFileSizeArb, (mimeType: string, size: number) => {
        const result = validateFile(mimeType, size);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
        // Type validation happens first, so type error should be returned
        expect(result.error).toContain('Invalid file type');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: MAX_FILE_SIZE boundary - exactly MAX_FILE_SIZE should be valid.
   */
  it('validateFileSize accepts exactly MAX_FILE_SIZE', () => {
    const result = validateFileSize(MAX_FILE_SIZE);
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  /**
   * Property: MAX_FILE_SIZE boundary - MAX_FILE_SIZE + 1 should be invalid.
   */
  it('validateFileSize rejects MAX_FILE_SIZE + 1', () => {
    const result = validateFileSize(MAX_FILE_SIZE + 1);
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('Property 26: Filename sanitization', () => {
  /**
   * Property: For any filename, sanitizeFilename SHALL return a lowercase string
   * with only alphanumeric characters, hyphens, and the original extension.
   */
  it('sanitizeFilename produces valid sanitized output', () => {
    fc.assert(
      fc.property(filenameArb, (filename: string) => {
        const sanitized = sanitizeFilename(filename);

        // Should be lowercase
        expect(sanitized).toBe(sanitized.toLowerCase());

        // Should not contain spaces
        expect(sanitized).not.toContain(' ');

        // Should not contain consecutive hyphens
        expect(sanitized).not.toMatch(/--/);

        // Should not start or end with hyphen (in the name part)
        const lastDot = sanitized.lastIndexOf('.');
        const name = lastDot > 0 ? sanitized.slice(0, lastDot) : sanitized;
        if (name.length > 0) {
          expect(name).not.toMatch(/^-|-$/);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: sanitizeFilename preserves file extension.
   */
  it('sanitizeFilename preserves file extension', () => {
    fc.assert(
      fc.property(filenameArb, (filename: string) => {
        const sanitized = sanitizeFilename(filename);
        const originalExt = filename.slice(filename.lastIndexOf('.')).toLowerCase();
        const sanitizedExt = sanitized.slice(sanitized.lastIndexOf('.'));

        expect(sanitizedExt).toBe(originalExt);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Property 26: MIME type to extension mapping', () => {
  /**
   * Property: For any allowed MIME type, getExtensionFromMimeType SHALL return
   * a non-empty extension string starting with '.'.
   */
  it('getExtensionFromMimeType returns valid extension for allowed types', () => {
    fc.assert(
      fc.property(validMimeTypeArb, (mimeType: string) => {
        const ext = getExtensionFromMimeType(mimeType);
        expect(ext).toBeDefined();
        expect(ext.length).toBeGreaterThan(0);
        expect(ext.startsWith('.')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getExtensionFromMimeType returns correct extensions for known types.
   */
  it('getExtensionFromMimeType returns correct extensions', () => {
    const expectedMappings: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/avif': '.avif',
      'image/svg+xml': '.svg',
    };

    for (const [mimeType, expectedExt] of Object.entries(expectedMappings)) {
      const ext = getExtensionFromMimeType(mimeType);
      expect(ext).toBe(expectedExt);
    }
  });
});
