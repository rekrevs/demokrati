import type { z } from "zod";
import { resolveProfile } from "./profiles";
import type { EmbedAdapter, TextAdapter } from "./providers/types";
import type {
  EmbedProfile,
  EmbedRequest,
  EmbedResponse,
  JsonResponse,
  Provider,
  TextProfile,
  TextRequest,
  TextResponse,
  TextUsage,
} from "./types";

export class ModelRouter {
  constructor(
    private readonly textAdapters: Partial<Record<Provider, TextAdapter>>,
    private readonly embedAdapters: Partial<Record<Provider, EmbedAdapter>>,
  ) {}

  async text(profile: TextProfile, req: TextRequest): Promise<TextResponse> {
    const { provider, model } = resolveProfile(profile);
    const adapter = this.textAdapters[provider];
    if (!adapter) {
      throw new Error(
        `No text adapter registered for provider "${provider}" (profile "${profile}").`,
      );
    }
    return adapter.text(model, req);
  }

  async json<T>(
    profile: TextProfile,
    req: TextRequest,
    schema: z.ZodType<T>,
  ): Promise<JsonResponse<T>> {
    const first = await this.text(profile, req);
    const parsed = tryParseSchema(first.text, schema);
    if (parsed.ok) {
      return {
        data: parsed.data,
        raw: first.text,
        model: first.model,
        provider: first.provider,
        usage: first.usage,
        retriedOnce: false,
      };
    }

    const correctiveReq: TextRequest = {
      ...req,
      messages: [
        ...req.messages,
        { role: "assistant", content: first.text },
        {
          role: "user",
          content: [
            "Your previous response could not be parsed against the required JSON schema.",
            "",
            "Errors:",
            parsed.errors,
            "",
            "Reply with JSON only, matching the schema exactly.",
            "Do not wrap in markdown code fences or add commentary.",
          ].join("\n"),
        },
      ],
    };
    const retry = await this.text(profile, correctiveReq);
    const reparsed = tryParseSchema(retry.text, schema);
    if (!reparsed.ok) {
      throw new SchemaValidationError(retry.text, reparsed.errors);
    }
    return {
      data: reparsed.data,
      raw: retry.text,
      model: retry.model,
      provider: retry.provider,
      usage: sumUsage(first.usage, retry.usage),
      retriedOnce: true,
    };
  }

  async embed(
    profile: EmbedProfile,
    req: EmbedRequest,
  ): Promise<EmbedResponse> {
    const { provider, model } = resolveProfile(profile);
    const adapter = this.embedAdapters[provider];
    if (!adapter) {
      throw new Error(
        `No embed adapter registered for provider "${provider}" (profile "${profile}").`,
      );
    }
    return adapter.embed(model, req);
  }
}

export class SchemaValidationError extends Error {
  constructor(
    public readonly lastText: string,
    public readonly issues: string,
  ) {
    super(
      `Model output failed schema validation after one retry.\n\nIssues:\n${issues}\n\nLast attempt:\n${lastText}`,
    );
    this.name = "SchemaValidationError";
  }
}

function sumUsage(a: TextUsage, b: TextUsage): TextUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens:
      a.cacheReadTokens !== undefined || b.cacheReadTokens !== undefined
        ? (a.cacheReadTokens ?? 0) + (b.cacheReadTokens ?? 0)
        : undefined,
    cacheWriteTokens:
      a.cacheWriteTokens !== undefined || b.cacheWriteTokens !== undefined
        ? (a.cacheWriteTokens ?? 0) + (b.cacheWriteTokens ?? 0)
        : undefined,
  };
}

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: string };

export function tryParseSchema<T>(
  text: string,
  schema: z.ZodType<T>,
): ParseResult<T> {
  const extracted = extractJson(text);
  if (extracted === null) {
    return {
      ok: false,
      errors: "No JSON object or array was found in the model response.",
    };
  }
  const parsed = schema.safeParse(extracted);
  if (parsed.success) return { ok: true, data: parsed.data };
  return {
    ok: false,
    errors: parsed.error.issues
      .map((i) => `  ${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("\n"),
  };
}

/**
 * Extract the first JSON value in a model response. Accepts raw JSON,
 * JSON wrapped in a markdown code fence (```json ... ```), or JSON
 * surrounded by prose.
 */
export function extractJson(text: string): unknown | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fence ? fence[1] : text).trim();
  if (candidate.length === 0) return null;

  const openIndexes = [
    candidate.indexOf("{"),
    candidate.indexOf("["),
  ].filter((i) => i >= 0);
  if (openIndexes.length === 0) return null;
  const start = Math.min(...openIndexes);
  const openChar = candidate[start];
  const closeChar = openChar === "{" ? "}" : "]";

  // Walk forward tracking brace/bracket depth while respecting strings.
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < candidate.length; i += 1) {
    const ch = candidate[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === openChar) depth += 1;
    else if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(candidate.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}
