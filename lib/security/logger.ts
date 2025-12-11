/**
 * Security Logger Module
 * 
 * Provides structured logging for security-related events with sensitive data exclusion.
 * Implements Requirements 9.1, 9.2, 9.3, 9.4, 2.4
 */

/**
 * Security event types for categorizing security-related activities
 */
export type SecurityEventType =
  | 'AUTH_FAILURE'
  | 'AUTHZ_FAILURE'
  | 'RATE_LIMIT'
  | 'VALIDATION_ERROR'
  | 'SUSPICIOUS_ACTIVITY';

/**
 * Severity levels for security events
 */
export type SecuritySeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

/**
 * Security event structure for logging
 */
export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: Date;
  userId?: string;
  ip?: string;
  userAgent?: string;
  endpoint: string;
  method?: string;
  statusCode?: number;
  details: Record<string, unknown>;
}

/**
 * Structured log entry format
 */
export interface SecurityLogEntry {
  timestamp: string;
  level: SecuritySeverity;
  eventType: SecurityEventType;
  endpoint: string;
  method?: string;
  statusCode?: number;
  userId?: string;
  ip?: string;
  userAgent?: string;
  message: string;
  details: Record<string, unknown>;
}

/**
 * Patterns that indicate sensitive data that should be excluded from logs
 */
const SENSITIVE_PATTERNS: RegExp[] = [
  /password/i,
  /passwd/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /apikey/i,
  /auth[_-]?key/i,
  /private[_-]?key/i,
  /access[_-]?key/i,
  /credential/i,
  /bearer/i,
  /authorization/i,
  /cookie/i,
  /session/i,
  /jwt/i,
  /credit[_-]?card/i,
  /card[_-]?number/i,
  /cvv/i,
  /ssn/i,
  /social[_-]?security/i,
];

/**
 * Values that look like sensitive data (patterns for value detection)
 */
const SENSITIVE_VALUE_PATTERNS: RegExp[] = [
  /^Bearer\s+.+/i,           // Bearer tokens
  /^sk[_-].+/,               // Stripe-style secret keys
  /^pk[_-].+/,               // Stripe-style public keys
  /^[a-f0-9]{32,}$/i,        // Long hex strings (potential tokens/keys)
  /^eyJ[a-zA-Z0-9_-]+\./,    // JWT tokens
];

/**
 * Check if a key name indicates sensitive data
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(key));
}

/**
 * Check if a value looks like sensitive data
 */
export function isSensitiveValue(value: unknown): boolean {
  if (typeof value !== 'string') {
    return false;
  }
  return SENSITIVE_VALUE_PATTERNS.some(pattern => pattern.test(value));
}

/**
 * Recursively sanitize an object by removing sensitive data
 * Replaces sensitive values with '[REDACTED]'
 */
