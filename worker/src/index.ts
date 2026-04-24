import { Worker } from "bullmq";
import { bullConnectionFromUrl, closeQueues } from "@/lib/queue";
import { QUEUE_NAMES, type QueueName } from "@/lib/queue/types";
import { handleDemoRun } from "./handlers/demo-run";
import { handleIngest } from "./handlers/ingest";
import { handleWarm } from "./handlers/warm";

const HANDLERS = {
  "demo-run": handleDemoRun,
  ingest: handleIngest,
  warm: handleWarm,
} as const satisfies Record<QueueName, (job: unknown) => Promise<unknown>>;

function bootWorkers(): Worker[] {
  const connection = bullConnectionFromUrl();
  return QUEUE_NAMES.map((name) => {
    const worker = new Worker(
      name,
      async (job) => {
        console.log(`[${name}] start id=${job.id}`);
        try {
          const result = await HANDLERS[name](job);
          console.log(`[${name}] done id=${job.id}`);
          return result;
        } catch (error) {
          console.error(`[${name}] failed id=${job.id}`, error);
          throw error;
        }
      },
      { connection, concurrency: 4 },
    );
    worker.on("error", (err) => {
      console.error(`[${name}] worker error`, err);
    });
    worker.on("failed", (job, err) => {
      console.error(`[${name}] failed id=${job?.id}`, err?.message);
    });
    return worker;
  });
}

async function main() {
  console.log(
    "demokrati worker booting against",
    process.env.REDIS_URL ?? "redis://localhost:6379",
  );
  const workers = bootWorkers();
  console.log(
    "active queues:",
    workers.map((w) => w.name).join(", "),
  );

  const shutdown = async (signal: NodeJS.Signals) => {
    console.log(`worker received ${signal}, shutting down`);
    await Promise.all(workers.map((w) => w.close()));
    await closeQueues();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("worker boot failed", err);
  process.exit(1);
});
