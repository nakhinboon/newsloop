/**
 * Property-Based Tests for Security Event Logging
 *
 * **Feature: owasp-security-audit, Property 10: Security Event Logging Format**
 * **Validates: Requirements 9.1, 9.4**
 *
 * **Feature: owasp-security-audit, Property 12: Sensitive Data Log Exclusion**
 * **Validates: Requirements 2.4**
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  formatStructuredLog,
  sanitizeForLogging,
  isSensitiveKey,
  isSensitiveValue,
  SecurityEvent,
  SecurityEventType,
  SecurityLogEntry,
} from './logger';

// All valid security event types
const securityEventTypes: SecurityEventType[] = [
  'AUTH_FAILURE',
  'AUTHZ_FAILURE',
  'RATE_LIMIT',
  'VALIDATION_ERROR',
  'SUSPICIOUS_ACTIVITY',
];

// Arbitrary for generating valid security event types
const securityEventTypeArb = fc.constantFrom(...securityEventTypes);

// Arbitrary for generating valid endpoint paths
const endpointArb = fc.oneof(
  fc.constant('/api/admin/users'),
  fc.constant('/api/admin/posts'),
  fc.constant('/api/admin/media'),
  fc.constant('/api/posts'),
  fc.constant('/api/categories'),
  fc.stringMatching(/^\/api\/[a-z]+\/[a-z]+$/)
);

// Arbitrary for generating HTTP methods
const httpMethodArb = fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH');

// Arbitrary for generating valid IP addresses
const ipAddressArb = fc.oneof(
  fc.tuple(
    fc.integer({ min: 1, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 0, max: 255 }),
    fc.integer({ min: 1, max: 254 })
  ).map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`),
  fc.constant('::1'),
  fc.constant('2001:db8::1')
);


// Arbitrary for generating user agent strings
const userAgentArb = fc.oneof(
  fc.constant('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'),
  fc.constant('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'),
  fc.constant('curl/7.68.0'),
  fc.stringMatching(/^[A-Za-z]+\/[0-9.]+/)
);

// Arbitrary for generating user IDs
const userIdArb = fc.oneof(
  fc.uuid(),
  fc.stringMatching(/^user_[a-zA-Z0-9]{24}$/),
  fc.constant(undefined)
);

// Arbitrary for generating HTTP status codes
const statusCodeArb = fc.oneof(
  fc.constant(400),
  fc.constant(401),
  fc.constant(403),
  fc.constant(404),
  fc.constant(429),
  fc.constant(500),
  fc.integer({ min: 400, max: 599 })
);

// Arbitrary for generating safe details objects (no sensitive data)
const safeDetailsArb = fc.record({
  reason: fc.option(fc.string(), { nil: undefined }),
  field: fc.option(fc.string(), { nil: undefined }),
  limit: fc.option(fc.integer({ min: 1, max: 1000 }), { nil: undefined }),
  requiredRole: fc.option(fc.constantFrom('admin', 'editor'), { nil: undefined }),
  actualRole: fc.option(fc.constantFrom('admin', 'editor', 'user', undefined), { nil: undefined }),
});

// Arbitrary for generating valid dates (avoiding NaN dates)
const validDateArb = fc.integer({
  min: new Date('2020-01-01').getTime(),
  max: new Date('2030-12-31').getTime(),
}).map(timestamp => new Date(timestamp));

// Arbitrary for generating complete security events
const securityEventArb: fc.Arbitrary<SecurityEvent> = fc.record({
  type: securityEventTypeArb,
  timestamp: validDateArb,
  userId: userIdArb,
  ip: fc.option(ipAddressArb, { nil: undefined }),
  userAgent: fc.option(userAgentArb, { nil: undefined }),
  endpoint: endpointArb,
  method: fc.option(httpMethodArb, { nil: undefined }),
  statusCode: fc.option(statusCodeArb, { nil: undefined }),
  details: safeDetailsArb,
});

// Arbitrary for generating minimal security events (only required fields)
const minimalSecurityEventArb: fc.Arbitrary<SecurityEvent> = fc.record({
  type: securityEventTypeArb,
  timestamp: validDateArb,
  endpoint: endpointArb,
  details: fc.constant({}),
});

describe('Property 10: Security Event Logging Format', () => {
  /**
   * **Feature: owasp-security-audit, Property 10: Security Event Logging Format**
   * **Validates: Requirements 9.1, 9.4**
   *
   * Property: For any security event, formatStructuredLog SHALL return valid JSON.
   */
  it('always returns valid JSON', () => {
    fc.assert(
      fc.property(securityEventArb, (event: SecurityEvent) => {
        const logOutput = formatStructuredLog(event);
        expect(() => JSON.parse(logOutput)).not.toThrow();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 10: Security Event Logging Format**
   * **Validates: Requirements 9.1, 9.4**
   *
   * Property: For any security event, the log entry SHALL contain a timestamp
   * in ISO 8601 format.
   */
  it('always contains timestamp in ISO 8601 format', () => {
    fc.assert(
      fc.property(securityEventArb, (event: SecurityEvent) => {
        const logOutput = formatStructuredLog(event);
        const parsed: SecurityLogEntry = JSON.parse(logOutput);
        
        expect(parsed.timestamp).toBeDefined();
        expect(typeof parsed.timestamp).toBe('string');
        // Verify ISO 8601 format
        const parsedDate = new Date(parsed.timestamp);
        expect(parsedDate.toISOString()).toBe(parsed.timestamp);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 10: Security Event Logging Format**
   * **Validates: Requirements 9.1, 9.4**
   *
   * Property: For any security event, the log entry SHALL contain the event type.
   */
  it('always contains event type', () => {
    fc.assert(
      fc.property(securityEventArb, (event: SecurityEvent) => {
        const logOutput = formatStructuredLog(event);
        const parsed: SecurityLogEntry = JSON.parse(logOutput);
        
        expect(parsed.eventType).toBeDefined();
        expect(securityEventTypes).toContain(parsed.eventType);
        expect(parsed.eventType).toBe(event.type);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 10: Security Event Logging Format**
   * **Validates: Requirements 9.1, 9.4**
   *
   * Property: For any security event, the log entry SHALL contain the endpoint.
   */
  it('always contains endpoint', () => {
    fc.assert(
      fc.property(securityEventArb, (event: SecurityEvent) => {
        const logOutput = formatStructuredLog(event);
        const parsed: SecurityLogEntry = JSON.parse(logOutput);
        
        expect(parsed.endpoint).toBeDefined();
        expect(typeof parsed.endpoint).toBe('string');
        expect(parsed.endpoint).toBe(event.endpoint);
      }),
      { numRuns: 100 }
    );
  });


  /**
   * **Feature: owasp-security-audit, Property 10: Security Event Logging Format**
   * **Validates: Requirements 9.1, 9.4**
   *
   * Property: For any security event, the log entry SHALL contain a severity level.
   */
  it('always contains severity level', () => {
    const validSeverities = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];
    
    fc.assert(
      fc.property(securityEventArb, (event: SecurityEvent) => {
        const logOutput = formatStructuredLog(event);
        const parsed: SecurityLogEntry = JSON.parse(logOutput);
        
        expect(parsed.level).toBeDefined();
        expect(validSeverities).toContain(parsed.level);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 10: Security Event Logging Format**
   * **Validates: Requirements 9.1, 9.4**
   *
   * Property: For any security event, the log entry SHALL contain a human-readable message.
   */
  it('always contains a message', () => {
    fc.assert(
      fc.property(securityEventArb, (event: SecurityEvent) => {
        const logOutput = formatStructuredLog(event);
        const parsed: SecurityLogEntry = JSON.parse(logOutput);
        
        expect(parsed.message).toBeDefined();
        expect(typeof parsed.message).toBe('string');
        expect(parsed.message.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 10: Security Event Logging Format**
   * **Validates: Requirements 9.1, 9.4**
   *
   * Property: For any security event, the log entry SHALL contain a details object.
   */
  it('always contains details object', () => {
    fc.assert(
      fc.property(securityEventArb, (event: SecurityEvent) => {
        const logOutput = formatStructuredLog(event);
        const parsed: SecurityLogEntry = JSON.parse(logOutput);
        
        expect(parsed.details).toBeDefined();
        expect(typeof parsed.details).toBe('object');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 10: Security Event Logging Format**
   * **Validates: Requirements 9.1, 9.4**
   *
   * Property: For any security event with optional fields, those fields SHALL
   * be included in the log entry when present.
   */
  it('includes optional fields when present', () => {
    fc.assert(
      fc.property(securityEventArb, (event: SecurityEvent) => {
        const logOutput = formatStructuredLog(event);
        const parsed: SecurityLogEntry = JSON.parse(logOutput);
        
        // Check optional fields are included when present in event
        if (event.method) {
          expect(parsed.method).toBe(event.method);
        }
        if (event.statusCode !== undefined) {
          expect(parsed.statusCode).toBe(event.statusCode);
        }
        if (event.userId) {
          expect(parsed.userId).toBe(event.userId);
        }
        if (event.ip) {
          expect(parsed.ip).toBe(event.ip);
        }
        if (event.userAgent) {
          expect(parsed.userAgent).toBe(event.userAgent);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 10: Security Event Logging Format**
   * **Validates: Requirements 9.1, 9.4**
   *
   * Property: For any minimal security event (only required fields),
   * formatStructuredLog SHALL still produce valid structured output.
   */
  it('handles minimal events with only required fields', () => {
    fc.assert(
      fc.property(minimalSecurityEventArb, (event: SecurityEvent) => {
        const logOutput = formatStructuredLog(event);
        const parsed: SecurityLogEntry = JSON.parse(logOutput);
        
        // Required fields must be present
        expect(parsed.timestamp).toBeDefined();
        expect(parsed.eventType).toBeDefined();
        expect(parsed.endpoint).toBeDefined();
        expect(parsed.level).toBeDefined();
        expect(parsed.message).toBeDefined();
        expect(parsed.details).toBeDefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 10: Security Event Logging Format**
   * **Validates: Requirements 9.1, 9.4**
   *
   * Property: The timestamp in the log entry SHALL match the event timestamp.
   */
  it('timestamp matches event timestamp', () => {
    fc.assert(
      fc.property(securityEventArb, (event: SecurityEvent) => {
        const logOutput = formatStructuredLog(event);
        const parsed: SecurityLogEntry = JSON.parse(logOutput);
        
        expect(parsed.timestamp).toBe(event.timestamp.toISOString());
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 10: Security Event Logging Format**
   * **Validates: Requirements 9.1, 9.4**
   *
   * Property: AUTH_FAILURE events SHALL have WARNING severity.
   */
  it('AUTH_FAILURE events have WARNING severity', () => {
    const authFailureEventArb = securityEventArb.map(event => ({
      ...event,
      type: 'AUTH_FAILURE' as SecurityEventType,
    }));

    fc.assert(
      fc.property(authFailureEventArb, (event: SecurityEvent) => {
        const logOutput = formatStructuredLog(event);
        const parsed: SecurityLogEntry = JSON.parse(logOutput);
        
        expect(parsed.level).toBe('WARNING');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 10: Security Event Logging Format**
   * **Validates: Requirements 9.1, 9.4**
   *
   * Property: SUSPICIOUS_ACTIVITY events SHALL have ERROR severity.
   */
  it('SUSPICIOUS_ACTIVITY events have ERROR severity', () => {
    const suspiciousEventArb = securityEventArb.map(event => ({
      ...event,
      type: 'SUSPICIOUS_ACTIVITY' as SecurityEventType,
    }));

    fc.assert(
      fc.property(suspiciousEventArb, (event: SecurityEvent) => {
        const logOutput = formatStructuredLog(event);
        const parsed: SecurityLogEntry = JSON.parse(logOutput);
        
        expect(parsed.level).toBe('ERROR');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 10: Security Event Logging Format**
   * **Validates: Requirements 9.1, 9.4**
   *
   * Property: The message SHALL contain the endpoint for context.
   */
  it('message contains endpoint for context', () => {
    fc.assert(
      fc.property(securityEventArb, (event: SecurityEvent) => {
        const logOutput = formatStructuredLog(event);
        const parsed: SecurityLogEntry = JSON.parse(logOutput);
        
        expect(parsed.message).toContain(event.endpoint);
      }),
      { numRuns: 100 }
    );
  });
});


/**
 * Property-Based Tests for Sensitive Data Log Exclusion
 *
 * **Feature: owasp-security-audit, Property 12: Sensitive Data Log Exclusion**
 * **Validates: Requirements 2.4**
 *
 * Property: For any log entry, the content SHALL NOT contain passwords,
 * API keys, tokens, or other sensitive credentials.
 */
describe('Property 12: Sensitive Data Log Exclusion', () => {
  // Sensitive key names that should be redacted
  const sensitiveKeyNames = [
    'password',
    'passwd',
    'secret',
    'token',
    'apiKey',
    'api_key',
    'authKey',
    'auth_key',
    'privateKey',
    'private_key',
    'accessKey',
    'access_key',
    'credential',
    'bearer',
    'authorization',
    'cookie',
    'session',
    'jwt',
    'creditCard',
    'credit_card',
    'cardNumber',
    'card_number',
    'cvv',
    'ssn',
    'socialSecurity',
    'social_security',
  ];

  // Sensitive value patterns that should be redacted
  const sensitiveValueExamples = [
    'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U',
    'sk_live_1234567890abcdef',
    'pk_test_abcdefghijklmnop',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4', // 32-char hex string
    'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2', // 64-char hex string
  ];

  // Arbitrary for generating sensitive key names
  const sensitiveKeyArb = fc.constantFrom(...sensitiveKeyNames);

  // Arbitrary for generating sensitive values
  const sensitiveValueArb = fc.constantFrom(...sensitiveValueExamples);

  // Arbitrary for generating random sensitive data in details
  const sensitiveDetailsArb = fc.record({
    password: fc.string({ minLength: 8, maxLength: 32 }),
    token: fc.string({ minLength: 16, maxLength: 64 }),
    apiKey: fc.string({ minLength: 16, maxLength: 64 }),
    secret: fc.string({ minLength: 8, maxLength: 32 }),
  });

  // Arbitrary for generating nested objects with sensitive data
  const nestedSensitiveDetailsArb = fc.record({
    user: fc.record({
      name: fc.string(),
      password: fc.string({ minLength: 8, maxLength: 32 }),
    }),
    auth: fc.record({
      token: fc.string({ minLength: 16, maxLength: 64 }),
      apiKey: fc.string({ minLength: 16, maxLength: 64 }),
    }),
  });

  // Arbitrary for generating security events with sensitive data in details
  const eventWithSensitiveDataArb: fc.Arbitrary<SecurityEvent> = fc.record({
    type: securityEventTypeArb,
    timestamp: validDateArb,
    userId: userIdArb,
    ip: fc.option(ipAddressArb, { nil: undefined }),
    userAgent: fc.option(userAgentArb, { nil: undefined }),
    endpoint: endpointArb,
    method: fc.option(httpMethodArb, { nil: undefined }),
    statusCode: fc.option(statusCodeArb, { nil: undefined }),
    details: sensitiveDetailsArb,
  });

  // Arbitrary for generating events with nested sensitive data
  const eventWithNestedSensitiveDataArb: fc.Arbitrary<SecurityEvent> = fc.record({
    type: securityEventTypeArb,
    timestamp: validDateArb,
    userId: userIdArb,
    ip: fc.option(ipAddressArb, { nil: undefined }),
    userAgent: fc.option(userAgentArb, { nil: undefined }),
    endpoint: endpointArb,
    method: fc.option(httpMethodArb, { nil: undefined }),
    statusCode: fc.option(statusCodeArb, { nil: undefined }),
    details: nestedSensitiveDetailsArb,
  });

  /**
   * **Feature: owasp-security-audit, Property 12: Sensitive Data Log Exclusion**
   * **Validates: Requirements 2.4**
   *
   * Property: isSensitiveKey SHALL return true for all known sensitive key patterns.
   */
  it('isSensitiveKey detects all sensitive key patterns', () => {
    fc.assert(
      fc.property(sensitiveKeyArb, (key: string) => {
        expect(isSensitiveKey(key)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 12: Sensitive Data Log Exclusion**
   * **Validates: Requirements 2.4**
   *
   * Property: isSensitiveValue SHALL return true for values that look like tokens/keys.
   */
  it('isSensitiveValue detects sensitive value patterns', () => {
    fc.assert(
      fc.property(sensitiveValueArb, (value: string) => {
        expect(isSensitiveValue(value)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 12: Sensitive Data Log Exclusion**
   * **Validates: Requirements 2.4**
   *
   * Property: For any object with sensitive keys, sanitizeForLogging SHALL
   * replace all sensitive values with '[REDACTED]'.
   */
  it('sanitizeForLogging redacts all sensitive keys', () => {
    fc.assert(
      fc.property(sensitiveDetailsArb, (details: Record<string, unknown>) => {
        const sanitized = sanitizeForLogging(details);
        
        // All sensitive keys should be redacted
        for (const key of Object.keys(details)) {
          if (isSensitiveKey(key)) {
            expect(sanitized[key]).toBe('[REDACTED]');
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 12: Sensitive Data Log Exclusion**
   * **Validates: Requirements 2.4**
   *
   * Property: For any nested object with sensitive keys, sanitizeForLogging SHALL
   * recursively redact all sensitive values.
   */
  it('sanitizeForLogging recursively redacts nested sensitive data', () => {
    fc.assert(
      fc.property(nestedSensitiveDetailsArb, (details: Record<string, unknown>) => {
        const sanitized = sanitizeForLogging(details);
        
        // Check nested user object
        const sanitizedUser = sanitized.user as Record<string, unknown>;
        expect(sanitizedUser.password).toBe('[REDACTED]');
        
        // Check nested auth object
        const sanitizedAuth = sanitized.auth as Record<string, unknown>;
        expect(sanitizedAuth.token).toBe('[REDACTED]');
        expect(sanitizedAuth.apiKey).toBe('[REDACTED]');
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 12: Sensitive Data Log Exclusion**
   * **Validates: Requirements 2.4**
   *
   * Property: For any security event with sensitive data in details,
   * formatStructuredLog SHALL NOT include the actual sensitive values.
   */
  it('formatStructuredLog excludes sensitive data from output', () => {
    fc.assert(
      fc.property(eventWithSensitiveDataArb, (event: SecurityEvent) => {
        const logOutput = formatStructuredLog(event);
        const parsed: SecurityLogEntry = JSON.parse(logOutput);
        
        // Verify sensitive keys are redacted in the output
        const details = parsed.details as Record<string, unknown>;
        
        if ('password' in event.details) {
          expect(details.password).toBe('[REDACTED]');
          expect(logOutput).not.toContain(event.details.password as string);
        }
        if ('token' in event.details) {
          expect(details.token).toBe('[REDACTED]');
          expect(logOutput).not.toContain(event.details.token as string);
        }
        if ('apiKey' in event.details) {
          expect(details.apiKey).toBe('[REDACTED]');
          expect(logOutput).not.toContain(event.details.apiKey as string);
        }
        if ('secret' in event.details) {
          expect(details.secret).toBe('[REDACTED]');
          expect(logOutput).not.toContain(event.details.secret as string);
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 12: Sensitive Data Log Exclusion**
   * **Validates: Requirements 2.4**
   *
   * Property: For any security event with nested sensitive data,
   * formatStructuredLog SHALL NOT include the actual sensitive values.
   */
  it('formatStructuredLog excludes nested sensitive data from output', () => {
    fc.assert(
      fc.property(eventWithNestedSensitiveDataArb, (event: SecurityEvent) => {
        const logOutput = formatStructuredLog(event);
        const parsed: SecurityLogEntry = JSON.parse(logOutput);
        
        // Verify nested sensitive data is redacted
        const details = parsed.details as Record<string, unknown>;
        const user = details.user as Record<string, unknown>;
        const auth = details.auth as Record<string, unknown>;
        
        expect(user.password).toBe('[REDACTED]');
        expect(auth.token).toBe('[REDACTED]');
        expect(auth.apiKey).toBe('[REDACTED]');
        
        // Verify original values are not in the output
        const eventUser = (event.details as Record<string, unknown>).user as Record<string, unknown>;
        const eventAuth = (event.details as Record<string, unknown>).auth as Record<string, unknown>;
        
        expect(logOutput).not.toContain(eventUser.password as string);
        expect(logOutput).not.toContain(eventAuth.token as string);
        expect(logOutput).not.toContain(eventAuth.apiKey as string);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 12: Sensitive Data Log Exclusion**
   * **Validates: Requirements 2.4**
   *
   * Property: For any value that looks like a sensitive credential (JWT, API key),
   * sanitizeForLogging SHALL redact it even if the key name is not sensitive.
   */
  it('sanitizeForLogging redacts values that look like credentials', () => {
    // Create arbitrary with non-sensitive key names but sensitive values
    const nonSensitiveKeyWithSensitiveValueArb = fc.record({
      data: sensitiveValueArb,
      info: sensitiveValueArb,
      value: sensitiveValueArb,
    });

    fc.assert(
      fc.property(nonSensitiveKeyWithSensitiveValueArb, (obj: Record<string, unknown>) => {
        const sanitized = sanitizeForLogging(obj);
        
        // All values that look like credentials should be redacted
        for (const key of Object.keys(obj)) {
          if (isSensitiveValue(obj[key])) {
            expect(sanitized[key]).toBe('[REDACTED]');
          }
        }
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 12: Sensitive Data Log Exclusion**
   * **Validates: Requirements 2.4**
   *
   * Property: sanitizeForLogging SHALL preserve non-sensitive data unchanged.
   */
  it('sanitizeForLogging preserves non-sensitive data', () => {
    const nonSensitiveDataArb = fc.record({
      name: fc.string(),
      count: fc.integer(),
      enabled: fc.boolean(),
      endpoint: fc.string(),
    });

    fc.assert(
      fc.property(nonSensitiveDataArb, (obj: Record<string, unknown>) => {
        const sanitized = sanitizeForLogging(obj);
        
        // Non-sensitive data should be preserved
        expect(sanitized.name).toBe(obj.name);
        expect(sanitized.count).toBe(obj.count);
        expect(sanitized.enabled).toBe(obj.enabled);
        expect(sanitized.endpoint).toBe(obj.endpoint);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 12: Sensitive Data Log Exclusion**
   * **Validates: Requirements 2.4**
   *
   * Property: For any array containing sensitive values, sanitizeForLogging
   * SHALL redact those values within the array.
   */
  it('sanitizeForLogging redacts sensitive values in arrays', () => {
    // Use non-sensitive key names to test value-based detection in arrays
    const arrayWithSensitiveValuesArb = fc.record({
      items: fc.array(sensitiveValueArb, { minLength: 1, maxLength: 5 }),
      names: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
    });

    fc.assert(
      fc.property(arrayWithSensitiveValuesArb, (obj: Record<string, unknown>) => {
        const sanitized = sanitizeForLogging(obj);
        
        // Sensitive values in arrays should be redacted (detected by value pattern)
        const sanitizedItems = sanitized.items as unknown[];
        for (const item of sanitizedItems) {
          expect(item).toBe('[REDACTED]');
        }
        
        // Non-sensitive values should be preserved
        const originalNames = obj.names as string[];
        const sanitizedNames = sanitized.names as string[];
        expect(sanitizedNames).toEqual(originalNames);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Feature: owasp-security-audit, Property 12: Sensitive Data Log Exclusion**
   * **Validates: Requirements 2.4**
   *
   * Property: For any array stored under a sensitive key name, sanitizeForLogging
   * SHALL redact the entire array.
   */
  it('sanitizeForLogging redacts entire array when key is sensitive', () => {
    const arrayWithSensitiveKeyArb = fc.record({
      tokens: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
      passwords: fc.array(fc.string(), { minLength: 1, maxLength: 5 }),
    });

    fc.assert(
      fc.property(arrayWithSensitiveKeyArb, (obj: Record<string, unknown>) => {
        const sanitized = sanitizeForLogging(obj);
        
        // Entire array should be redacted when key is sensitive
        expect(sanitized.tokens).toBe('[REDACTED]');
        expect(sanitized.passwords).toBe('[REDACTED]');
      }),
      { numRuns: 100 }
    );
  });
});
