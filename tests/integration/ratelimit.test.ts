import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeQueues, getRedisConnection } from "@/lib/queue";
import { rateLimit } from "@/lib/ratelimit";

const enabled = process.env.RUN_INTEGRATION === "1";

describe.skipIf(!enabled)("rate limiter (Redis-backed)", () => {
  beforeAll(async () => {
    // Force a connection so afterAll has something to clean up
    getRedisConnection("ratelimit");
  });
  afterAll(async () => {
    await closeQueues();
  });

  it("allows up to the configured limit then denies", async () => {
    const bucket = `test-${Math.random().toString(36).slice(2, 8)}`;
    const opts = { key: bucket, limit: 3, windowSeconds: 60 };

    const first = await rateLimit(opts);
    const second = await rateLimit(opts);
    const third = await rateLimit(opts);
    const fourth = await rateLimit(opts);

    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(2);
    expect(second.allowed).toBe(true);
    expect(second.remaining).toBe(1);
    expect(third.allowed).toBe(true);
    expect(third.remaining).toBe(0);
    expect(fourth.allowed).toBe(false);
    expect(fourth.remaining).toBe(0);
    expect(fourth.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("different keys do not share counters", async () => {
    const a = `test-a-${Math.random().toString(36).slice(2, 8)}`;
    const b = `test-b-${Math.random().toString(36).slice(2, 8)}`;
    const opts = (k: string) => ({ key: k, limit: 1, windowSeconds: 60 });

    const aFirst = await rateLimit(opts(a));
    const aSecond = await rateLimit(opts(a));
    const bFirst = await rateLimit(opts(b));

    expect(aFirst.allowed).toBe(true);
    expect(aSecond.allowed).toBe(false);
    expect(bFirst.allowed).toBe(true);
  });
});
