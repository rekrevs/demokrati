import { Worker } from "bullmq";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import IORedis from "ioredis";
import {
  bullConnectionFromUrl,
  closeQueues,
  getQueue,
} from "@/lib/queue";
import { enqueue } from "@/lib/queue/enqueue";

/**
 * Integration test: requires a real Redis at REDIS_URL (or default
 * redis://localhost:6379). Gated on RUN_INTEGRATION so `pnpm test`
 * stays green without infra.
 *
 *   docker compose -f docker-compose.dev.yml up -d redis
 *   RUN_INTEGRATION=1 pnpm vitest run tests/integration/queue.test.ts
 */

const enabled = process.env.RUN_INTEGRATION === "1";

async function redisReachable(url: string): Promise<boolean> {
  const probe = new IORedis(url, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
  });
  try {
    await probe.connect();
    await probe.ping();
    return true;
  } catch {
    return false;
  } finally {
    probe.disconnect();
  }
}

describe.skipIf(!enabled)("BullMQ queue integration", () => {
  const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
  let worker: Worker | null = null;

  beforeAll(async () => {
    const ok = await redisReachable(redisUrl);
    if (!ok) {
      throw new Error(
        `Redis not reachable at ${redisUrl}. Bring it up with docker compose.`,
      );
    }
    worker = new Worker(
      "demo-run",
      async (job) => ({
        echoed: job.data,
        when: Date.now(),
      }),
      { connection: bullConnectionFromUrl() },
    );
  }, 30_000);

  afterAll(async () => {
    await worker?.close();
    await closeQueues();
  });

  it("round-trips a job from enqueue through worker to completion", async () => {
    const expectedRunId =
      "integration-" + Math.random().toString(36).slice(2, 10);

    const jobId = await enqueue(
      "demo-run",
      {
        runId: expectedRunId,
        demoSlug: "sprakdriften",
        mode: "FEATURED",
        inputJson: { question: "ping" },
      },
      { jobId: `test-${Date.now()}` },
    );

    const queue = getQueue("demo-run");

    const start = Date.now();
    let finalState: string | undefined;
    while (Date.now() - start < 10_000) {
      const current = await queue.getJob(jobId);
      finalState = await current?.getState();
      if (finalState === "completed" || finalState === "failed") break;
      await new Promise((r) => setTimeout(r, 200));
    }
    expect(finalState).toBe("completed");

    const completed = await queue.getJob(jobId);
    expect(completed).not.toBeNull();
    const returned = completed!.returnvalue as { echoed: { runId: string } };
    expect(returned.echoed.runId).toBe(expectedRunId);
  }, 30_000);
});
