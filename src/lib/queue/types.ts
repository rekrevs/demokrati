import { z } from "zod";

/**
 * Registry of queue names. Each demo/ingestion/warming pipeline enqueues
 * against one of these; worker processes register handlers by name.
 */
export const QUEUE_NAMES = ["demo-run", "ingest", "warm"] as const;
export type QueueName = (typeof QUEUE_NAMES)[number];

export const demoRunJobSchema = z.object({
  runId: z.string(),
  demoSlug: z.string(),
  mode: z.enum(["FEATURED", "EXPLORE", "STAGE"]),
  inputJson: z.unknown(),
  promptVersion: z.string().optional(),
});
export type DemoRunJob = z.infer<typeof demoRunJobSchema>;

export const ingestJobSchema = z.object({
  source: z.enum(["riksdagen", "snd"]),
  params: z.unknown(),
});
export type IngestJob = z.infer<typeof ingestJobSchema>;

export const warmJobSchema = z.object({
  demoSlug: z.string(),
  scenarioId: z.string(),
});
export type WarmJob = z.infer<typeof warmJobSchema>;

export type JobPayloadByQueue = {
  "demo-run": DemoRunJob;
  ingest: IngestJob;
  warm: WarmJob;
};

export const JOB_SCHEMAS = {
  "demo-run": demoRunJobSchema,
  ingest: ingestJobSchema,
  warm: warmJobSchema,
} as const satisfies Record<QueueName, z.ZodType<unknown>>;
