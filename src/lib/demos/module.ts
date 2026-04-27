import type { ZodType } from "zod";

export type RunMode = "FEATURED" | "EXPLORE" | "STAGE";
export type Visibility = "public" | "beta" | "hidden";
export type RiskLevel = "low" | "medium" | "high";

export interface ProgressUpdate {
  phase: string;
  message: string;
  /** Optional structured payload (counts, partial results, etc.). */
  data?: Record<string, unknown>;
}

export interface DemoRunContext {
  runId: string;
  mode: RunMode;
  log: (event: string, data?: unknown) => void;
  /**
   * Persist a progress update on the run record. Safe to call any number
   * of times; UI polls and reflects the latest one.
   */
  setProgress: (update: ProgressUpdate) => Promise<void>;
  signal: AbortSignal;
}

export interface Scenario<I> {
  id: string;
  slug: string;
  title: string;
  description?: string;
  input: I;
  tags?: string[];
}

export interface ValidationResult {
  ok: boolean;
  errors?: string[];
}

export interface DemoRenderMeta {
  title: string;
  summary?: string;
  shareImage?: string;
}

export interface DemoModule<I = unknown, O = unknown> {
  readonly id: string;
  readonly title: string;
  readonly visibility: Visibility;
  readonly supportsLive: boolean;
  readonly supportsCustomInput: boolean;
  readonly riskLevel: RiskLevel;
  readonly cacheTTLSeconds: number;
  /** Map of prompt name → version, included in the cache key. */
  readonly promptVersions: Record<string, string>;
  /** The model profile this demo uses; included in the cache key. */
  readonly modelProfile: string;

  readonly inputSchema: ZodType<I>;
  readonly outputSchema: ZodType<O>;

  getFeaturedScenarios(): Promise<Scenario<I>[]>;
  validateInput(input: I, mode: RunMode): Promise<ValidationResult>;
  run(input: I, ctx: DemoRunContext): Promise<O>;
  renderMeta(output: O): DemoRenderMeta;
}
