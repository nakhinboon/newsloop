/**
 * Property-Based Tests for Clerk Authentication
 *
 * **Feature: advanced-web-blog, Property 19: Clerk authentication validity**
 * **Validates: Requirements 12.2, 12.6**
 *
 * Property: For any Clerk session token, the system SHALL validate the token
 * and extract user metadata including admin role.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isValidClerkUserId,
  extractRoleFromMetadata,
  isAdminRole,
  hasEditorOrHigherRole,
  transformClerkUserData,
  isValidClerkUser,
  type ClerkUser,
  type RawClerkUserData,
} from './clerk';

// Arbitrary for generating valid Clerk user IDs (user_<alphanumeric>)
const validClerkUserIdArb = fc
  .stringMatching(/^[a-zA-Z0-9]{10,30}$/)
  .map((suffix) => `user_${suffix}`);

// Arbitrary for generating invalid Clerk user IDs
const invalidClerkUserIdArb = fc.oneof(
  fc.constant(''),
  fc.constant('invalid'),
  fc.constant('usr_abc123'),
  fc.constant('user_'),
  fc.constant('USER_abc123'),
  fc.stringMatching(/^[a-z]{5,10}$/),
  fc.stringMatching(/^[0-9]{5,10}$/)
);

// Arbitrary for valid roles
const validRoleArb = fc.constantFrom('admin', 'editor');

// Arbitrary for invalid roles
const invalidRoleArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(''),
  fc.constant('user'),
  fc.constant('moderator'),
  fc.constant('superadmin'),
  fc.constant(123),
  fc.constant(true)
);

// Arbitrary for valid email addresses
const validEmailArb = fc
  .tuple(
    fc.stringMatching(/^[a-z]{3,10}$/),
    fc.stringMatching(/^[a-z]{3,8}$/),
    fc.constantFrom('com', 'org', 'net', 'io')
  )
  .map(([user, domain, tld]) => `${user}@${domain}.${tld}`);

// Arbitrary for generating valid raw Clerk user data
const validRawClerkUserDataArb = fc.record({
  id: validClerkUserIdArb,
  emailAddresses: fc.array(
    fc.record({ emailAddress: validEmailArb }),
    { minLength: 1, maxLength: 3 }
  ),
  firstName: fc.option(fc.stringMatching(/^[A-Z][a-z]{2,10}$/), { nil: null }),
  lastName: fc.option(fc.stringMatching(/^[A-Z][a-z]{2,15}$/), { nil: null }),
  imageUrl: fc.webUrl(),
  publicMetadata: fc.oneof(
    fc.constant({ role: 'admin' }),
    fc.constant({ role: 'editor' }),
    fc.constant({})
  ),
});

// Arbitrary for generating valid ClerkUser objects
const validClerkUserArb: fc.Arbitrary<ClerkUser> = fc.record({
  id: validClerkUserIdArb,
  email: validEmailArb,
  firstName: fc.option(fc.stringMatching(/^[A-Z][a-z]{2,10}$/), { nil: null }),
  lastName: fc.option(fc.stringMatching(/^[A-Z][a-z]{2,15}$/), { nil: null }),
  imageUrl: fc.webUrl(),
  publicMetadata: fc.oneof(
    fc.constant({ role: 'admin' as const }),
    fc.constant({ role: 'editor' as const }),
    fc.constant({})
  ),
});

describe('Property 19: Clerk authentication validity', () => {
  /**
   * Property: For any valid Clerk user ID (user_<alphanumeric>),
   * isValidClerkUserId SHALL return true.
   */
  it('isValidClerkUserId returns true for valid Clerk user IDs', () => {
    fc.assert(
      fc.property(validClerkUserIdArb, (userId: string) => {
        expect(isValidClerkUserId(userId)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any invalid Clerk user ID (wrong format),
   * isValidClerkUserId SHALL return false.
   */
  it('isValidClerkUserId returns false for invalid user IDs', () => {
    fc.assert(
      fc.property(invalidClerkUserIdArb, (userId: string) => {
        expect(isValidClerkUserId(userId)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isValidClerkUserId returns false for null/undefined
   */
  it('isValidClerkUserId returns false for null or undefined', () => {
    expect(isValidClerkUserId(null)).toBe(false);
    expect(isValidClerkUserId(undefined)).toBe(false);
  });

  /**
   * Property: For any publicMetadata with role='admin' or role='editor',
   * extractRoleFromMetadata SHALL return that exact role.
   */
  it('extractRoleFromMetadata extracts valid roles correctly', () => {
    fc.assert(
      fc.property(validRoleArb, (role: string) => {
        const metadata = { role };
        const extracted = extractRoleFromMetadata(metadata);
        expect(extracted).toBe(role);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any publicMetadata with invalid or missing role,
   * extractRoleFromMetadata SHALL return null.
   */
  it('extractRoleFromMetadata returns null for invalid roles', () => {
    fc.assert(
      fc.property(invalidRoleArb, (invalidRole) => {
        const metadata = { role: invalidRole };
        const extracted = extractRoleFromMetadata(metadata);
        expect(extracted).toBe(null);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: extractRoleFromMetadata returns null for null/undefined metadata
   */
  it('extractRoleFromMetadata returns null for null or undefined metadata', () => {
    expect(extractRoleFromMetadata(null)).toBe(null);
    expect(extractRoleFromMetadata(undefined)).toBe(null);
  });

  /**
   * Property: isAdminRole returns true only for 'admin' role
   */
  it('isAdminRole returns true only for admin role', () => {
    expect(isAdminRole('admin')).toBe(true);
    expect(isAdminRole('editor')).toBe(false);
    expect(isAdminRole(null)).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole('')).toBe(false);
  });

  /**
   * Property: hasEditorOrHigherRole returns true for admin and editor roles
   */
  it('hasEditorOrHigherRole returns true for admin and editor', () => {
    expect(hasEditorOrHigherRole('admin')).toBe(true);
    expect(hasEditorOrHigherRole('editor')).toBe(true);
    expect(hasEditorOrHigherRole(null)).toBe(false);
    expect(hasEditorOrHigherRole(undefined)).toBe(false);
    expect(hasEditorOrHigherRole('')).toBe(false);
    expect(hasEditorOrHigherRole('user')).toBe(false);
  });

  /**
   * Property: For any valid raw Clerk user data, transformClerkUserData
   * SHALL return a ClerkUser with the same id and extracted role.
   */
  it('transformClerkUserData correctly transforms valid raw user data', () => {
    fc.assert(
      fc.property(validRawClerkUserDataArb, (rawUser: RawClerkUserData) => {
        const transformed = transformClerkUserData(rawUser);

        // Should return a valid ClerkUser
        expect(transformed).not.toBeNull();
        expect(transformed!.id).toBe(rawUser.id);

        // Email should be first email address
        expect(transformed!.email).toBe(rawUser.emailAddresses?.[0]?.emailAddress ?? '');

        // Names should be preserved
        expect(transformed!.firstName).toBe(rawUser.firstName ?? null);
        expect(transformed!.lastName).toBe(rawUser.lastName ?? null);

        // Role should be extracted from metadata
        const expectedRole = extractRoleFromMetadata(rawUser.publicMetadata);
        expect(transformed!.publicMetadata.role).toBe(expectedRole ?? undefined);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: transformClerkUserData returns null for null/undefined input
   */
  it('transformClerkUserData returns null for null or undefined', () => {
    expect(transformClerkUserData(null)).toBe(null);
    expect(transformClerkUserData(undefined)).toBe(null);
  });

  /**
   * Property: transformClerkUserData returns null for invalid user ID
   */
  it('transformClerkUserData returns null for invalid user ID', () => {
    fc.assert(
      fc.property(invalidClerkUserIdArb, (invalidId: string) => {
        const rawUser: RawClerkUserData = {
          id: invalidId,
          emailAddresses: [{ emailAddress: 'test@example.com' }],
          publicMetadata: { role: 'admin' },
        };
        expect(transformClerkUserData(rawUser)).toBe(null);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any valid ClerkUser, isValidClerkUser SHALL return true.
   */
  it('isValidClerkUser returns true for valid ClerkUser objects', () => {
    fc.assert(
      fc.property(validClerkUserArb, (user: ClerkUser) => {
        expect(isValidClerkUser(user)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isValidClerkUser returns false for null/undefined
   */
  it('isValidClerkUser returns false for null or undefined', () => {
    expect(isValidClerkUser(null)).toBe(false);
    expect(isValidClerkUser(undefined)).toBe(false);
  });

  /**
   * Property: isValidClerkUser returns false for users with invalid IDs
   */
  it('isValidClerkUser returns false for users with invalid IDs', () => {
    fc.assert(
      fc.property(invalidClerkUserIdArb, (invalidId: string) => {
        const user: ClerkUser = {
          id: invalidId,
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          imageUrl: 'https://example.com/avatar.jpg',
          publicMetadata: { role: 'admin' },
        };
        expect(isValidClerkUser(user)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any user with admin role in metadata, the system correctly
   * identifies them as admin through the validation chain.
   */
  it('admin role is correctly identified through validation chain', () => {
    fc.assert(
      fc.property(validClerkUserIdArb, validEmailArb, (userId: string, email: string) => {
        const rawUser: RawClerkUserData = {
          id: userId,
          emailAddresses: [{ emailAddress: email }],
          firstName: 'Admin',
          lastName: 'User',
          imageUrl: 'https://example.com/avatar.jpg',
          publicMetadata: { role: 'admin' },
        };

        // Transform the raw user
        const user = transformClerkUserData(rawUser);
        expect(user).not.toBeNull();

        // Validate the user
        expect(isValidClerkUser(user)).toBe(true);

        // Check admin role
        expect(isAdminRole(user!.publicMetadata.role)).toBe(true);
        expect(hasEditorOrHigherRole(user!.publicMetadata.role)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any user with editor role in metadata, the system correctly
   * identifies them as editor (not admin) through the validation chain.
   */
  it('editor role is correctly identified through validation chain', () => {
    fc.assert(
      fc.property(validClerkUserIdArb, validEmailArb, (userId: string, email: string) => {
        const rawUser: RawClerkUserData = {
          id: userId,
          emailAddresses: [{ emailAddress: email }],
          firstName: 'Editor',
          lastName: 'User',
          imageUrl: 'https://example.com/avatar.jpg',
          publicMetadata: { role: 'editor' },
        };

        // Transform the raw user
        const user = transformClerkUserData(rawUser);
        expect(user).not.toBeNull();

        // Validate the user
        expect(isValidClerkUser(user)).toBe(true);

        // Check editor role (not admin)
        expect(isAdminRole(user!.publicMetadata.role)).toBe(false);
        expect(hasEditorOrHigherRole(user!.publicMetadata.role)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any user without a role in metadata, the system correctly
   * identifies them as having no special privileges.
   */
  it('users without role have no special privileges', () => {
    fc.assert(
      fc.property(validClerkUserIdArb, validEmailArb, (userId: string, email: string) => {
        const rawUser: RawClerkUserData = {
          id: userId,
          emailAddresses: [{ emailAddress: email }],
          firstName: 'Regular',
          lastName: 'User',
          imageUrl: 'https://example.com/avatar.jpg',
          publicMetadata: {},
        };

        // Transform the raw user
        const user = transformClerkUserData(rawUser);
        expect(user).not.toBeNull();

        // Validate the user
        expect(isValidClerkUser(user)).toBe(true);

        // Check no special role
        expect(isAdminRole(user!.publicMetadata.role)).toBe(false);
        expect(hasEditorOrHigherRole(user!.publicMetadata.role)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});
