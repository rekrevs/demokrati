import type { Job } from "bullmq";
import { registerAllDemos } from "@/lib/demos";
import { executeRun } from "@/lib/demos/pipeline";
import { demoRunJobSchema, type DemoRunJob } from "@/lib/queue/types";

registerAllDemos();

export async function handleDemoRun(
  rawJob: unknown,
): Promise<{ runId: string; result: unknown }> {
  const job = rawJob as Job<DemoRunJob>;
  const parsed = demoRunJobSchema.parse(job.data);
  const result = await executeRun(parsed.runId);
  return { runId: parsed.runId, result };
}
