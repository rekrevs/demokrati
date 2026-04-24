import "server-only";
import { getRedisConnection } from "../queue";

export interface RateLimitOptions {
  /** Unique identifier for the bucket (e.g., "public-run:1.2.3.4"). */
  key: string;
  /** Maximum requests permitted per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // epoch ms
  retryAfterSeconds: number;
}

/**
 * Fixed-window rate limit backed by Redis INCR + EXPIRE. Minimal but
 * sufficient for our scale; upgrade to a token-bucket lua script if we
 * need bursty behaviour.
 */
export async function rateLimit(
  opts: RateLimitOptions,
): Promise<RateLimitResult> {
  const redis = getRedisConnection("ratelimit");
  const nowMs = Date.now();
  const windowStart =
    Math.floor(nowMs / 1_000 / opts.windowSeconds) * opts.windowSeconds;
  const resetAt = (windowStart + opts.windowSeconds) * 1_000;
  const redisKey = `rl:${opts.key}:${windowStart}`;

  const count = await redis.incr(redisKey);
  if (count === 1) {
    // expire slightly after the window so drift doesn't leak buckets
    await redis.expire(redisKey, opts.windowSeconds + 10);
  }

  const allowed = count <= opts.limit;
  const remaining = Math.max(0, opts.limit - count);
  const retryAfterSeconds = allowed
    ? 0
    : Math.max(1, Math.ceil((resetAt - nowMs) / 1_000));

  return { allowed, remaining, resetAt, retryAfterSeconds };
}

export function clientIpFromHeaders(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return "unknown";
}

export interface EnforceOptions extends Omit<RateLimitOptions, "key"> {
  /** Namespace for the rate-limit bucket (e.g., "public-run"). */
  bucket: string;
  headers: Headers;
}

export async function enforceRateLimit(
  opts: EnforceOptions,
): Promise<RateLimitResult> {
  const ip = clientIpFromHeaders(opts.headers);
  return rateLimit({
    key: `${opts.bucket}:${ip}`,
    limit: opts.limit,
    windowSeconds: opts.windowSeconds,
  });
}

export function rateLimitResponse(
  result: RateLimitResult,
  message = "Too many requests. Slow down.",
): Response {
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message,
      retryAfterSeconds: result.retryAfterSeconds,
      resetAt: result.resetAt,
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(result.retryAfterSeconds),
        "x-ratelimit-reset": String(Math.floor(result.resetAt / 1_000)),
      },
    },
  );
}
