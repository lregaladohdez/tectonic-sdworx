/** Fixed-window in-memory rate limiter. One process, good enough for the demo. */
const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * Upper bound on distinct keys kept in memory. Anonymous callers choose part of the
 * key (their IP), so without a cap a flood of spoofed addresses would grow the map
 * without limit. Expired buckets are dropped first; if the map is still full the
 * oldest bucket goes, which only ever loosens the limit for that one key.
 */
export const MAX_BUCKETS = 10_000;

function makeRoom(now: number): void {
  for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key);
  if (buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest !== undefined) buckets.delete(oldest);
  }
}

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): { ok: boolean; retryAfterMs: number } {
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (!bucket && buckets.size >= MAX_BUCKETS) makeRoom(now);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterMs: 0 };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { ok: false, retryAfterMs: bucket.resetAt - now };
  return { ok: true, retryAfterMs: 0 };
}

/** Number of keys currently tracked (tests). */
export function rateLimitSize(): number {
  return buckets.size;
}

/** Test helper. */
export function resetRateLimits(): void {
  buckets.clear();
}
