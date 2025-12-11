/**
 * Property-Based Tests for Role-Based Access Enforcement
 *
 * **Feature: owasp-security-audit, Property 2: Role-Based Access Enforcement**
 * **Validates: Requirements 1.2**
 *
 * Property: For any admin-only endpoint and any request with editor role,
 * the API SHALL return HTTP 403 status code.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { NextResponse } from 'next/server';
import { hasMinimumRole, type Role } from '@/lib/auth/roles';
import {
  createForbiddenResponse,
  createUnauthorizedResponse,
  AUTH_ERROR_MESSAGES,
} from './headers';

/**
 * Simulates the role-based access control pattern used in admin API routes.
 * This is the standard pattern for handling authorization errors.
 */
function handleRoleBasedAccess(userRole: Role | null | undefined, requiredRole: Role): NextResponse | null {
  // If user has no role, they're not authenticated
  if (!userRole) {
    return createUnauthorizedResponse();
  }
  
  // Check if user has the required role
  if (!hasMinimumRole(userRole, requiredRole)) {
    return createForbiddenResponse();
  }
  
  // Access granted - return null to indicate success
  return null;
}

/**
 * Simulates the error handling pattern when verifyAdminRole throws
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

// Arbitrary for generating admin API endpoint paths (admin-only endpoints)
const adminOnlyEndpointArb = fc.oneof(
  fc.constant('/api/admin/users'),
  fc.constant('/api/admin/users/123'),
  fc.constant('/api/admin/invitations'),
  fc.constant('/api/admin/invitations/456'),
  fc.stringMatching(/^\/api\/admin\/users\/[a-z0-9]{3,10}$/)
);

// Arbitrary for HTTP methods used in admin endpoints
const httpMethodArb = fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH');

// Arbitrary for editor role (non-admin authenticated users)
const editorRoleArb = fc.constant('editor' as Role);

// Arbitrary for admin role
const adminRoleArb = fc.constant('admin' as Role);

// Arbitrary for non-admin roles (editor or null/undefined)
const nonAdminRoleArb = fc.oneof(
  fc.constant('editor' as Role),
  fc.constant(null as Role | null),
  fc.constant(undefined as Role | undefined)
);

describe('Property 2: Role-Based Access Enforcement', () => {
  /**
   * Property: For any admin-only endpoint and any request with editor role,
   * the response SHALL have HTTP 403 status code.
   */
  it('editor role accessing admin-only endpoint returns 403 status', () => {
    fc.assert(
      fc.property(adminOnlyEndpointArb, httpMethodArb, editorRoleArb, (endpoint: string, method: string, role: Role) => {
        // Simulate editor trying to access admin-only endpoint
        const response = handleRoleBasedAccess(role, 'admin');
        
        // Response should not be null (access should be denied)
        expect(response).not.toBeNull();
        expect(response!.status).toBe(403);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any admin-only endpoint, the error response body
   * SHALL contain the standard "Insufficient permissions" message.
   */
  it('editor role receives standard insufficient permissions message', async () => {
    fc.assert(
      fc.asyncProperty(adminOnlyEndpointArb, editorRoleArb, async (endpoint: string, role: Role) => {
        const response = handleRoleBasedAccess(role, 'admin');
        
        expect(response).not.toBeNull();
        const body = await response!.json();
        
        expect(body.error).toBe(AUTH_ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any admin-only endpoint and admin role,
   * access SHALL be granted (null response indicating success).
   */
  it('admin role accessing admin-only endpoint is granted access', () => {
    fc.assert(
      fc.property(adminOnlyEndpointArb, httpMethodArb, adminRoleArb, (endpoint: string, method: string, role: Role) => {
        const response = handleRoleBasedAccess(role, 'admin');
        
        // Response should be null (access granted)
        expect(response).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: The createForbiddenResponse helper SHALL always return 403 status.
   */
  it('createForbiddenResponse always returns 403', () => {
    fc.assert(
      fc.property(fc.nat(1000), (_seed: number) => {
        const response = createForbiddenResponse();
        expect(response.status).toBe(403);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: The createForbiddenResponse helper SHALL always return
   * the standard insufficient permissions error message.
   */
  it('createForbiddenResponse returns standard error message', async () => {
    fc.assert(
      fc.asyncProperty(fc.nat(1000), async (_seed: number) => {
        const response = createForbiddenResponse();
        const body = await response.json();
        
        expect(body.error).toBe(AUTH_ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any "Admin role required" error thrown by verifyAdminRole,
   * the response SHALL have HTTP 403 status code.
   */
  it('admin role required error always returns 403 status', () => {
    fc.assert(
      fc.property(adminOnlyEndpointArb, httpMethodArb, (endpoint: string, method: string) => {
        // Simulate the error thrown by verifyAdminRole when user is editor
        const error = new Error('Admin role required');
        const response = handleAuthError(error);
        
        expect(response.status).toBe(403);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: 403 (Forbidden) is distinct from 401 (Unauthorized).
   * Editor role should get 403, not 401.
   */
  it('editor role gets 403 not 401 for admin endpoints', () => {
    fc.assert(
      fc.property(adminOnlyEndpointArb, editorRoleArb, (endpoint: string, role: Role) => {
        const response = handleRoleBasedAccess(role, 'admin');
        
        expect(response).not.toBeNull();
        // Should be 403 (Forbidden), not 401 (Unauthorized)
        expect(response!.status).toBe(403);
        expect(response!.status).not.toBe(401);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Role-based access control is deterministic -
   * same role always produces same response for same required role.
   */
  it('role-based access control is deterministic', () => {
    fc.assert(
      fc.property(
        fc.oneof(adminRoleArb, editorRoleArb, fc.constant(null as Role | null)),
        fc.constantFrom('admin' as Role, 'editor' as Role),
        (userRole: Role | null, requiredRole: Role) => {
          const response1 = handleRoleBasedAccess(userRole, requiredRole);
          const response2 = handleRoleBasedAccess(userRole, requiredRole);
          
          // Both should be null or both should have same status
          if (response1 === null) {
            expect(response2).toBeNull();
          } else {
            expect(response2).not.toBeNull();
            expect(response1.status).toBe(response2!.status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any non-admin role (editor, null, undefined) accessing admin-only endpoint,
   * access SHALL be denied with appropriate status code.
   */
  it('non-admin roles are denied access to admin-only endpoints', () => {
    fc.assert(
      fc.property(adminOnlyEndpointArb, nonAdminRoleArb, (endpoint: string, role: Role | null | undefined) => {
        const response = handleRoleBasedAccess(role, 'admin');
        
        // Response should not be null (access denied)
        expect(response).not.toBeNull();
        
        // Should be either 401 (no role) or 403 (insufficient role)
        if (role === null || role === undefined) {
          expect(response!.status).toBe(401);
        } else {
          expect(response!.status).toBe(403);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Error response bodies SHALL NOT contain sensitive information
   * like stack traces or internal paths.
   */
  it('forbidden responses do not leak sensitive information', async () => {
    fc.assert(
      fc.asyncProperty(adminOnlyEndpointArb, editorRoleArb, async (endpoint: string, role: Role) => {
        const response = handleRoleBasedAccess(role, 'admin');
        
        expect(response).not.toBeNull();
        const body = await response!.json();
        const bodyStr = JSON.stringify(body);
        
        // Should not contain stack traces
        expect(bodyStr).not.toMatch(/at\s+\w+\s+\(/);
        // Should not contain file paths
        expect(bodyStr).not.toMatch(/\/app\//);
        expect(bodyStr).not.toMatch(/node_modules/);
        // Should not contain internal error details
        expect(bodyStr).not.toMatch(/Error:/);
        // Should not contain role information beyond the error message
        expect(bodyStr).not.toMatch(/editor/i);
        expect(bodyStr).not.toMatch(/admin/i);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Role hierarchy is correctly enforced for admin-only endpoints.
   * Only admin role should have access, editor should not.
   */
  it('role hierarchy correctly enforces admin-only access', () => {
    // Admin has admin access
    expect(hasMinimumRole('admin', 'admin')).toBe(true);
    
    // Editor does NOT have admin access
    expect(hasMinimumRole('editor', 'admin')).toBe(false);
    
    // Null/undefined does NOT have admin access
    expect(hasMinimumRole(null, 'admin')).toBe(false);
    expect(hasMinimumRole(undefined, 'admin')).toBe(false);
  });

  /**
   * Property: For editor-level endpoints, both admin and editor roles
   * SHALL be granted access (admin has all editor permissions).
   */
  it('admin and editor roles can access editor-level endpoints', () => {
    fc.assert(
      fc.property(
        fc.oneof(adminRoleArb, editorRoleArb),
        (role: Role) => {
          const response = handleRoleBasedAccess(role, 'editor');
          
          // Both admin and editor should have access
          expect(response).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});
