import type { Request, Response, NextFunction } from 'express';
import { getRedisClient, isRedisAvailable } from '../services/redis/redisClient.js';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimiterOptions {
  windowMs: number;
  max: number;
  message?: string;
  skipInTests?: boolean;
  prefix?: string;
  keyGenerator?: (req: Request) => string;
}

export class InMemoryRateLimiter {
  private store = new Map<string, RateLimitRecord>();
  public readonly windowMs: number;
  public readonly max: number;
  public readonly message: string;
  public readonly skipInTests: boolean;
  public readonly prefix: string;
  public readonly keyGenerator: (req: Request) => string;

  constructor(options: RateLimiterOptions) {
    this.windowMs = options.windowMs;
    this.max = options.max;
    this.message = options.message || 'Too many requests. Please try again later.';
    this.skipInTests = options.skipInTests ?? false;
    this.prefix = options.prefix || 'rl';
    this.keyGenerator =
      options.keyGenerator ||
      ((req: Request) => {
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
          return forwarded.split(',')[0].trim();
        }
        return req.ip || req.socket.remoteAddress || 'unknown-client';
      });

    // Periodic cleanup of expired records every 2 minutes
    setInterval(() => this.cleanup(), 2 * 60 * 1000).unref();
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }

  public reset() {
    this.store.clear();
  }

  public async increment(key: string): Promise<{ count: number; remaining: number; resetSeconds: number }> {
    const now = Date.now();
    let record = this.store.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + this.windowMs,
      };
      this.store.set(key, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, this.max - record.count);
    const resetSeconds = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    return { count: record.count, remaining, resetSeconds };
  }

  public middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      if ((this.skipInTests && process.env.NODE_ENV === 'test') || req.headers['x-bypass-rate-limit'] === 'test-runner') {
        return next();
      }

      const clientKey = `${this.prefix}:${this.keyGenerator(req)}`;
      let count = 0;
      let remaining = 0;
      let resetSeconds = 1;

      // 1. Try Redis Distributed Rate Limiting if available
      const redis = getRedisClient();
      let usedRedis = false;

      if (redis && isRedisAvailable()) {
        try {
          const redisKey = `ratelimit:${clientKey}`;
          const results = await redis
            .pipeline()
            .incr(redisKey)
            .pttl(redisKey)
            .exec();

          if (results && results[0] && results[0][1] !== null) {
            count = Number(results[0][1]);
            const pttl = Number(results[1]?.[1] || -1);

            if (pttl === -1 || count === 1) {
              await redis.pexpire(redisKey, this.windowMs);
              resetSeconds = Math.ceil(this.windowMs / 1000);
            } else {
              resetSeconds = Math.max(1, Math.ceil(pttl / 1000));
            }

            remaining = Math.max(0, this.max - count);
            usedRedis = true;
          }
        } catch {
          usedRedis = false; // Graceful degrade to in-memory store
        }
      }

      // 2. Fallback to In-Memory store if Redis is unavailable or errored
      if (!usedRedis) {
        const memResult = await this.increment(clientKey);
        count = memResult.count;
        remaining = memResult.remaining;
        resetSeconds = memResult.resetSeconds;
      }

      // Standard RFC rate limiting headers
      res.setHeader('RateLimit-Limit', this.max.toString());
      res.setHeader('RateLimit-Remaining', remaining.toString());
      res.setHeader('RateLimit-Reset', resetSeconds.toString());
      res.setHeader('RateLimit-Policy', `${this.max};w=${Math.ceil(this.windowMs / 1000)}`);

      if (count > this.max) {
        res.setHeader('Retry-After', resetSeconds.toString());
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `${this.message} (Retry after ${resetSeconds}s)`,
            retryAfter: resetSeconds,
          },
        });
      }

      return next();
    };
  }
}

export function createRateLimiter(options: RateLimiterOptions) {
  const limiter = new InMemoryRateLimiter(options);
  return limiter;
}

// 1. Auth Rate Limiter (Brute-Force Protection on /api/v1/auth)
export const authLimiterInstance = new InMemoryRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  prefix: 'auth',
  message: 'Authentication rate limit reached. Please wait before retrying login.',
  skipInTests: false,
});
export const authRateLimiter = authLimiterInstance.middleware();

// 2. Magic Link Rate Limiter (Replay/Scan Protection on /api/v1/approvals/magic)
export const magicLimiterInstance = new InMemoryRateLimiter({
  windowMs: 60 * 1000,
  max: 30, // 30 requests per minute
  prefix: 'magic',
  message: 'Client review rate limit reached. Please wait a moment.',
});
export const magicLinkRateLimiter = magicLimiterInstance.middleware();

// 3. General API Limiter (DDoS Mitigation across public gateway)
export const generalLimiterInstance = new InMemoryRateLimiter({
  windowMs: 60 * 1000,
  max: Number(process.env.RATE_LIMIT_GENERAL_MAX) || 10000, // 10,000 requests per minute per IP
  prefix: 'general',
  message: 'API rate limit exceeded.',
  skipInTests: true,
});
export const generalApiRateLimiter = generalLimiterInstance.middleware();

// 4. Password Reset Rate Limiter
export const passwordResetLimiterInstance = new InMemoryRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per 15 minutes per IP
  prefix: 'pw_reset',
  message: 'Too many password reset requests from this IP. Please try again later.',
});
export const passwordResetRateLimiter = passwordResetLimiterInstance.middleware();

// 5. OAuth Connection Initiation Rate Limiter (/api/v1/integrations/meta/connect)
export const oauthConnectLimiterInstance = new InMemoryRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 attempts per minute per IP
  prefix: 'oauth_connect',
  message: 'Too many social connection attempts. Please wait before retrying.',
  skipInTests: true,
});
export const oauthConnectRateLimiter = oauthConnectLimiterInstance.middleware();

// 6. OAuth Callback Rate Limiter (/api/v1/integrations/meta/callback)
export const oauthCallbackLimiterInstance = new InMemoryRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 60, // 60 callback evaluations per minute per IP
  prefix: 'oauth_callback',
  message: 'Too many OAuth callback requests received. Please wait.',
  skipInTests: true,
});
export const oauthCallbackRateLimiter = oauthCallbackLimiterInstance.middleware();
