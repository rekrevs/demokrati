import { z } from "zod";

const providerEnum = z.enum(["anthropic", "openai", "google"]);
const embedProviderEnum = z.enum(["openai", "google"]);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  STORAGE_DIR: z.string().default("./data/storage"),

  ADMIN_PASSWORD_HASH: z.string().optional(),

  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),

  MODEL_FAST_PROVIDER: providerEnum.default("anthropic"),
  MODEL_FAST_NAME: z.string().default("claude-haiku-4-5-20251001"),
  MODEL_STRONG_PROVIDER: providerEnum.default("anthropic"),
  MODEL_STRONG_NAME: z.string().default("claude-sonnet-4-6"),
  MODEL_MULTILINGUAL_PROVIDER: providerEnum.default("anthropic"),
  MODEL_MULTILINGUAL_NAME: z.string().default("claude-sonnet-4-6"),
  MODEL_EMBED_PROVIDER: embedProviderEnum.default("openai"),
  MODEL_EMBED_NAME: z.string().default("text-embedding-3-small"),
  MODEL_SAFE_PROVIDER: providerEnum.default("anthropic"),
  MODEL_SAFE_NAME: z.string().default("claude-sonnet-4-6"),

  HCAPTCHA_SITE_KEY: z.string().optional(),
  HCAPTCHA_SECRET_KEY: z.string().optional(),

  RATE_LIMIT_PUBLIC_RUNS_PER_HOUR: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_EXPENSIVE_RUNS_PER_DAY: z.coerce.number().int().positive().default(5),
  FEATURED_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86400),
  LIVE_RUN_TIMEOUT_SECONDS: z.coerce.number().int().positive().default(60),

  DAILY_COST_CEILING_ANTHROPIC: z.coerce.number().nonnegative().default(20),
  DAILY_COST_CEILING_OPENAI: z.coerce.number().nonnegative().default(20),
  DAILY_COST_CEILING_GOOGLE: z.coerce.number().nonnegative().default(20),

  SENTRY_DSN: z.string().url().optional(),
  PLAUSIBLE_DOMAIN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

/**
 * Lazy env getter so imports don't fail during `next build` before
 * env vars are available. Throws with a clear error on first runtime access
 * when something required is missing.
 */
export function env(): Env {
  if (!cached) {
    const parsed = envSchema.safeParse(process.env);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map((i) => `${i.path.join(".") || "<root>"}: ${i.message}`)
        .join("\n  ");
      throw new Error(`Invalid environment configuration:\n  ${issues}`);
    }
    cached = parsed.data;
  }
  return cached;
}

/** Test-only: clear the cache so overrides via process.env take effect. */
export function _resetEnvForTests() {
  cached = null;
}
