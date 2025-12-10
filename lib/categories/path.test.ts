/**
 * Property-Based Tests for Category Path Utilities
 *
 * **Feature: subcategories, Property 13: Path Serialization Round-Trip**
 * **Validates: Requirements 7.1, 7.2, 7.3**
 *
 * Property 13: For any valid CategoryPath, serializing it to a string and then
 * parsing that string should produce an equivalent CategoryPath with identical segments.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  serializePath,
  parsePath,
  formatPathForDisplay,
  type CategoryPath,
} from './path';

// Arbitrary for generating valid category segment names
// Segments cannot contain "/" (the delimiter) and must be non-empty
const categorySegmentArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => s.trim().length > 0 && !s.includes('/'))
  .map((s) => s.trim());

// Arbitrary for generating valid category paths (1-3 segments for max depth)
const categoryPathArb = fc
  .array(categorySegmentArb, { minLength: 1, maxLength: 3 })
  .map((segments) => ({
    segments,
    ids: segments.map((_, i) => `id-${i}`),
  }));

describe('Property 13: Path Serialization Round-Trip', () => {
  /**
   * **Feature: subcategories, Property 13: Path Serialization Round-Trip**
   * **Validates: Requirements 7.1, 7.2, 7.3**
   *
   * Property: For any valid CategoryPath, serializing then parsing produces
   * equivalent segments.
   */
  it('serializing then parsing produces equivalent segments', () => {
    fc.assert(
      fc.property(categoryPathArb, (path: CategoryPath) => {
        // Serialize the path to a string
        const serialized = serializePath(path);

        // Parse the string back to a CategoryPath
        const parsed = parsePath(serialized);

        // The segments should be identical
        expect(parsed.segments).toEqual(path.segments);
      }),
      { numRuns: 100 }
    );
  });


  /**
   * **Feature: subcategories, Property 13: Path Serialization Round-Trip**
   * **Validates: Requirements 7.1, 7.2, 7.3**
   *
   * Property: Empty paths serialize to empty string and parse back to empty segments.
   */
  it('empty path round-trips correctly', () => {
    const emptyPath: CategoryPath = { segments: [], ids: [] };

    const serialized = serializePath(emptyPath);
    expect(serialized).toBe('');

    const parsed = parsePath(serialized);
    expect(parsed.segments).toEqual([]);
  });

  /**
   * **Feature: subcategories, Property 13: Path Serialization Round-Trip**
   * **Validates: Requirements 7.1**
   *
   * Property: Serialization uses "/" as delimiter.
   */
  it('serialization uses "/" delimiter', () => {
    fc.assert(
      fc.property(categoryPathArb, (path: CategoryPath) => {
        const serialized = serializePath(path);

        // If there are multiple segments, they should be joined by "/"
        if (path.segments.length > 1) {
          expect(serialized).toContain('/');
          expect(serialized.split('/').length).toBe(path.segments.length);
        }

        // Each segment should appear in the serialized string
        for (const segment of path.segments) {
          expect(serialized).toContain(segment);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 13: Path Serialization Round-Trip**
   * **Validates: Requirements 5.3**
   *
   * Property: formatPathForDisplay uses " > " delimiter for user-friendly display.
   */
  it('formatPathForDisplay uses " > " delimiter', () => {
    fc.assert(
      fc.property(categoryPathArb, (path: CategoryPath) => {
        const formatted = formatPathForDisplay(path);

        // If there are multiple segments, they should be joined by " > "
        if (path.segments.length > 1) {
          expect(formatted).toContain(' > ');
          expect(formatted.split(' > ').length).toBe(path.segments.length);
        }

        // Each segment should appear in the formatted string
        for (const segment of path.segments) {
          expect(formatted).toContain(segment);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: subcategories, Property 13: Path Serialization Round-Trip**
   * **Validates: Requirements 7.2**
   *
   * Property: Parsing preserves segment order.
   */
  it('parsing preserves segment order', () => {
    fc.assert(
      fc.property(categoryPathArb, (path: CategoryPath) => {
        const serialized = serializePath(path);
        const parsed = parsePath(serialized);

        // Segments should be in the same order
        for (let i = 0; i < path.segments.length; i++) {
          expect(parsed.segments[i]).toBe(path.segments[i]);
        }
      }),
      { numRuns: 100 }
    );
  });
});
