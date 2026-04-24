import { describe, expect, it, vi } from "vitest";
import { enqueue } from "./enqueue";

vi.mock("./index", () => {
  return {
    getQueue: () => ({
      add: vi.fn(async (_name: string, data: unknown) => ({
        id: "mock-job-id",
        data,
      })),
    }),
  };
});

describe("enqueue", () => {
  it("accepts a valid demo-run payload", async () => {
    const id = await enqueue("demo-run", {
      runId: "run_1",
      demoSlug: "sprakdriften",
      mode: "FEATURED",
      inputJson: { question: "Är Sverige ett tryggt land?" },
    });
    expect(id).toBe("mock-job-id");
  });

  it("rejects an invalid demo-run payload with a useful error", async () => {
    await expect(
      enqueue("demo-run", {
        runId: "run_1",
        demoSlug: "sprakdriften",
        mode: "INVALID" as unknown as "FEATURED",
        inputJson: {},
      }),
    ).rejects.toThrow(/Invalid demo-run job payload/);
  });

  it("accepts an ingest payload", async () => {
    const id = await enqueue("ingest", {
      source: "riksdagen",
      params: { from: "2026-04-01", to: "2026-04-07" },
    });
    expect(id).toBe("mock-job-id");
  });

  it("rejects an ingest payload from an unknown source", async () => {
    await expect(
      enqueue("ingest", {
        source: "wikipedia" as unknown as "riksdagen",
        params: {},
      }),
    ).rejects.toThrow();
  });
});
