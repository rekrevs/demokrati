import { Worker } from "bullmq";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import {
  _clearRegistryForTests,
  executeRun,
  registerDemo,
  submitRun,
  type DemoModule,
} from "@/lib/demos";
import { prisma } from "@/lib/db";
import { bullConnectionFromUrl, closeQueues } from "@/lib/queue";

/**
 * Requires local Postgres + Redis (see docker-compose.dev.yml) and the
 * migration applied. Gated on RUN_INTEGRATION=1.
 */
const enabled = process.env.RUN_INTEGRATION === "1";

const toyDemo: DemoModule<{ greeting: string }, { message: string }> = {
  id: "toy-demo",
  title: "Toy",
  visibility: "hidden",
  supportsLive: true,
  supportsCustomInput: true,
  riskLevel: "low",
  cacheTTLSeconds: 60,
  promptVersions: { echo: "v1" },
  modelProfile: "fast",
  inputSchema: z.object({ greeting: z.string() }),
  outputSchema: z.object({ message: z.string() }),
  async getFeaturedScenarios() {
    return [];
  },
  async validateInput() {
    return { ok: true };
  },
  async run(input) {
    return { message: `echo: ${input.greeting}` };
  },
  renderMeta(output) {
    return { title: output.message };
  },
};

async function waitForCompletion(runId: string, timeoutMs = 15_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const run = await prisma.run.findUnique({ where: { id: runId } });
    if (run?.status === "COMPLETED" || run?.status === "FAILED") return run;
    await new Promise((r) => setTimeout(r, 150));
  }
  return prisma.run.findUnique({ where: { id: runId } });
}

describe.skipIf(!enabled)("demo pipeline integration", () => {
  let worker: Worker | null = null;

  beforeAll(async () => {
    await prisma.run.deleteMany({ where: { demoSlug: "toy-demo" } });
    await prisma.demo.deleteMany({ where: { slug: "toy-demo" } });
    await prisma.demo.create({
      data: { slug: "toy-demo", title: "Toy", visibility: "HIDDEN" },
    });

    _clearRegistryForTests();
    registerDemo(toyDemo as unknown as DemoModule);

    worker = new Worker(
      "demo-run",
      async (job) => executeRun((job.data as { runId: string }).runId),
      { connection: bullConnectionFromUrl(), concurrency: 2 },
    );
    await worker.waitUntilReady();
  }, 30_000);

  afterAll(async () => {
    await worker?.close();
    await closeQueues();
    await prisma.run.deleteMany({ where: { demoSlug: "toy-demo" } });
    await prisma.demo.delete({ where: { slug: "toy-demo" } }).catch(() => {});
    await prisma.$disconnect();
  });

  it("submits a run, processes it in the worker, persists validated output", async () => {
    const result = await submitRun({
      demoSlug: "toy-demo",
      mode: "FEATURED",
      input: { greeting: "integration" },
    });
    expect(result.status).toBe("queued");

    const run = await waitForCompletion(result.runId);
    expect(run?.status).toBe("COMPLETED");
    expect(run?.outputJson).toEqual({ message: "echo: integration" });
    expect(run?.cacheKey).toBeTruthy();
  }, 30_000);

  it("second submit with identical input returns the cached runId", async () => {
    const first = await submitRun({
      demoSlug: "toy-demo",
      mode: "FEATURED",
      input: { greeting: "deterministic" },
    });
    await waitForCompletion(first.runId);

    const second = await submitRun({
      demoSlug: "toy-demo",
      mode: "FEATURED",
      input: { greeting: "deterministic" },
    });
    expect(second.cached).toBe(true);
    expect(second.runId).toBe(first.runId);
  }, 30_000);

  it("rejects input that fails the demo's schema", async () => {
    await expect(
      submitRun({
        demoSlug: "toy-demo",
        mode: "FEATURED",
        input: { greeting: 123 as unknown as string },
      }),
    ).rejects.toThrow(/Invalid demo input/);
  });
});
