/**
 * Rate Limiting with Redis (Upstash)
 * Implements sliding window rate limiting algorithm
 * Requirements: 4.1
 */

import { redis } from '@/lib/cache/redis';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed per window */
  maxRequests: number;
  /** Redis key prefix for namespacing */
  keyPrefix: string;
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** When the rate limit resets */
  resetAt: Date;
  /** Total limit for the window */
  limit: number;
}

/**
 * Default rate limit configurations for different endpoint types
 */
export const RATE_LIMIT_CONFIGS = {
  /** Standard API endpoints */
  API: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'ratelimit:api',
  },
  /** Authentication endpoints (stricter) */
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10,
    keyPrefix: 'ratelimit:auth',
  },
  /** Admin endpoints */
  ADMIN: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    keyPrefix: 'ratelimit:admin',
  },
  /** File upload endpoints */
  UPLOAD: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20,
    keyPrefix: 'ratelimit:upload',
  },
} as const;

/**
 * Check rate limit for an identifier using sliding window algorithm
 * 
 * @param identifier Unique identifier (e.g., IP address, user ID)
 * @param config Rate limit configuration
 * @returns Rate limit result with allowed status and metadata
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { windowMs, maxRequests, keyPrefix } = config;
  const now = Date.now();
  const windowStart = now - windowMs;
  const key = `${keyPrefix}:${identifier}`;

  try {
    // Use Redis sorted set for sliding window
    // Score = timestamp, Member = unique request ID
    const requestId = `${now}:${Math.random().toString(36).substring(2, 9)}`;

    // Execute commands in pipeline for atomicity
    const pipeline = redis.pipeline();
    
    // Remove old entries outside the window
    pipeline.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    pipeline.zcard(key);
    
    // Add current request
    pipeline.zadd(key, { score: now, member: requestId });
    
    // Set expiry on the key
    pipeline.expire(key, Math.ceil(windowMs / 1000));

    const results = await pipeline.exec();
    
    // Get count from second command (zcard)
    const currentCount = (results[1] as number) || 0;
    
    const allowed = currentCount < maxRequests;
    const remaining = Math.max(0, maxRequests - currentCount - 1);
    
    // Calculate reset time (end of current window)
    const resetAt = new Date(now + windowMs);

    // If not allowed, remove the request we just added
    if (!allowed) {
      await redis.zrem(key, requestId);
    }

    return {
      allowed,
      remaining: allowed ? remaining : 0,
      resetAt,
      limit: maxRequests,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // Fail open - allow request if Redis is unavailable
    return {
      allowed: true,
      remaining: maxRequests,
      resetAt: new Date(now + windowMs),
      limit: maxRequests,
    };
  }
}

/**
 * Get rate limit headers for response
 * 
 * @param result Rate limit result
 * @returns Headers object with rate limit information
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetAt.getTime() / 1000).toString(),
  };
}

/**
 * Create a rate limiter function with preset configuration
 * 
 * @param config Rate limit configuration
 * @returns Function that checks rate limit for an identifier
 */
export function createRateLimiter(config: RateLimitConfig) {
  return (identifier: string) => checkRateLimit(identifier, config);
}

/**
 * Extract client identifier from request
 * Uses X-Forwarded-For header or falls back to a default
 * 
 * @param request The incoming request
 * @returns Client identifier string
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    // Get first IP from comma-separated list
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  // Fallback for development/testing
  return 'unknown';
}

/**
 * Apply rate limiting to an API route
 * Returns a rate limit error response if limit exceeded, null otherwise
 * 
 * @param request The incoming request
 * @param configType The type of rate limit config to use
 * @returns NextResponse with 429 status if rate limited, null if allowed
 */
export async function applyRateLimit(
  request: Request,
  configType: keyof typeof RATE_LIMIT_CONFIGS = 'API'
): Promise<{ response: Response; headers: Record<string, string> } | null> {
  const { NextResponse } = await import('next/server');
  
  const identifier = getClientIdentifier(request);
  const config = RATE_LIMIT_CONFIGS[configType];
  const result = await checkRateLimit(identifier, config);
  const headers = getRateLimitHeaders(result);
  
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);
    const response = NextResponse.json(
      { error: 'Too many requests', retryAfter },
      { 
        status: 429,
        headers: {
          ...headers,
          'Retry-After': retryAfter.toString(),
        }
      }
    );
    return { response, headers };
  }
  
  return null;
}
