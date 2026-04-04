import type { Context, Next } from "hono";
import { getRedis } from "../services/redis.ts";

/**
 * Simple sliding-window rate limiter using Redis.
 * Limits requests per orgId per minute.
 */
export async function rateLimitMiddleware(c: Context, next: Next) {
  const orgId = c.get("orgId") as string | undefined;
  if (!orgId) return next();

  const record = c.get("apiKeyRecord") as { rateLimit: number } | undefined;
  const limit = record?.rateLimit ?? 100;

  const r = getRedis();
  const key = `shield:ratelimit:${orgId}:${Math.floor(Date.now() / 60000)}`;
  const current = await r.incr(key);

  if (current === 1) {
    await r.expire(key, 120);
  }

  c.header("X-RateLimit-Limit", String(limit));
  c.header("X-RateLimit-Remaining", String(Math.max(0, limit - current)));

  if (current > limit) {
    return c.json({ error: "Rate limit exceeded" }, 429);
  }

  return next();
}
