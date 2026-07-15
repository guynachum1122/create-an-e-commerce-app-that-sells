type RateLimitResult = { success: boolean; remaining: number; resetAt: number };

const memoryStore = new Map<string, { count: number; resetAt: number }>();

function rateLimitMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = memoryStore.get(key);

  if (!entry || now > entry.resetAt) {
    const resetAt = now + windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { success: true, remaining: limit - 1, resetAt };
  }

  if (entry.count >= limit) {
    return { success: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { success: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

/** Upstash REST sliding window when credentials are configured */
async function rateLimitUpstash(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const redisKey = `rl:${key}`;

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([
        ['INCR', redisKey],
        ['TTL', redisKey],
      ]),
    });

    if (!res.ok) return null;
    const results = (await res.json()) as { result: number }[];
    const count = results[0]?.result ?? 1;
    let ttl = results[1]?.result ?? -1;

    if (ttl === -1) {
      await fetch(`${url}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(['EXPIRE', redisKey, windowSec]),
      });
      ttl = windowSec;
    }

    const resetAt = Date.now() + ttl * 1000;
    if (count > limit) {
      return { success: false, remaining: 0, resetAt };
    }
    return { success: true, remaining: limit - count, resetAt };
  } catch {
    return null;
  }
}

/** Sync rate limit — in-memory only (use in authorize callback) */
export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  return rateLimitMemory(key, limit, windowMs);
}

/** Async rate limit — prefers Upstash when configured, falls back to in-memory in dev */
export async function rateLimitAsync(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const upstash = await rateLimitUpstash(key, limit, windowMs);
  if (upstash) return upstash;

  return rateLimitMemory(key, limit, windowMs);
}

export function getClientIp(request: Request): string {
  return (
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown'
  );
}
