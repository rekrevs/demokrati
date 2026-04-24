import { Queue, type ConnectionOptions } from "bullmq";
import IORedis, { type Redis } from "ioredis";
import type { JobPayloadByQueue, QueueName } from "./types";

function redisUrl(): string {
  return process.env.REDIS_URL ?? "redis://localhost:6379";
}

const connections: Record<string, Redis> = {};
const queues: Partial<Record<QueueName, Queue>> = {};

export function getRedisConnection(label = "default"): Redis {
  if (!connections[label]) {
    connections[label] = new IORedis(redisUrl(), {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
  }
  return connections[label];
}

type TypedQueue<N extends QueueName> = Queue<
  JobPayloadByQueue[N],
  unknown,
  N
>;

export function getQueue<N extends QueueName>(name: N): TypedQueue<N> {
  if (!queues[name]) {
    queues[name] = new Queue<JobPayloadByQueue[N], unknown, N>(name, {
      connection: getRedisConnection(`queue:${name}`),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2_000 },
        removeOnComplete: { age: 3_600, count: 100 },
        removeOnFail: { age: 24 * 3_600, count: 50 },
      },
    }) as unknown as Queue;
  }
  return queues[name] as unknown as TypedQueue<N>;
}

export async function closeQueues(): Promise<void> {
  const tasks: Promise<unknown>[] = [];
  for (const q of Object.values(queues)) {
    if (q) tasks.push(q.close());
  }
  await Promise.all(tasks);
  for (const key of Object.keys(queues)) {
    delete queues[key as QueueName];
  }

  const closes: Promise<unknown>[] = [];
  for (const c of Object.values(connections)) {
    closes.push(c.quit().catch(() => undefined));
  }
  await Promise.all(closes);
  for (const key of Object.keys(connections)) {
    delete connections[key];
  }
}

export function bullConnectionFromUrl(): ConnectionOptions {
  return {
    url: redisUrl(),
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };
}
