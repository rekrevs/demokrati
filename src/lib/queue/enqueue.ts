import type { Queue } from "bullmq";
import { getQueue } from "./index";
import {
  JOB_SCHEMAS,
  type JobPayloadByQueue,
  type QueueName,
} from "./types";

/**
 * Validate and enqueue a job. Centralising this means workers can assume
 * payloads already conform to the schema.
 */
export async function enqueue<N extends QueueName>(
  name: N,
  payload: JobPayloadByQueue[N],
  opts?: { jobId?: string; delay?: number },
): Promise<string> {
  const schema = JOB_SCHEMAS[name];
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("\n  ");
    throw new Error(`Invalid ${name} job payload:\n  ${issues}`);
  }
  // Cast away BullMQ's ExtractNameType gymnastics. Runtime correctness is
  // already guaranteed by the Zod validation above.
  const queue = getQueue(name) as unknown as Queue;
  const job = await queue.add(name, payload, {
    jobId: opts?.jobId,
    delay: opts?.delay,
  });
  if (!job.id) {
    throw new Error(`BullMQ did not return a job id for queue ${name}`);
  }
  return job.id;
}
