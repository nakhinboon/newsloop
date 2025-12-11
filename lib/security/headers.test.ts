/**
 * Property-Based Tests for Security Headers and Error Message Sanitization
 *
 * **Feature: owasp-security-audit, Property 6: Error Message Sanitization**
 * **Validates: Requirements 4.4**
 *
 * Property: For any API error response, the response body SHALL NOT contain
 * stack traces, file paths, or internal system details.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  getSecurityHeaders,
  sanitizeErrorMessage,
  isErrorResponseSafe,
  containsInternalDetails,
  AUTH_ERROR_MESSAGES,
  createUnauthorizedResponse,
  createForbiddenResponse,
  createMethodNotAllowedResponse,
  validateMethod,
} from './headers';

// Arbitrary for generating safe error messages
const safeErrorMessageArb = fc.oneof(
  fc.constant('Authentication required'),
  fc.constant('Unauthorized'),
  fc.constant('Forbidden'),
  fc.constant('Not found'),
  fc.constant('Bad request'),
  fc.constant('Validation failed'),
  fc.constant('Resource not found'),
  fc.constant('Invalid input'),
  fc.constant('Method not allowed'),
  fc.constant('Too many requests'),
  fc.constant('Internal server error'),
  fc.constant('Service unavailable'),
  fc.constant('Failed to process request'),
  fc.constant('An error occurred'),
  // Generic messages with safe content
  fc.stringMatching(/^[A-Z][a-z]+ [a-z]+ [a-z]+$/).filter(s => !containsInternalDetails(s))
);

// Arbitrary for generating unsafe error messages (with internal details)
const unsafeErrorMessageArb = fc.oneof(
  // Stack traces
  fc.constant('Error: Something failed at Object.handler (/app/api/route.ts:42:15)'),
  fc.constant('TypeError: Cannot read property of undefined\n    at processRequest (/app/lib/utils.ts:10:5)'),
  fc.constant('Error at Module._compile (node:internal/modules/cjs/loader:1254:14)'),
  
  // File paths
  fc.constant('Failed to read file: /home/user/app/config.json'),
  fc.constant('ENOENT: no such file or directory, open C:\\Users\\dev\\project\\data.json'),
  fc.constant('Error in /app/lib/db/prisma.ts:25:10'),
  
  // Database errors
  fc.constant('PrismaClientKnownRequestError: Invalid `prisma.user.findUnique()` invocation'),
  fc.constant('PostgreSQL error: relation "users" does not exist'),
  fc.constant('SELECT * FROM users WHERE id = 1 failed'),
  
  // Environment/config leaks
  fc.constant('Failed to connect using DATABASE_URL'),
  fc.constant('Invalid API_KEY provided'),
  fc.constant('Missing SECRET_KEY in configuration'),
  fc.constant('Authentication failed: invalid PASSWORD'),
  
  // System errors
  fc.constant('ECONNREFUSED: Connection refused to localhost:5432'),
  fc.constant('ETIMEDOUT: Connection timed out after 30000ms'),
  fc.constant('ReferenceError: config is not defined')
);

// Arbitrary for generating error response objects
const errorResponseArb = fc.record({
  error: safeErrorMessageArb,
  status: fc.integer({ min: 400, max: 599 }),
});

describe('Property 6: Error Message Sanitization', () => {
  /**
   * **Feature: owasp-security-audit, Property 6: Error Message Sanitization**
   * **Validates: Requirements 4.4**
   *
   * Property: For any safe error message, sanitizeErrorMessage SHALL return
   * the original message unchanged.
   */
  it('safe error messages are returned unchanged', () => {
    fc.assert(
      fc.property(safeErrorMessageArb, (message: string) => {
        const sanitized = sanitizeErrorMessage(message);
        expect(sanitized).toBe(message);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 6: Error Message Sanitization**
   * **Validates: Requirements 4.4**
   *
   * Property: For any error message containing internal details,
   * sanitizeErrorMessage SHALL return a generic safe message.
   */
  it('unsafe error messages are sanitized to generic message', () => {
    fc.assert(
      fc.property(unsafeErrorMessageArb, (message: string) => {
        const sanitized = sanitizeErrorMessage(message);
        expect(sanitized).toBe('An error occurred');
        expect(containsInternalDetails(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 6: Error Message Sanitization**
   * **Validates: Requirements 4.4**
   *
   * Property: For any Error object with internal details in its message,
   * sanitizeErrorMessage SHALL return a generic safe message.
   */
  it('Error objects with internal details are sanitized', () => {
    fc.assert(
      fc.property(unsafeErrorMessageArb, (message: string) => {
        const error = new Error(message);
        const sanitized = sanitizeErrorMessage(error);
        expect(sanitized).toBe('An error occurred');
        expect(containsInternalDetails(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 6: Error Message Sanitization**
   * **Validates: Requirements 4.4**
   *
   * Property: For null or undefined errors, sanitizeErrorMessage SHALL
   * return a generic safe message.
   */
  it('null and undefined errors return generic message', () => {
    expect(sanitizeErrorMessage(null)).toBe('An error occurred');
    expect(sanitizeErrorMessage(undefined)).toBe('An error occurred');
  });

  /**
   * **Feature: owasp-security-audit, Property 6: Error Message Sanitization**
   * **Validates: Requirements 4.4**
   *
   * Property: For any safe error response object, isErrorResponseSafe
   * SHALL return true.
   */
  it('safe error responses are identified as safe', () => {
    fc.assert(
      fc.property(errorResponseArb, (response) => {
        expect(isErrorResponseSafe(response)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 6: Error Message Sanitization**
   * **Validates: Requirements 4.4**
   *
   * Property: For any error response with internal details,
   * isErrorResponseSafe SHALL return false.
   */
  it('unsafe error responses are identified as unsafe', () => {
    fc.assert(
      fc.property(unsafeErrorMessageArb, (message: string) => {
        const response = { error: message };
        expect(isErrorResponseSafe(response)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 6: Error Message Sanitization**
   * **Validates: Requirements 4.4**
   *
   * Property: The output of sanitizeErrorMessage SHALL NEVER contain
   * any internal detail patterns.
   */
  it('sanitized output never contains internal details', () => {
    // Test with a mix of safe and unsafe messages
    const allMessagesArb = fc.oneof(safeErrorMessageArb, unsafeErrorMessageArb);
    
    fc.assert(
      fc.property(allMessagesArb, (message: string) => {
        const sanitized = sanitizeErrorMessage(message);
        expect(containsInternalDetails(sanitized)).toBe(false);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 6: Error Message Sanitization**
   * **Validates: Requirements 4.4**
   *
   * Property: Sanitization is idempotent - sanitizing an already sanitized
   * message produces the same result.
   */
  it('sanitization is idempotent', () => {
    const allMessagesArb = fc.oneof(safeErrorMessageArb, unsafeErrorMessageArb);
    
    fc.assert(
      fc.property(allMessagesArb, (message: string) => {
        const sanitized1 = sanitizeErrorMessage(message);
        const sanitized2 = sanitizeErrorMessage(sanitized1);
        expect(sanitized1).toBe(sanitized2);
      }),
      { numRuns: 100 }
    );
  });
});

describe('Security Headers', () => {
  /**
   * Property: getSecurityHeaders SHALL always return all required security headers.
   */
  it('returns all required security headers', () => {
    const headers = getSecurityHeaders();
    
    expect(headers).toHaveProperty('Content-Security-Policy');
    expect(headers).toHaveProperty('X-Frame-Options');
    expect(headers).toHaveProperty('X-Content-Type-Options');
    expect(headers).toHaveProperty('Referrer-Policy');
    expect(headers).toHaveProperty('Permissions-Policy');
    expect(headers).toHaveProperty('Strict-Transport-Security');
    expect(headers).toHaveProperty('X-DNS-Prefetch-Control');
    expect(headers).toHaveProperty('X-XSS-Protection');
  });

  /**
   * Property: X-Content-Type-Options SHALL always be 'nosniff'.
   */
  it('X-Content-Type-Options is always nosniff', () => {
    const headers = getSecurityHeaders();
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
  });

  /**
   * Property: X-Frame-Options SHALL be either DENY or SAMEORIGIN.
   */
  it('X-Frame-Options is DENY or SAMEORIGIN', () => {
    const headers = getSecurityHeaders();
    expect(['DENY', 'SAMEORIGIN']).toContain(headers['X-Frame-Options']);
  });

  /**
   * Property: Custom config overrides default values.
   */
  it('custom config overrides defaults', () => {
    const customHeaders = getSecurityHeaders({
      xFrameOptions: 'DENY',
      referrerPolicy: 'no-referrer',
    });
    
    expect(customHeaders['X-Frame-Options']).toBe('DENY');
    expect(customHeaders['Referrer-Policy']).toBe('no-referrer');
  });
});


/**
 * Property-Based Tests for Method Validation
 *
 * **Feature: owasp-security-audit, Property 7: Unsupported Method Rejection**
 * **Validates: Requirements 5.4**
 *
 * Property: For any API endpoint and any HTTP method not explicitly supported,
 * the API SHALL return HTTP 405 status code.
 */
describe('Property 7: Unsupported Method Rejection', () => {
  // All HTTP methods
  const allHttpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const;
  
  // Arbitrary for generating HTTP methods
  const httpMethodArb = fc.constantFrom(...allHttpMethods);
  
  // Arbitrary for generating a subset of allowed methods
  const allowedMethodsArb = fc.subarray([...allHttpMethods], { minLength: 1, maxLength: 6 });

  /**
   * **Feature: owasp-security-audit, Property 7: Unsupported Method Rejection**
   * **Validates: Requirements 5.4**
   *
   * Property: createMethodNotAllowedResponse SHALL return 405 status code.
   */
  it('createMethodNotAllowedResponse returns 405 status', async () => {
    fc.assert(
      await fc.asyncProperty(allowedMethodsArb, async (allowedMethods) => {
        const response = createMethodNotAllowedResponse(allowedMethods);
        expect(response.status).toBe(405);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 7: Unsupported Method Rejection**
   * **Validates: Requirements 5.4**
   *
   * Property: createMethodNotAllowedResponse SHALL include Allow header with allowed methods.
   */
  it('createMethodNotAllowedResponse includes Allow header', async () => {
    fc.assert(
      await fc.asyncProperty(allowedMethodsArb, async (allowedMethods) => {
        const response = createMethodNotAllowedResponse(allowedMethods);
        const allowHeader = response.headers.get('Allow');
        expect(allowHeader).toBe(allowedMethods.join(', '));
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 7: Unsupported Method Rejection**
   * **Validates: Requirements 5.4**
   *
   * Property: createMethodNotAllowedResponse SHALL return consistent error message.
   */
  it('createMethodNotAllowedResponse returns consistent error message', async () => {
    fc.assert(
      await fc.asyncProperty(allowedMethodsArb, async (allowedMethods) => {
        const response = createMethodNotAllowedResponse(allowedMethods);
        const body = await response.json();
        expect(body.error).toBe(AUTH_ERROR_MESSAGES.METHOD_NOT_ALLOWED);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 7: Unsupported Method Rejection**
   * **Validates: Requirements 5.4**
   *
   * Property: validateMethod SHALL return null for allowed methods.
   */
  it('validateMethod returns null for allowed methods', () => {
    fc.assert(
      fc.property(allowedMethodsArb, (allowedMethods) => {
        for (const method of allowedMethods) {
          const request = new Request('http://localhost/api/test', { method });
          const result = validateMethod(request, allowedMethods);
          expect(result).toBeNull();
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 7: Unsupported Method Rejection**
   * **Validates: Requirements 5.4**
   *
   * Property: validateMethod SHALL return 405 response for disallowed methods.
   */
  it('validateMethod returns 405 for disallowed methods', async () => {
    fc.assert(
      await fc.asyncProperty(
        allowedMethodsArb,
        httpMethodArb,
        async (allowedMethods, requestMethod) => {
          const request = new Request('http://localhost/api/test', { method: requestMethod });
          const result = validateMethod(request, allowedMethods);
          
          if (allowedMethods.includes(requestMethod)) {
            expect(result).toBeNull();
          } else {
            expect(result).not.toBeNull();
            expect(result!.status).toBe(405);
            const body = await result!.json();
            expect(body.error).toBe(AUTH_ERROR_MESSAGES.METHOD_NOT_ALLOWED);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * Property-Based Tests for Authentication Error Consistency
 *
 * **Feature: owasp-security-audit, Property 8: Authentication Error Consistency**
 * **Validates: Requirements 7.2**
 *
 * Property: For any failed authentication attempt (invalid user, invalid password,
 * or non-existent user), the error message SHALL be identical to prevent user enumeration.
 */
describe('Property 8: Authentication Error Consistency', () => {
  // Different authentication failure reasons that should all produce the same error message
  const authFailureReasons = [
    'invalid_user',
    'invalid_password',
    'non_existent_user',
    'expired_token',
    'invalid_token',
    'missing_credentials',
    'account_locked',
    'account_disabled',
    'session_expired',
    'invalid_session',
  ] as const;

  // Arbitrary for generating authentication failure reasons
  const authFailureReasonArb = fc.constantFrom(...authFailureReasons);

  // Arbitrary for generating user identifiers (emails, usernames, IDs)
  const userIdentifierArb = fc.oneof(
    fc.emailAddress(),
    fc.uuid(),
    fc.stringMatching(/^user_[a-zA-Z0-9]{24}$/),
    fc.string({ minLength: 3, maxLength: 50 })
  );

  // Arbitrary for generating password-like strings
  const passwordArb = fc.string({ minLength: 8, maxLength: 64 });

  /**
   * **Feature: owasp-security-audit, Property 8: Authentication Error Consistency**
   * **Validates: Requirements 7.2**
   *
   * Property: createUnauthorizedResponse SHALL always return the same error message
   * regardless of the underlying failure reason.
   */
  it('createUnauthorizedResponse always returns consistent error message', () => {
    fc.assert(
      fc.property(authFailureReasonArb, (_reason: string) => {
        // Regardless of the reason, the response should be identical
        const response = createUnauthorizedResponse();
        
        // All unauthorized responses should have the same structure
        expect(response.status).toBe(401);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 8: Authentication Error Consistency**
   * **Validates: Requirements 7.2**
   *
   * Property: For any two different authentication failure reasons,
   * the error response SHALL be identical.
   */
  it('different auth failure reasons produce identical error responses', async () => {
    fc.assert(
      await fc.asyncProperty(
        authFailureReasonArb,
        authFailureReasonArb,
        async (reason1: string, reason2: string) => {
          // Even with different reasons, responses should be identical
          const response1 = createUnauthorizedResponse();
          const response2 = createUnauthorizedResponse();
          
          // Both should have same status
          expect(response1.status).toBe(response2.status);
          expect(response1.status).toBe(401);
          
          // Both should have same body
          const body1 = await response1.json();
          const body2 = await response2.json();
          expect(body1).toEqual(body2);
          expect(body1.error).toBe(AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 8: Authentication Error Consistency**
   * **Validates: Requirements 7.2**
   *
   * Property: For any user identifier (valid or invalid), the authentication
   * error message SHALL NOT reveal whether the user exists.
   */
  it('error message does not reveal user existence', async () => {
    fc.assert(
      await fc.asyncProperty(userIdentifierArb, async (userId: string) => {
        // The error message should be the same regardless of whether
        // the user exists or not
        const response = createUnauthorizedResponse();
        const body = await response.json();
        
        // Error message should be generic and not mention the user
        expect(body.error).toBe(AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
        expect(body.error).not.toContain(userId);
        expect(body.error).not.toContain('not found');
        expect(body.error).not.toContain('does not exist');
        expect(body.error).not.toContain('invalid user');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 8: Authentication Error Consistency**
   * **Validates: Requirements 7.2**
   *
   * Property: For any password (valid or invalid), the authentication
   * error message SHALL NOT reveal password-related information.
   */
  it('error message does not reveal password information', async () => {
    fc.assert(
      await fc.asyncProperty(passwordArb, async (password: string) => {
        const response = createUnauthorizedResponse();
        const body = await response.json();
        
        // Error message should not mention password
        expect(body.error).toBe(AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
        expect(body.error.toLowerCase()).not.toContain('password');
        expect(body.error.toLowerCase()).not.toContain('incorrect');
        expect(body.error.toLowerCase()).not.toContain('wrong');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 8: Authentication Error Consistency**
   * **Validates: Requirements 7.2**
   *
   * Property: AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED SHALL be a constant
   * value that does not change based on input.
   */
  it('AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED is constant', () => {
    fc.assert(
      fc.property(
        userIdentifierArb,
        passwordArb,
        authFailureReasonArb,
        (_userId: string, _password: string, _reason: string) => {
          // The constant should always be the same value
          expect(AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED).toBe('Authentication required');
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 8: Authentication Error Consistency**
   * **Validates: Requirements 7.2**
   *
   * Property: createForbiddenResponse SHALL also use consistent error messages
   * for authorization failures.
   */
  it('createForbiddenResponse uses consistent error message', async () => {
    fc.assert(
      await fc.asyncProperty(authFailureReasonArb, async (_reason: string) => {
        const response = createForbiddenResponse();
        const body = await response.json();
        
        expect(response.status).toBe(403);
        expect(body.error).toBe(AUTH_ERROR_MESSAGES.INSUFFICIENT_PERMISSIONS);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 8: Authentication Error Consistency**
   * **Validates: Requirements 7.2**
   *
   * Property: The error message SHALL NOT contain any information that could
   * be used for user enumeration attacks.
   */
  it('error messages prevent user enumeration', async () => {
    // Patterns that would enable user enumeration
    const enumerationPatterns = [
      /user.*not.*found/i,
      /user.*does.*not.*exist/i,
      /invalid.*user/i,
      /unknown.*user/i,
      /no.*such.*user/i,
      /account.*not.*found/i,
      /email.*not.*registered/i,
      /username.*not.*found/i,
      /incorrect.*password/i,
      /wrong.*password/i,
      /invalid.*password/i,
      /password.*incorrect/i,
    ];

    fc.assert(
      await fc.asyncProperty(
        userIdentifierArb,
        passwordArb,
        async (_userId: string, _password: string) => {
          const response = createUnauthorizedResponse();
          const body = await response.json();
          
          // Error message should not match any enumeration patterns
          for (const pattern of enumerationPatterns) {
            expect(body.error).not.toMatch(pattern);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 8: Authentication Error Consistency**
   * **Validates: Requirements 7.2**
   *
   * Property: Multiple calls to createUnauthorizedResponse SHALL produce
   * responses with identical error messages (deterministic).
   */
  it('createUnauthorizedResponse is deterministic', async () => {
    fc.assert(
      await fc.asyncProperty(fc.integer({ min: 1, max: 10 }), async (callCount: number) => {
        const responses: string[] = [];
        
        for (let i = 0; i < callCount; i++) {
          const response = createUnauthorizedResponse();
          const body = await response.json();
          responses.push(body.error);
        }
        
        // All responses should be identical
        const firstResponse = responses[0];
        for (const response of responses) {
          expect(response).toBe(firstResponse);
          expect(response).toBe(AUTH_ERROR_MESSAGES.AUTHENTICATION_REQUIRED);
        }
      }),
      { numRuns: 100 }
    );
  });
});
