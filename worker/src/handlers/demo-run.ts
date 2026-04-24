import type { Job } from "bullmq";
import { demoRunJobSchema, type DemoRunJob } from "@/lib/queue/types";

export async function handleDemoRun(
  rawJob: unknown,
): Promise<{ runId: string; status: "COMPLETED"; ranAt: string }> {
  const job = rawJob as Job<DemoRunJob>;
  const parsed = demoRunJobSchema.parse(job.data);

  // Demo-specific pipeline dispatch lives in T-0008; this handler is
  // intentionally a pass-through for now so the worker contract is stable.
  return {
    runId: parsed.runId,
    status: "COMPLETED",
    ranAt: new Date().toISOString(),
  };
}
