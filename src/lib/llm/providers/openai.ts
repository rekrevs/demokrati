import OpenAI from "openai";
import type { EmbedAdapter, TextAdapter } from "./types";
import type {
  EmbedRequest,
  EmbedResponse,
  TextRequest,
  TextResponse,
} from "../types";

export class OpenAIAdapter implements TextAdapter, EmbedAdapter {
  readonly provider = "openai" as const;
  private readonly client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async text(model: string, req: TextRequest): Promise<TextResponse> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];
    if (req.system) messages.push({ role: "system", content: req.system });
    for (const m of req.messages) {
      messages.push({ role: m.role, content: m.content });
    }

    const response = await this.client.chat.completions.create({
      model,
      messages,
      max_tokens: req.maxTokens ?? 4096,
      temperature: req.temperature,
    });

    const choice = response.choices[0];
    return {
      text: choice?.message?.content ?? "",
      model: response.model,
      provider: "openai",
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }

  async embed(model: string, req: EmbedRequest): Promise<EmbedResponse> {
    const response = await this.client.embeddings.create({
      model,
      input: req.texts,
      ...(req.dimensions ? { dimensions: req.dimensions } : {}),
    });
    return {
      embeddings: response.data.map((d) => d.embedding),
      model: response.model,
      provider: "openai",
      usage: {
        inputTokens: response.usage?.total_tokens ?? 0,
      },
    };
  }
}
