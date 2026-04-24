import Anthropic from "@anthropic-ai/sdk";
import type { TextAdapter } from "./types";
import type { TextRequest, TextResponse } from "../types";

export class AnthropicAdapter implements TextAdapter {
  readonly provider = "anthropic" as const;
  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async text(model: string, req: TextRequest): Promise<TextResponse> {
    const systemParam = req.system
      ? req.cache?.system
        ? [
            {
              type: "text" as const,
              text: req.system,
              cache_control: { type: "ephemeral" as const },
            },
          ]
        : req.system
      : undefined;

    const cacheLastN = Math.max(0, req.cache?.lastMessages ?? 0);

    const messages: Anthropic.MessageParam[] = req.messages.map(
      (m, idx, arr) => {
        const applyCache = cacheLastN > 0 && idx >= arr.length - cacheLastN;
        if (applyCache) {
          return {
            role: m.role,
            content: [
              {
                type: "text" as const,
                text: m.content,
                cache_control: { type: "ephemeral" as const },
              },
            ],
          };
        }
        return { role: m.role, content: m.content };
      },
    );

    const response = await this.client.messages.create({
      model,
      max_tokens: req.maxTokens ?? 4096,
      temperature: req.temperature,
      system: systemParam,
      messages,
    });

    const text = response.content
      .filter((c): c is Anthropic.TextBlock => c.type === "text")
      .map((c) => c.text)
      .join("");

    return {
      text,
      model: response.model,
      provider: "anthropic",
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: response.usage.cache_read_input_tokens ?? undefined,
        cacheWriteTokens:
          response.usage.cache_creation_input_tokens ?? undefined,
      },
    };
  }
}
