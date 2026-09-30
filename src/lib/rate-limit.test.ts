import { beforeEach, describe, expect, it } from "vitest";
import { MAX_BUCKETS, rateLimit, rateLimitSize, resetRateLimits } from "./rate-limit";

describe("rate limit", () => {
  beforeEach(() => resetRateLimits());

  it("allows `limit` calls per window, then blocks until the window resets", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000, t0 + i).ok).toBe(true);
    const blocked = rateLimit("k", 3, 1000, t0 + 10);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBe(990);
    expect(rateLimit("k", 3, 1000, t0 + 1000).ok).toBe(true);
  });

  it("never keeps more than MAX_BUCKETS keys, even when every caller uses a fresh key", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < MAX_BUCKETS + 500; i++) rateLimit(`ip-${i}`, 5, 60_000, t0);
    expect(rateLimitSize()).toBeLessThanOrEqual(MAX_BUCKETS);
    // The most recent key is still tracked and limited.
    for (let i = 0; i < 5; i++) rateLimit("ip-last", 5, 60_000, t0);
    expect(rateLimit("ip-last", 5, 60_000, t0).ok).toBe(false);
  });

  it("drops expired buckets before evicting live ones", () => {
    const t0 = 1_000_000;
    for (let i = 0; i < MAX_BUCKETS; i++) rateLimit(`old-${i}`, 5, 1000, t0);
    for (let i = 0; i < 5; i++) rateLimit("live", 5, 60_000, t0 + 2000);
    expect(rateLimitSize()).toBe(1);
    expect(rateLimit("live", 5, 60_000, t0 + 2000).ok).toBe(false);
  });
});
