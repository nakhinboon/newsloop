/**
 * Security Headers Configuration
 * Implements security headers as per OWASP recommendations
 * Requirements: 5.1, 4.4
 */

import { NextResponse } from 'next/server';

/**
 * Patterns that indicate internal system details that should NOT appear in error messages
 * Requirements: 4.4
 */
const INTERNAL_DETAIL_PATTERNS = [
  // Stack traces
  /at\s+\w+\s+\(/i,                    // "at functionName ("
  /at\s+Object\./i,                    // "at Object."
  /at\s+Module\./i,                    // "at Module."
  /at\s+async\s+/i,                    // "at async "
  /^\s+at\s+/m,                        // Lines starting with "at "
  
  // File paths (Windows and Unix)
  /[A-Z]:\\[\w\\]+/i,                  // Windows paths like C:\Users\...
  /\/home\/[\w/]+/,                    // Unix home paths
  /\/usr\/[\w/]+/,                     // Unix system paths
  /\/var\/[\w/]+/,                     // Unix var paths
  /\/app\/[\w/]+\.ts/,                 // App source paths with .ts
  /\/app\/[\w/]+\.js/,                 // App source paths with .js
  /node_modules\//,                    // Node modules path
  /\.tsx?:\d+:\d+/,                    // TypeScript file:line:col
  /\.jsx?:\d+:\d+/,                    // JavaScript file:line:col
  
  // Internal error details
  /ENOENT/,                            // File not found error code
  /ECONNREFUSED/,                      // Connection refused error code
  /ETIMEDOUT/,                         // Timeout error code
  /EACCES/,                            // Permission denied error code
  /Error:\s+\w+\s+at/,                 // Error with stack trace
  /TypeError:/,                        // Type errors
  /ReferenceError:/,                   // Reference errors
  /SyntaxError:/,                      // Syntax errors
  
  // Database internals
  /prisma/i,                           // Prisma ORM references
  /postgresql/i,                       // PostgreSQL references
  /SELECT\s+/i,                        // SQL queries
  /INSERT\s+INTO/i,                    // SQL queries
  /UPDATE\s+\w+\s+SET/i,               // SQL queries
  /DELETE\s+FROM/i,                    // SQL queries
  
  // Environment/config details
  /process\.env\./,                    // Environment variable access
  /DATABASE_URL/,                      // Database connection string
  /API_KEY/i,                          // API keys
  /SECRET/i,                           // Secrets
  /PASSWORD/i,                         // Passwords
  /TOKEN/i,                            // Tokens (except in safe contexts)
];

/**
 * Check if an error message contains internal system details
 * @param message The message to check
 * @returns true if the message contains internal details
 */
export function containsInternalDetails(message: string): boolean {
  return INTERNAL_DETAIL_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * Sanitize an error message by removing internal details
 * Returns a safe, generic error message if internal details are detected
 * Requirements: 4.4
 * 
 * @param error The error to sanitize (can be Error, string, or unknown)
 * @returns A safe error message string
 */
export function sanitizeErrorMessage(error: unknown): string {
  // Handle null/undefined
  if (error === null || error === undefined) {
    return 'An error occurred';
  }

  // Get the error message
  let message: string;
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  } else {
    return 'An error occurred';
  }

  // Check for internal details
  if (containsInternalDetails(message)) {
    return 'An error occurred';
  }

  // Return the original message if it's safe
  return message;
}

/**
 * Check if an error response object is safe (no internal details)
 * Requirements: 4.4
 * 
 * @param response The error response object to check
 * @returns true if the response is safe to return to clients
 */
export function isErrorResponseSafe(response: { error: string; [key: string]: unknown }): boolean {
  // Check the error message
  if (containsInternalDetails(response.error)) {
    return false;
  }

  // Check any additional fields
  for (const [key, value] of Object.entries(response)) {
    if (key === 'error') continue;
    
    if (typeof value === 'string' && containsInternalDetails(value)) {
      return false;
    }
    
    // Check nested objects
    if (typeof value === 'object' && value !== null) {
      const stringified = JSON.stringify(value);
      if (containsInternalDetails(stringified)) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Security headers configuration interface
 */
export interface SecurityHeadersConfig {
  contentSecurityPolicy: string;
  xFrameOptions: 'DENY' | 'SAMEORIGIN';
  xContentTypeOptions: 'nosniff';
  referrerPolicy: string;
  permissionsPolicy: string;
  strictTransportSecurity: string;
}

/**
 * Default security headers configuration
 */
const defaultConfig: SecurityHeadersConfig = {
  contentSecurityPolicy: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.com https://*.clerk.accounts.dev",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://ik.imagekit.io https://*.clerk.com https://img.clerk.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.clerk.com https://*.clerk.accounts.dev https://clerk.com https://*.upstash.io",
    "frame-src 'self' https://*.clerk.com https://*.clerk.accounts.dev",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
  ].join('; '),
  xFrameOptions: 'SAMEORIGIN',
  xContentTypeOptions: 'nosniff',
  referrerPolicy: 'strict-origin-when-cross-origin',
  permissionsPolicy: [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
  ].join(', '),
  strictTransportSecurity: 'max-age=31536000; includeSubDomains',
};

/**
 * Get security headers as a Record for use in responses
 * @param config Optional custom configuration to override defaults
 * @returns Record of security header names to values
 */
export function getSecurityHeaders(
  config: Partial<SecurityHeadersConfig> = {}
): Record<string, string> {
  const mergedConfig = { ...defaultConfig, ...config };

  return {
    'Content-Security-Policy': mergedConfig.contentSecurityPolicy,
    'X-Frame-Options': mergedConfig.xFrameOptions,
    'X-Content-Type-Options': mergedConfig.xContentTypeOptions,
    'Referrer-Policy': mergedConfig.referrerPolicy,
    'Permissions-Policy': mergedConfig.permissionsPolicy,
    'Strict-Transport-Security': mergedConfig.strictTransportSecurity,
    'X-DNS-Prefetch-Control': 'on',
    'X-XSS-Protection': '1; mode=block',
  };
}

/**
 * Apply security headers to a NextResponse
 * @param response The NextResponse to modify
 * @param config Optional custom configuration
 * @returns The modified NextResponse with security headers
 */
export function applySecurityHeaders(
  response: NextResponse,
  config: Partial<SecurityHeadersConfig> = {}
): NextResponse {
  const headers = getSecurityHeaders(config);

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}

/**
 * Create a new NextResponse with security headers applied
 * @param body Response body
 * @param init Response init options
 * @param config Optional security headers configuration
 * @returns NextResponse with security headers
 */
export function createSecureResponse(
  body?: BodyInit | null,
  init?: ResponseInit,
  config: Partial<SecurityHeadersConfig> = {}
): NextResponse {
  const response = new NextResponse(body, init);
  return applySecurityHeaders(response, config);
}

/**
 * Standard authentication error messages
 * Using consistent messages prevents user enumeration attacks
 * Requirements: 7.2
 */
export const AUTH_ERROR_MESSAGES = {
  /** Generic authentication failure - use for all auth failures to prevent enumeration */
  AUTHENTICATION_REQUIRED: 'Authentication required',
  /** Generic authorization failure - use for all permission failures */
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions',
  /** Rate limit exceeded */
  TOO_MANY_REQUESTS: 'Too many requests',
  /** Method not allowed */
  METHOD_NOT_ALLOWED: 'Method not allowed',
} as const;

/**
 * Create a standardized 401 Unauthorized response
 * Uses consistent error message to prevent user enumeration
 * Requirements: 7.2
 */
export function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json(
    { error: AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED },
    { status: 401 }
  );
}

/**
 * Create a standardized 403 Forbidden response
 * Uses consistent error message to prevent information disclosure
 * Requirements: 7.2
 */
export function createForbiddenResponse(): NextResponse {
  return NextResponse.json(
    { error: AUTH_ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS },
    { status: 403 }
  );
}

/**
 * Create a standardized 405 Method Not Allowed response
 * Requirements: 5.4
 */
export function createMethodNotAllowedResponse(allowedMethods: string[]): NextResponse {
  return NextResponse.json(
    { error: AUTH_ERROR_MESSAGES.METHOD_NOT_ALLOWED },
    { 
      status: 405,
      headers: {
        'Allow': allowedMethods.join(', ')
      }
    }
  );
}

/**
 * HTTP methods that can be used in API routes
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

/**
 * Validate that the request method is allowed
 * Returns a 405 response if the method is not allowed
 * Requirements: 5.4
 * 
 * @param request The incoming request
 * @param allowedMethods Array of allowed HTTP methods
 * @returns NextResponse with 405 status if method not allowed, null otherwise
 */
export function validateMethod(
  request: Request,
  allowedMethods: HttpMethod[]
): NextResponse | null {
  const method = request.method.toUpperCase() as HttpMethod;
  
  if (!allowedMethods.includes(method)) {
    return createMethodNotAllowedResponse(allowedMethods);
  }
  
  return null;
}