export function sanitizeForLogging(obj: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Check if key indicates sensitive data
    if (isSensitiveKey(key)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Check if value looks like sensitive data
    if (isSensitiveValue(value)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    // Recursively sanitize nested objects
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      sanitized[key] = sanitizeForLogging(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(item => {
        if (item !== null && typeof item === 'object') {
          return sanitizeForLogging(item as Record<string, unknown>);
        }
        if (isSensitiveValue(item)) {
          return '[REDACTED]';
        }
        return item;
      });
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Get severity level based on event type
 */
function getSeverityForEventType(type: SecurityEventType): SecuritySeverity {
  switch (type) {
    case 'AUTH_FAILURE':
      return 'WARNING';
    case 'AUTHZ_FAILURE':
      return 'WARNING';
    case 'RATE_LIMIT':
      return 'WARNING';
    case 'VALIDATION_ERROR':
      return 'INFO';
    case 'SUSPICIOUS_ACTIVITY':
      return 'ERROR';
    default:
      return 'INFO';
  }
}

/**
 * Generate a human-readable message for the event
 */
function generateEventMessage(event: SecurityEvent): string {
  const messages: Record<SecurityEventType, string> = {
    AUTH_FAILURE: 'Authentication failure',
    AUTHZ_FAILURE: 'Authorization denied',
    RATE_LIMIT: 'Rate limit exceeded',
    VALIDATION_ERROR: 'Input validation failed',
    SUSPICIOUS_ACTIVITY: 'Suspicious activity detected',
  };

  return `${messages[event.type]} at ${event.endpoint}`;
}

/**
 * Format a security event into a structured JSON log entry
 * Ensures sensitive data is excluded from the output
 * 
 * @param event - The security event to format
 * @returns JSON string representation of the log entry
 */
export function formatStructuredLog(event: SecurityEvent): string {
  const severity = getSeverityForEventType(event.type);
  const sanitizedDetails = sanitizeForLogging(event.details);

  const logEntry: SecurityLogEntry = {
    timestamp: event.timestamp.toISOString(),
    level: severity,
    eventType: event.type,
    endpoint: event.endpoint,
    message: generateEventMessage(event),
    details: sanitizedDetails,
  };

  // Add optional fields only if present
  if (event.method) {
    logEntry.method = event.method;
  }
  if (event.statusCode !== undefined) {
    logEntry.statusCode = event.statusCode;
  }
  if (event.userId) {
    logEntry.userId = event.userId;
  }
  if (event.ip) {
    logEntry.ip = event.ip;
  }
  if (event.userAgent) {
    logEntry.userAgent = event.userAgent;
  }

  return JSON.stringify(logEntry);
}

/**
 * Log a security event with structured format
 * Automatically excludes sensitive data from logs
 * 
 * @param event - The security event to log
 */
export function logSecurityEvent(event: SecurityEvent): void {
  const logOutput = formatStructuredLog(event);
  const severity = getSeverityForEventType(event.type);

  // Use appropriate console method based on severity
  switch (severity) {
    case 'CRITICAL':
    case 'ERROR':
      console.error(`[SECURITY] ${logOutput}`);
      break;
    case 'WARNING':
      console.warn(`[SECURITY] ${logOutput}`);
      break;
    case 'INFO':
    default:
      console.info(`[SECURITY] ${logOutput}`);
      break;
  }
}

/**
 * Create a security event for authentication failure
 * Implements Requirements 9.2
 */
export function createAuthFailureEvent(
  endpoint: string,
  options: {
    ip?: string;
    userAgent?: string;
    method?: string;
    reason?: string;
  } = {}
): SecurityEvent {
  return {
    type: 'AUTH_FAILURE',
    timestamp: new Date(),
    endpoint,
    ip: options.ip,
    userAgent: options.userAgent,
    method: options.method,
    statusCode: 401,
    details: {
      reason: options.reason ?? 'Authentication required',
    },
  };
}

/**
 * Create a security event for authorization failure
 * Implements Requirements 9.3
 */
export function createAuthzFailureEvent(
  endpoint: string,
  options: {
    userId?: string;
    ip?: string;
    userAgent?: string;
    method?: string;
    requiredRole?: string;
    actualRole?: string;
  } = {}
): SecurityEvent {
  return {
    type: 'AUTHZ_FAILURE',
    timestamp: new Date(),
    endpoint,
    userId: options.userId,
    ip: options.ip,
    userAgent: options.userAgent,
    method: options.method,
    statusCode: 403,
    details: {
      requiredRole: options.requiredRole,
      actualRole: options.actualRole,
    },
  };
}

/**
 * Create a security event for rate limiting
 */
export function createRateLimitEvent(
  endpoint: string,
  options: {
    userId?: string;
    ip?: string;
    userAgent?: string;
    method?: string;
    limit?: number;
    windowMs?: number;
  } = {}
): SecurityEvent {
  return {
    type: 'RATE_LIMIT',
    timestamp: new Date(),
    endpoint,
    userId: options.userId,
    ip: options.ip,
    userAgent: options.userAgent,
    method: options.method,
    statusCode: 429,
    details: {
      limit: options.limit,
      windowMs: options.windowMs,
    },
  };
}

/**
 * Create a security event for validation errors
 */
export function createValidationErrorEvent(
  endpoint: string,
  options: {
    userId?: string;
    ip?: string;
    userAgent?: string;
    method?: string;
    field?: string;
    error?: string;
  } = {}
): SecurityEvent {
  return {
    type: 'VALIDATION_ERROR',
    timestamp: new Date(),
    endpoint,
    userId: options.userId,
    ip: options.ip,
    userAgent: options.userAgent,
    method: options.method,
    statusCode: 400,
    details: {
      field: options.field,
      error: options.error,
    },
  };
}

/**
 * Create a security event for suspicious activity
 */
export function createSuspiciousActivityEvent(
  endpoint: string,
  options: {
    userId?: string;
    ip?: string;
    userAgent?: string;
    method?: string;
    reason?: string;
    indicators?: string[];
  } = {}
): SecurityEvent {
  return {
    type: 'SUSPICIOUS_ACTIVITY',
    timestamp: new Date(),
    endpoint,
    userId: options.userId,
    ip: options.ip,
    userAgent: options.userAgent,
    method: options.method,
    details: {
      reason: options.reason,
      indicators: options.indicators,
    },
  };
}
