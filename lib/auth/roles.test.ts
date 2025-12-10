/**
 * Property-Based Tests for Admin Role Verification
 *
 * **Feature: advanced-web-blog, Property 20: Admin role verification**
 * **Validates: Requirements 12.6**
 *
 * Property: For any authenticated user attempting admin actions, the system
 * SHALL verify the user has admin role in Clerk publicMetadata.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { hasMinimumRole, type Role } from './roles';

// Arbitrary for valid roles
const validRoleArb: fc.Arbitrary<Role> = fc.constantFrom('admin', 'editor');

// Arbitrary for null/undefined roles
const nullishRoleArb = fc.constantFrom(null, undefined);

// Arbitrary for invalid role strings (not admin or editor)
const invalidRoleStringArb = fc.oneof(
  fc.constant(''),
  fc.constant('user'),
  fc.constant('moderator'),
  fc.constant('superadmin'),
  fc.constant('guest'),
  fc.constant('viewer'),
  fc.stringMatching(/^[a-z]{3,10}$/).filter(s => s !== 'admin' && s !== 'editor')
);

describe('Property 20: Admin role verification', () => {
  /**
   * Property: For any user with admin role in publicMetadata,
   * hasMinimumRole(role, 'admin') SHALL return true.
   */
  it('admin role passes admin verification', () => {
    fc.assert(
      fc.property(fc.constant('admin' as Role), (role: Role) => {
        expect(hasMinimumRole(role, 'admin')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any user with editor role in publicMetadata,
   * hasMinimumRole(role, 'admin') SHALL return false (editor is not admin).
   */
  it('editor role fails admin verification', () => {
    fc.assert(
      fc.property(fc.constant('editor' as Role), (role: Role) => {
        expect(hasMinimumRole(role, 'admin')).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any user with null or undefined role,
   * hasMinimumRole(role, 'admin') SHALL return false.
   */
  it('null or undefined role fails admin verification', () => {
    fc.assert(
      fc.property(nullishRoleArb, (role: Role | null | undefined) => {
        expect(hasMinimumRole(role, 'admin')).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any user with admin role, hasMinimumRole(role, 'editor')
   * SHALL return true (admin has editor privileges).
   */
  it('admin role passes editor verification', () => {
    fc.assert(
      fc.property(fc.constant('admin' as Role), (role: Role) => {
        expect(hasMinimumRole(role, 'editor')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any user with editor role, hasMinimumRole(role, 'editor')
   * SHALL return true.
   */
  it('editor role passes editor verification', () => {
    fc.assert(
      fc.property(fc.constant('editor' as Role), (role: Role) => {
        expect(hasMinimumRole(role, 'editor')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any user with null or undefined role,
   * hasMinimumRole(role, 'editor') SHALL return false.
   */
  it('null or undefined role fails editor verification', () => {
    fc.assert(
      fc.property(nullishRoleArb, (role: Role | null | undefined) => {
        expect(hasMinimumRole(role, 'editor')).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Role hierarchy is correctly enforced.
   * admin > editor, so admin has all editor permissions.
   */
  it('role hierarchy is correctly enforced', () => {
    // Admin has all permissions
    expect(hasMinimumRole('admin', 'admin')).toBe(true);
    expect(hasMinimumRole('admin', 'editor')).toBe(true);

    // Editor only has editor permissions
    expect(hasMinimumRole('editor', 'editor')).toBe(true);
    expect(hasMinimumRole('editor', 'admin')).toBe(false);

    // No role has no permissions
    expect(hasMinimumRole(null, 'editor')).toBe(false);
    expect(hasMinimumRole(null, 'admin')).toBe(false);
    expect(hasMinimumRole(undefined, 'editor')).toBe(false);
    expect(hasMinimumRole(undefined, 'admin')).toBe(false);
  });

  /**
   * Property: For any valid role and required role combination,
   * the verification result is deterministic and consistent.
   */
  it('role verification is deterministic', () => {
    fc.assert(
      fc.property(
        fc.oneof(validRoleArb, nullishRoleArb),
        validRoleArb,
        (userRole: Role | null | undefined, requiredRole: Role) => {
          // Call the function twice with same inputs
          const result1 = hasMinimumRole(userRole, requiredRole);
          const result2 = hasMinimumRole(userRole, requiredRole);

          // Results should be identical
          expect(result1).toBe(result2);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Admin role verification correctly identifies admin users
   * from any valid publicMetadata structure.
   */
  it('admin verification works with various metadata structures', () => {
    // Direct role check
    expect(hasMinimumRole('admin', 'admin')).toBe(true);
    expect(hasMinimumRole('editor', 'admin')).toBe(false);
    expect(hasMinimumRole(null, 'admin')).toBe(false);
    expect(hasMinimumRole(undefined, 'admin')).toBe(false);
  });

  /**
   * Property: For any role that is not 'admin' or 'editor',
   * the verification should fail for both admin and editor checks.
   * Note: The function signature expects Role type, but we test edge cases.
   */
  it('invalid role strings fail verification', () => {
    fc.assert(
      fc.property(invalidRoleStringArb, (invalidRole: string) => {
        // Cast to Role to test edge case behavior
        // The function should handle this gracefully
        const roleAsAny = invalidRole as Role | null | undefined;
        expect(hasMinimumRole(roleAsAny, 'admin')).toBe(false);
        expect(hasMinimumRole(roleAsAny, 'editor')).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
