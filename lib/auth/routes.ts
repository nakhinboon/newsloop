/**
 * Route Protection Logic
 * 
 * This module provides testable functions for determining which routes
 * require authentication and how unauthenticated requests should be handled.
 */

// Admin route patterns that require authentication
const ADMIN_ROUTE_PATTERNS = [
  /^\/admin(\/.*)?$/,  // /admin and /admin/*
];

// Sign-in route that unauthenticated users should be redirected to
export const SIGN_IN_ROUTE = '/admin/sign-in';

/**
 * Check if a pathname is a protected admin route
 * Protected routes require authentication
 */
export function isAdminRoute(pathname: string): boolean {
  if (!pathname || typeof pathname !== 'string') {
    return false;
  }
  
  return ADMIN_ROUTE_PATTERNS.some(pattern => pattern.test(pathname));
}

/**
 * Check if a pathname is the sign-in route
 * The sign-in route itself should not redirect to sign-in
 */
export function isSignInRoute(pathname: string): boolean {
  if (!pathname || typeof pathname !== 'string') {
    return false;
  }
  
  return pathname.startsWith(SIGN_IN_ROUTE);
}

/**
 * Determine the redirect URL for an unauthenticated request to a protected route
 * Returns null if the route is not protected or is the sign-in route
 */
export function getAuthRedirectUrl(pathname: string, isAuthenticated: boolean): string | null {
  // If authenticated, no redirect needed
  if (isAuthenticated) {
    return null;
  }
  
  // If not an admin route, no redirect needed
  if (!isAdminRoute(pathname)) {
    return null;
  }
  
  // If already on sign-in route, no redirect needed
  if (isSignInRoute(pathname)) {
    return null;
  }
  
  // Redirect to sign-in
  return SIGN_IN_ROUTE;
}

/**
 * Determine the expected behavior for a route request
 * Returns an object describing what should happen
 */
export interface RouteAccessResult {
  requiresAuth: boolean;
  shouldRedirect: boolean;
  redirectTo: string | null;
}

export function determineRouteAccess(
  pathname: string,
  isAuthenticated: boolean
): RouteAccessResult {
  const isProtected = isAdminRoute(pathname);
  const isSignIn = isSignInRoute(pathname);
  
  // Sign-in route is special - it's under /admin but doesn't require auth
  if (isSignIn) {
    return {
      requiresAuth: false,
      shouldRedirect: false,
      redirectTo: null,
    };
  }
  
  // Protected route without authentication
  if (isProtected && !isAuthenticated) {
    return {
      requiresAuth: true,
      shouldRedirect: true,
      redirectTo: SIGN_IN_ROUTE,
    };
  }
  
  // Protected route with authentication
  if (isProtected && isAuthenticated) {
    return {
      requiresAuth: true,
      shouldRedirect: false,
      redirectTo: null,
    };
  }
  
  // Non-protected route
  return {
    requiresAuth: false,
    shouldRedirect: false,
    redirectTo: null,
  };
}
