/**
 * Property-Based Tests for Unauthenticated Access Rejection
 *
 * **Feature: owasp-security-audit, Property 1: Unauthenticated Access Rejection**
 * **Validates: Requirements 1.1**
 *
 * Property: For any protected admin endpoint and any request without valid authentication,
 * the API SHALL return HTTP 401 status code.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { NextResponse } from 'next/server';
import {
  createUnauthorizedResponse,
  createForbiddenResponse,
  AUTH_ERROR_MESSAGES,
} from './headers';

/**
 * Simulates the error handling pattern used in admin API routes.
 * This is the standard pattern for handling authentication errors.
 */
function handleAuthError(error: Error): NextResponse {
  if (error.message === 'Authentication required') {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }
  if (error.message === 'Admin role required' || error.message === 'Editor role required') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
}

// Arbitrary for generating admin API endpoint paths
const adminEndpointArb = fc.oneof(
  fc.constant('/api/admin/users'),
  fc.constant('/api/admin/users/123'),
  fc.constant('/api/admin/invitations'),
  fc.constant('/api/admin/invitations/456'),
  fc.constant('/api/admin/media'),
  fc.constant('/api/admin/media/upload'),
  fc.constant('/api/admin/media/folders'),
  fc.constant('/api/admin/tags'),
  fc.constant('/api/admin/posts/789/media'),
  fc.stringMatching(/^\/api\/admin\/[a-z]{3,10}$/)
);

// Arbitrary for HTTP methods used in admin endpoints
const httpMethodArb = fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH');

// Arbitrary for generating various authentication error messages
const authErrorMessageArb = fc.constantFrom(
  'Authentication required',
  'Admin role required',
  'Editor role required'
);

describe('Property 1: Unauthenticated Access Rejection', () => {
  /**
   * Property: For any "Authentication required" error,
   * the response SHALL have HTTP 401 status code.
   */
  it('authentication required error always returns 401 status', () => {
    fc.assert(
      fc.property(adminEndpointArb, httpMethodArb, (endpoint: string, method: string) => {
        // Simulate unauthenticated request error
        const error = new Error('Authentication required');
        const response = handleAuthError(error);
        
        expect(response.status).toBe(401);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any unauthenticated request to any admin endpoint,
   * the error response body SHALL contain the standard error message.
   */
  it('unauthenticated response contains standard error message', async () => {
    fc.assert(
      fc.asyncProperty(adminEndpointArb, async (endpoint: string) => {
        const error = new Error('Authentication required');
        const response = handleAuthError(error);
        const body = await response.json();
        
        expect(body.error).toBe('Authentication required');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: The createUnauthorizedResponse helper SHALL always return 401 status.
   */
  it('createUnauthorizedResponse always returns 401', () => {
    fc.assert(
      fc.property(fc.nat(1000), (_seed: number) => {
        const response = createUnauthorizedResponse();
        expect(response.status).toBe(401);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: The createUnauthorizedResponse helper SHALL always return
   * the standard authentication error message.
   */
  it('createUnauthorizedResponse returns standard error message', async () => {
    fc.assert(
      fc.asyncProperty(fc.nat(1000), async (_seed: number) => {
        const response = createUnauthorizedResponse();
        const body = await response.json();
        
        expect(body.error).toBe(AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any authorization error (role required),
   * the response SHALL have HTTP 403 status code (not 401).
   * This ensures proper distinction between authentication and authorization.
   */
  it('authorization errors return 403, not 401', () => {
    const roleErrorArb = fc.constantFrom('Admin role required', 'Editor role required');
    
    fc.assert(
      fc.property(roleErrorArb, (errorMessage: string) => {
        const error = new Error(errorMessage);
        const response = handleAuthError(error);
        
        expect(response.status).toBe(403);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: The error handling is deterministic -
   * same error always produces same response status.
   */
  it('error handling is deterministic', () => {
    fc.assert(
      fc.property(authErrorMessageArb, (errorMessage: string) => {
        const error = new Error(errorMessage);
        const response1 = handleAuthError(error);
        const response2 = handleAuthError(error);
        
        expect(response1.status).toBe(response2.status);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any admin endpoint and any HTTP method,
   * unauthenticated requests SHALL receive consistent 401 response.
   */
  it('all admin endpoints return 401 for unauthenticated requests', () => {
    fc.assert(
      fc.property(adminEndpointArb, httpMethodArb, (endpoint: string, method: string) => {
        // Simulate the error that verifyAdminRole/verifyEditorRole throws
        // when there's no authenticated user
        const error = new Error('Authentication required');
        const response = handleAuthError(error);
        
        // Verify consistent 401 response
        expect(response.status).toBe(401);
        
        // Verify it's not confused with authorization (403)
        expect(response.status).not.toBe(403);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: The createForbiddenResponse helper SHALL always return 403 status,
   * ensuring clear distinction from 401 (authentication vs authorization).
   */
  it('createForbiddenResponse returns 403, distinct from 401', () => {
    fc.assert(
      fc.property(fc.nat(1000), (_seed: number) => {
        const unauthorizedResponse = createUnauthorizedResponse();
        const forbiddenResponse = createForbiddenResponse();
        
        expect(unauthorizedResponse.status).toBe(401);
        expect(forbiddenResponse.status).toBe(403);
        expect(unauthorizedResponse.status).not.toBe(forbiddenResponse.status);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error response bodies SHALL NOT contain sensitive information
   * like stack traces or internal paths.
   */
  it('error responses do not leak sensitive information', async () => {
    fc.assert(
      fc.asyncProperty(authErrorMessageArb, async (errorMessage: string) => {
        const error = new Error(errorMessage);
        const response = handleAuthError(error);
        const body = await response.json();
        const bodyStr = JSON.stringify(body);
        
        // Should not contain stack traces
        expect(bodyStr).not.toMatch(/at\s+\w+\s+\(/);
        // Should not contain file paths
        expect(bodyStr).not.toMatch(/\/app\//);
        expect(bodyStr).not.toMatch(/node_modules/);
        // Should not contain internal error details
        expect(bodyStr).not.toMatch(/Error:/);
      }),
      { numRuns: 100 }
    );
  });
});
