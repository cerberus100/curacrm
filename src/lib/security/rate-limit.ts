import { NextRequest } from 'next/server';

// Simple in-memory rate limiter (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: NextRequest) => string;
}

/**
 * Simple rate limiter for API endpoints
 * @param options - Rate limiting configuration
 * @returns Rate limit check function
 */
export function createRateLimit(options: RateLimitOptions) {
  const { windowMs, maxRequests, keyGenerator } = options;

  return (req: NextRequest): { allowed: boolean; remaining: number; resetTime: number } => {
    const now = Date.now();
    const key = keyGenerator ? keyGenerator(req) : getDefaultKey(req);
    
    const current = rateLimitMap.get(key);
    
    if (!current || now > current.resetTime) {
      // First request or window expired
      rateLimitMap.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: now + windowMs
      };
    }
    
    if (current.count >= maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      };
    }
    
    // Increment counter
    current.count++;
    rateLimitMap.set(key, current);
    
    return {
      allowed: true,
      remaining: maxRequests - current.count,
      resetTime: current.resetTime
    };
  };
}

/**
 * Default key generator using IP address
 */
function getDefaultKey(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : req.ip || 'unknown';
  return `rate_limit:${ip}`;
}

/**
 * User-based key generator
 */
export function getUserKey(req: NextRequest): string {
  const userId = req.headers.get('x-user-id') || 'anonymous';
  return `rate_limit:user:${userId}`;
}

/**
 * Pre-configured rate limiters for common use cases
 */
export const rateLimiters = {
  // Strict rate limiting for sensitive endpoints
  strict: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 10, // 10 requests per 15 minutes
  }),
  
  // Moderate rate limiting for general API endpoints
  moderate: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
  }),
  
  // Lenient rate limiting for public endpoints
  lenient: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // 1000 requests per 15 minutes
  }),
  
  // User-based rate limiting
  userBased: createRateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 200, // 200 requests per 15 minutes per user
    keyGenerator: getUserKey,
  }),
};

/**
 * Rate limit middleware for API routes
 */
export function withRateLimit(
  rateLimiter: ReturnType<typeof createRateLimit>,
  options: { skipSuccessfulRequests?: boolean } = {}
) {
  return (req: NextRequest) => {
    const result = rateLimiter(req);
    
    if (!result.allowed) {
      return {
        error: 'Rate limit exceeded',
        remaining: result.remaining,
        resetTime: result.resetTime,
        status: 429
      };
    }
    
    return null; // No error
  };
}
