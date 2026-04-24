export type TextProfile =
  | "fast"
  | "strong"
  | "multilingual"
  | "safe"
  | "compare";

export type EmbedProfile = "embedding";

export type Profile = TextProfile | EmbedProfile;

export type Provider = "anthropic" | "openai" | "google";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface TextRequest {
  system?: string;
  messages: Message[];
  maxTokens?: number;
  temperature?: number;
  /**
   * Anthropic prompt caching controls. `system: true` marks the system
   * prompt as cacheable; `lastMessages: N` marks the final N messages
   * as cacheable. Ignored by other providers.
   */
  cache?: { lastMessages?: number; system?: boolean };
}

export interface TextUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface TextResponse {
  text: string;
  model: string;
  provider: Provider;
  usage: TextUsage;
}

export interface JsonResponse<T> {
  data: T;
  raw: string;
  model: string;
  provider: Provider;
  usage: TextUsage;
  /** True when the first response failed schema validation and we retried once. */
  retriedOnce: boolean;
}

export interface EmbedRequest {
  texts: string[];
  dimensions?: number;
}

export interface EmbedUsage {
  inputTokens: number;
}

export interface EmbedResponse {
  embeddings: number[][];
  model: string;
  provider: Provider;
  usage: EmbedUsage;
}
