/**
 * Property-Based Tests for Protected Route Access
 *
 * **Feature: advanced-web-blog, Property 21: Protected route access**
 * **Validates: Requirements 12.1, 12.5**
 *
 * Property: For any admin route request without a valid Clerk session,
 * the system SHALL redirect to the Clerk sign-in page.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  isAdminRoute,
  isSignInRoute,
  getAuthRedirectUrl,
  determineRouteAccess,
  SIGN_IN_ROUTE,
} from './routes';

// Arbitrary for generating valid admin route paths
const adminRouteArb = fc.oneof(
  fc.constant('/admin'),
  fc.constant('/admin/'),
  fc.constant('/admin/posts'),
  fc.constant('/admin/posts/new'),
  fc.constant('/admin/posts/123'),
  fc.constant('/admin/categories'),
  fc.constant('/admin/tags'),
  fc.constant('/admin/media'),
  fc.constant('/admin/analytics'),
  fc.stringMatching(/^\/admin\/[a-z]{3,10}$/)
);

// Arbitrary for generating sign-in route paths
const signInRouteArb = fc.oneof(
  fc.constant('/admin/sign-in'),
  fc.constant('/admin/sign-in/'),
  fc.constant('/admin/sign-in/callback'),
  fc.constant('/admin/sign-in/sso-callback')
);

// Arbitrary for generating non-admin route paths
const nonAdminRouteArb = fc.oneof(
  fc.constant('/'),
  fc.constant('/en'),
  fc.constant('/en/blog'),
  fc.constant('/en/blog/my-post'),
  fc.constant('/es/category/tech'),
  fc.constant('/fr/tag/javascript'),
  fc.constant('/api/posts'),
  fc.stringMatching(/^\/[a-z]{2}\/[a-z]{3,10}$/)
);

// Arbitrary for authentication state
const authStateArb = fc.boolean();

describe('Property 21: Protected route access', () => {
  /**
   * Property: For any admin route path (excluding sign-in),
   * isAdminRoute SHALL return true.
   */
  it('isAdminRoute returns true for admin routes', () => {
    fc.assert(
      fc.property(adminRouteArb, (pathname: string) => {
        expect(isAdminRoute(pathname)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any non-admin route path,
   * isAdminRoute SHALL return false.
   */
  it('isAdminRoute returns false for non-admin routes', () => {
    fc.assert(
      fc.property(nonAdminRouteArb, (pathname: string) => {
        expect(isAdminRoute(pathname)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: isAdminRoute returns false for null/undefined/empty
   */
  it('isAdminRoute returns false for invalid inputs', () => {
    expect(isAdminRoute('')).toBe(false);
    expect(isAdminRoute(null as unknown as string)).toBe(false);
    expect(isAdminRoute(undefined as unknown as string)).toBe(false);
  });

  /**
   * Property: For any sign-in route path,
   * isSignInRoute SHALL return true.
   */
  it('isSignInRoute returns true for sign-in routes', () => {
    fc.assert(
      fc.property(signInRouteArb, (pathname: string) => {
        expect(isSignInRoute(pathname)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any admin route that is not sign-in,
   * isSignInRoute SHALL return false.
   */
  it('isSignInRoute returns false for non-sign-in admin routes', () => {
    const nonSignInAdminRoutes = [
      '/admin',
      '/admin/',
      '/admin/posts',
      '/admin/categories',
      '/admin/media',
    ];
    
    nonSignInAdminRoutes.forEach(pathname => {
      expect(isSignInRoute(pathname)).toBe(false);
    });
  });

  /**
   * Property: For any admin route request without authentication,
   * getAuthRedirectUrl SHALL return the sign-in URL.
   */
  it('unauthenticated admin requests redirect to sign-in', () => {
    fc.assert(
      fc.property(adminRouteArb, (pathname: string) => {
        // Skip sign-in routes as they shouldn't redirect
        if (isSignInRoute(pathname)) {
          return true;
        }
        
        const redirectUrl = getAuthRedirectUrl(pathname, false);
        expect(redirectUrl).toBe(SIGN_IN_ROUTE);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any admin route request with authentication,
   * getAuthRedirectUrl SHALL return null (no redirect needed).
   */
  it('authenticated admin requests do not redirect', () => {
    fc.assert(
      fc.property(adminRouteArb, (pathname: string) => {
        const redirectUrl = getAuthRedirectUrl(pathname, true);
        expect(redirectUrl).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any non-admin route request (regardless of auth state),
   * getAuthRedirectUrl SHALL return null.
   */
  it('non-admin routes do not redirect regardless of auth state', () => {
    fc.assert(
      fc.property(nonAdminRouteArb, authStateArb, (pathname: string, isAuth: boolean) => {
        const redirectUrl = getAuthRedirectUrl(pathname, isAuth);
        expect(redirectUrl).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sign-in route requests never redirect to sign-in
   * (to avoid infinite redirect loops).
   */
  it('sign-in routes never redirect to sign-in', () => {
    fc.assert(
      fc.property(signInRouteArb, authStateArb, (pathname: string, isAuth: boolean) => {
        const redirectUrl = getAuthRedirectUrl(pathname, isAuth);
        expect(redirectUrl).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any admin route without auth, determineRouteAccess
   * SHALL indicate requiresAuth=true and shouldRedirect=true.
   */
  it('determineRouteAccess correctly identifies unauthenticated admin access', () => {
    fc.assert(
      fc.property(adminRouteArb, (pathname: string) => {
        // Skip sign-in routes
        if (isSignInRoute(pathname)) {
          return true;
        }
        
        const result = determineRouteAccess(pathname, false);
        expect(result.requiresAuth).toBe(true);
        expect(result.shouldRedirect).toBe(true);
        expect(result.redirectTo).toBe(SIGN_IN_ROUTE);
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any admin route with auth, determineRouteAccess
   * SHALL indicate requiresAuth=true but shouldRedirect=false.
   */
  it('determineRouteAccess correctly identifies authenticated admin access', () => {
    fc.assert(
      fc.property(adminRouteArb, (pathname: string) => {
        // Skip sign-in routes
        if (isSignInRoute(pathname)) {
          return true;
        }
        
        const result = determineRouteAccess(pathname, true);
        expect(result.requiresAuth).toBe(true);
        expect(result.shouldRedirect).toBe(false);
        expect(result.redirectTo).toBeNull();
        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: For any non-admin route, determineRouteAccess
   * SHALL indicate requiresAuth=false and shouldRedirect=false.
   */
  it('determineRouteAccess correctly identifies public routes', () => {
    fc.assert(
      fc.property(nonAdminRouteArb, authStateArb, (pathname: string, isAuth: boolean) => {
        const result = determineRouteAccess(pathname, isAuth);
        expect(result.requiresAuth).toBe(false);
        expect(result.shouldRedirect).toBe(false);
        expect(result.redirectTo).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Sign-in route is treated as public (no auth required)
   * even though it's under /admin path.
   */
  it('sign-in route is treated as public', () => {
    fc.assert(
      fc.property(signInRouteArb, authStateArb, (pathname: string, isAuth: boolean) => {
        const result = determineRouteAccess(pathname, isAuth);
        expect(result.requiresAuth).toBe(false);
        expect(result.shouldRedirect).toBe(false);
        expect(result.redirectTo).toBeNull();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: The redirect behavior is deterministic -
   * same inputs always produce same outputs.
   */
  it('route access determination is deterministic', () => {
    fc.assert(
      fc.property(
        fc.oneof(adminRouteArb, nonAdminRouteArb, signInRouteArb),
        authStateArb,
        (pathname: string, isAuth: boolean) => {
          const result1 = determineRouteAccess(pathname, isAuth);
          const result2 = determineRouteAccess(pathname, isAuth);
          
          expect(result1.requiresAuth).toBe(result2.requiresAuth);
          expect(result1.shouldRedirect).toBe(result2.shouldRedirect);
          expect(result1.redirectTo).toBe(result2.redirectTo);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: All protected routes redirect to the same sign-in URL
   * ensuring consistent user experience.
   */
  it('all protected routes redirect to consistent sign-in URL', () => {
    const protectedRoutes = [
      '/admin',
      '/admin/posts',
      '/admin/posts/new',
      '/admin/posts/123',
      '/admin/categories',
      '/admin/tags',
      '/admin/media',
      '/admin/analytics',
    ];
    
    protectedRoutes.forEach(pathname => {
      const result = determineRouteAccess(pathname, false);
      expect(result.redirectTo).toBe(SIGN_IN_ROUTE);
    });
  });
});
