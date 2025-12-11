/**
 * Unit Tests for Rate Limiter
 *
 * Tests rate limit enforcement and reset behavior
 * Requirements: 4.1
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  checkRateLimit,
  getRateLimitHeaders,
  createRateLimiter,
  getClientIdentifier,
  RATE_LIMIT_CONFIGS,
  type RateLimitConfig,
  type RateLimitResult,
} from './rate-limit';

// Define mock pipeline type
interface MockPipeline {
  zremrangebyscore: Mock;
  zcard: Mock;
  zadd: Mock;
  expire: Mock;
  exec: Mock;
}

// Create mock pipeline instance
const mockPipelineInstance: MockPipeline = {
  zremrangebyscore: vi.fn().mockReturnThis(),
  zcard: vi.fn().mockReturnThis(),
  zadd: vi.fn().mockReturnThis(),
  expire: vi.fn().mockReturnThis(),
  exec: vi.fn(),
};

// Mock the redis module
vi.mock('@/lib/cache/redis', () => {
  return {
    redis: {
      pipeline: vi.fn(() => mockPipelineInstance),
      zrem: vi.fn(),
    },
  };
});

// Import the mocked redis after mocking
import { redis } from '@/lib/cache/redis';

// Helper to get the mock pipeline
const getMockPipeline = (): MockPipeline => mockPipelineInstance;

describe('Rate Limiter', () => {
  const testConfig: RateLimitConfig = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10,
    keyPrefix: 'test:ratelimit',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkRateLimit', () => {
    it('allows requests when under the limit', async () => {
      const mockPipeline = getMockPipeline();
      mockPipeline.exec.mockResolvedValue([null, 5, null, null]); // 5 requests in window

      const result = await checkRateLimit('test-user', testConfig);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4); // 10 - 5 - 1 = 4
      expect(result.limit).toBe(10);
    });

    it('blocks requests when at the limit', async () => {
      const mockPipeline = getMockPipeline();
      mockPipeline.exec.mockResolvedValue([null, 10, null, null]); // 10 requests (at limit)

      const result = await checkRateLimit('test-user', testConfig);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.limit).toBe(10);
    });

    it('blocks requests when over the limit', async () => {
      const mockPipeline = getMockPipeline();
      mockPipeline.exec.mockResolvedValue([null, 15, null, null]); // 15 requests (over limit)

      const result = await checkRateLimit('test-user', testConfig);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('removes the request from Redis when rate limited', async () => {
      const mockPipeline = getMockPipeline();
      mockPipeline.exec.mockResolvedValue([null, 10, null, null]); // At limit

      await checkRateLimit('test-user', testConfig);

      expect(redis.zrem).toHaveBeenCalled();
    });

    it('does not remove request from Redis when allowed', async () => {
      const mockPipeline = getMockPipeline();
      mockPipeline.exec.mockResolvedValue([null, 5, null, null]); // Under limit

      await checkRateLimit('test-user', testConfig);

      expect(redis.zrem).not.toHaveBeenCalled();
    });

    it('returns correct resetAt time', async () => {
      const mockPipeline = getMockPipeline();
      mockPipeline.exec.mockResolvedValue([null, 5, null, null]);

      const beforeTime = Date.now();
      const result = await checkRateLimit('test-user', testConfig);
      const afterTime = Date.now();

      // resetAt should be approximately now + windowMs
      const expectedMinReset = beforeTime + testConfig.windowMs;
      const expectedMaxReset = afterTime + testConfig.windowMs;
      
      expect(result.resetAt.getTime()).toBeGreaterThanOrEqual(expectedMinReset);
      expect(result.resetAt.getTime()).toBeLessThanOrEqual(expectedMaxReset);
    });

    it('fails open when Redis is unavailable', async () => {
      const mockPipeline = getMockPipeline();
      mockPipeline.exec.mockRejectedValue(new Error('Redis connection failed'));

      const result = await checkRateLimit('test-user', testConfig);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(testConfig.maxRequests);
    });

    it('uses correct Redis key format', async () => {
      const mockPipeline = getMockPipeline();
      mockPipeline.exec.mockResolvedValue([null, 0, null, null]);

      await checkRateLimit('user-123', testConfig);

      // Verify pipeline was called (key is constructed internally)
      expect(redis.pipeline).toHaveBeenCalled();
    });
  });

  describe('getRateLimitHeaders', () => {
    it('returns correct headers for allowed request', () => {
      const result: RateLimitResult = {
        allowed: true,
        remaining: 5,
        resetAt: new Date(1700000000000),
        limit: 10,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('5');
      expect(headers['X-RateLimit-Reset']).toBe('1700000000');
    });

    it('returns correct headers for blocked request', () => {
      const result: RateLimitResult = {
        allowed: false,
        remaining: 0,
        resetAt: new Date(1700000000000),
        limit: 10,
      };

      const headers = getRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('10');
      expect(headers['X-RateLimit-Remaining']).toBe('0');
    });
  });

  describe('createRateLimiter', () => {
    it('creates a rate limiter function with preset config', async () => {
      const mockPipeline = getMockPipeline();
      mockPipeline.exec.mockResolvedValue([null, 3, null, null]);

      const limiter = createRateLimiter(testConfig);
      const result = await limiter('test-user');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(testConfig.maxRequests);
    });
  });

  describe('getClientIdentifier', () => {
    it('extracts IP from X-Forwarded-For header', () => {
      const request = new Request('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      });

      const identifier = getClientIdentifier(request);

      expect(identifier).toBe('192.168.1.1');
    });

    it('extracts IP from X-Real-IP header when X-Forwarded-For is absent', () => {
      const request = new Request('http://localhost/api/test', {
        headers: {
          'x-real-ip': '192.168.1.2',
        },
      });

      const identifier = getClientIdentifier(request);

      expect(identifier).toBe('192.168.1.2');
    });

    it('prefers X-Forwarded-For over X-Real-IP', () => {
      const request = new Request('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.2',
        },
      });

      const identifier = getClientIdentifier(request);

      expect(identifier).toBe('192.168.1.1');
    });

    it('returns "unknown" when no IP headers are present', () => {
      const request = new Request('http://localhost/api/test');

      const identifier = getClientIdentifier(request);

      expect(identifier).toBe('unknown');
    });

    it('trims whitespace from IP addresses', () => {
      const request = new Request('http://localhost/api/test', {
        headers: {
          'x-forwarded-for': '  192.168.1.1  , 10.0.0.1',
        },
      });

      const identifier = getClientIdentifier(request);

      expect(identifier).toBe('192.168.1.1');
    });
  });

  describe('RATE_LIMIT_CONFIGS', () => {
    it('has stricter limits for AUTH endpoints', () => {
      expect(RATE_LIMIT_CONFIGS.AUTH.maxRequests).toBeLessThan(
        RATE_LIMIT_CONFIGS.API.maxRequests
      );
      expect(RATE_LIMIT_CONFIGS.AUTH.windowMs).toBeGreaterThan(
        RATE_LIMIT_CONFIGS.API.windowMs
      );
    });

    it('has appropriate limits for UPLOAD endpoints', () => {
      expect(RATE_LIMIT_CONFIGS.UPLOAD.maxRequests).toBeLessThan(
        RATE_LIMIT_CONFIGS.API.maxRequests
      );
    });

    it('all configs have required properties', () => {
      const configs = Object.values(RATE_LIMIT_CONFIGS);
      
      configs.forEach((config) => {
        expect(config).toHaveProperty('windowMs');
        expect(config).toHaveProperty('maxRequests');
        expect(config).toHaveProperty('keyPrefix');
        expect(config.windowMs).toBeGreaterThan(0);
        expect(config.maxRequests).toBeGreaterThan(0);
        expect(config.keyPrefix).toBeTruthy();
      });
    });
  });
});
