import type { Job } from "bullmq";
import { ingestJobSchema, type IngestJob } from "@/lib/queue/types";

export async function handleIngest(
  rawJob: unknown,
): Promise<{ source: string; ranAt: string }> {
  const job = rawJob as Job<IngestJob>;
  const parsed = ingestJobSchema.parse(job.data);
  return {
    source: parsed.source,
    ranAt: new Date().toISOString(),
  };
}
