import { Prisma, RunMode, RunStatus } from "@prisma/client";
import { prisma } from "../db";
import { env } from "../env";
import { enqueue } from "../queue/enqueue";
import { cacheKey, inputHash } from "./cache-key";
import type { DemoModule, DemoRunContext } from "./module";
import { getDemo } from "./registry";

export interface SubmitRunArgs {
  demoSlug: string;
  mode: RunMode;
  scenarioId?: string;
  input: unknown;
}

export type SubmitRunResult =
  | { runId: string; status: "queued"; cached: false }
  | { runId: string; status: "completed"; cached: true };

/**
 * Validate, cache-lookup, and (if needed) enqueue a demo run.
 * Pure DB work in the request handler — the heavy lifting happens in the
 * worker via `executeRun`.
 */
export async function submitRun(args: SubmitRunArgs): Promise<SubmitRunResult> {
  const mod = getDemo(args.demoSlug);
  if (!mod) throw new DemoNotFoundError(args.demoSlug);

  const validated = mod.inputSchema.safeParse(args.input);
  if (!validated.success) {
    throw new InvalidDemoInputError(
      validated.error.issues.map(
        (i) => `${i.path.join(".") || "<root>"}: ${i.message}`,
      ),
    );
  }
  const validation = await mod.validateInput(validated.data, args.mode);
  if (!validation.ok) {
    throw new InvalidDemoInputError(validation.errors ?? ["invalid input"]);
  }

  const hash = inputHash(validated.data);
  const key = cacheKey({
    demoSlug: mod.id,
    inputHash: hash,
    promptVersions: mod.promptVersions,
    modelProfile: mod.modelProfile,
  });

  const cached = await prisma.run.findFirst({
    where: { cacheKey: key, status: RunStatus.COMPLETED },
    orderBy: { completedAt: "desc" },
  });
  if (cached) {
    return { runId: cached.id, status: "completed", cached: true };
  }

  const run = await prisma.run.create({
    data: {
      demoSlug: mod.id,
      scenarioId: args.scenarioId ?? null,
      mode: args.mode,
      status: RunStatus.QUEUED,
      inputHash: hash,
      inputJson: validated.data as Prisma.InputJsonValue,
      cacheKey: key,
    },
  });

  await enqueue(
    "demo-run",
    {
      runId: run.id,
      demoSlug: mod.id,
      mode: args.mode,
      inputJson: validated.data,
    },
    // BullMQ rejects custom ids containing ":" — they clash with Redis
    // key separators internally.
    { jobId: `run-${run.id}` },
  );

  return { runId: run.id, status: "queued", cached: false };
}

/**
 * Executes a previously-queued run. Called from the worker's demo-run
 * handler with the run id. Loads input from DB, dispatches to the demo
 * module, validates output, persists result + usage.
 */
export async function executeRun(runId: string): Promise<unknown> {
  const run = await prisma.run.findUnique({ where: { id: runId } });
  if (!run) throw new Error(`Run ${runId} not found`);

  const mod = getDemo(run.demoSlug);
  if (!mod) throw new DemoNotFoundError(run.demoSlug);

  await prisma.run.update({
    where: { id: runId },
    data: { status: RunStatus.RUNNING, startedAt: new Date() },
  });

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    env().LIVE_RUN_TIMEOUT_SECONDS * 1_000,
  );
  try {
    const input = mod.inputSchema.parse(run.inputJson);
    const ctx: DemoRunContext = {
      runId: run.id,
      mode: run.mode,
      log: (event, data) => {
        console.log(`[run:${runId}] ${event}`, data ?? "");
      },
      setProgress: async (update) => {
        await prisma.run.update({
          where: { id: runId },
          data: {
            progress: {
              ...update,
              updatedAt: new Date().toISOString(),
            } as Prisma.InputJsonValue,
          },
        });
      },
      signal: controller.signal,
    };

    const raw = await mod.run(input, ctx);
    const validated = mod.outputSchema.parse(raw);

    await prisma.run.update({
      where: { id: runId },
      data: {
        status: RunStatus.COMPLETED,
        completedAt: new Date(),
        outputJson: validated as Prisma.InputJsonValue,
      },
    });
    return validated;
  } catch (err) {
    const error = err as Error;
    await prisma.run.update({
      where: { id: runId },
      data: {
        status: RunStatus.FAILED,
        completedAt: new Date(),
        errorJson: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } as Prisma.InputJsonValue,
      },
    });
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export class DemoNotFoundError extends Error {
  constructor(slug: string) {
    super(`Demo "${slug}" is not registered.`);
    this.name = "DemoNotFoundError";
  }
}

export class InvalidDemoInputError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid demo input:\n  ${issues.join("\n  ")}`);
    this.name = "InvalidDemoInputError";
  }
}

/** Force-type helper for tests that want to register typed modules. */
export function asDemo<I, O>(
  mod: DemoModule<I, O>,
): DemoModule<unknown, unknown> {
  return mod as DemoModule<unknown, unknown>;
}
