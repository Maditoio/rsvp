import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const memory = new Map<string, { count: number; resetAt: number }>();

function memoryLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = memory.get(key);
  if (!current || current.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1 };
  }
  if (current.count >= limit) {
    return { success: false, remaining: 0 };
  }
  current.count += 1;
  return { success: true, remaining: limit - current.count };
}

function redis() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return Redis.fromEnv();
}

export async function rateLimit(
  identifier: string,
  limit: number,
  windowSeconds: number,
) {
  const client = redis();
  if (!client) {
    return memoryLimit(identifier, limit, windowSeconds * 1000);
  }

  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    prefix: "delegate",
  });
  const result = await limiter.limit(identifier);
  return { success: result.success, remaining: result.remaining };
}
