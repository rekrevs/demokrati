import type { Job } from "bullmq";
import { warmJobSchema, type WarmJob } from "@/lib/queue/types";

export async function handleWarm(
  rawJob: unknown,
): Promise<{ demoSlug: string; scenarioId: string; ranAt: string }> {
  const job = rawJob as Job<WarmJob>;
  const parsed = warmJobSchema.parse(job.data);
  return {
    demoSlug: parsed.demoSlug,
    scenarioId: parsed.scenarioId,
    ranAt: new Date().toISOString(),
  };
}
