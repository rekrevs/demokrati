import "server-only";
import { env } from "../env";
import { AnthropicAdapter } from "./providers/anthropic";
import { GoogleAdapter } from "./providers/google";
import { OpenAIAdapter } from "./providers/openai";
import type { EmbedAdapter, TextAdapter } from "./providers/types";
import { ModelRouter } from "./router";
import type { Provider } from "./types";

export { ModelRouter, SchemaValidationError } from "./router";
export { resolveProfile } from "./profiles";
export type {
  EmbedProfile,
  EmbedRequest,
  EmbedResponse,
  JsonResponse,
  Message,
  Profile,
  Provider,
  TextProfile,
  TextRequest,
  TextResponse,
  TextUsage,
} from "./types";

let cached: ModelRouter | null = null;

/**
 * Build a ModelRouter from env. Providers whose API key is not set are
 * simply absent from the router — requests routed to them will throw with
 * a clear "No text adapter registered" error.
 */
export function getRouter(): ModelRouter {
  if (!cached) {
    const e = env();
    const text: Partial<Record<Provider, TextAdapter>> = {};
    const embed: Partial<Record<Provider, EmbedAdapter>> = {};

    if (e.ANTHROPIC_API_KEY) {
      text.anthropic = new AnthropicAdapter(e.ANTHROPIC_API_KEY);
    }
    if (e.OPENAI_API_KEY) {
      const oa = new OpenAIAdapter(e.OPENAI_API_KEY);
      text.openai = oa;
      embed.openai = oa;
    }
    if (e.GOOGLE_API_KEY) {
      const ga = new GoogleAdapter(e.GOOGLE_API_KEY);
      text.google = ga;
      embed.google = ga;
    }

    cached = new ModelRouter(text, embed);
  }
  return cached;
}

/** Test-only: drop the cached router so env overrides take effect. */
export function _resetRouterForTests() {
  cached = null;
}
