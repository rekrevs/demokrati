import { GoogleGenerativeAI } from "@google/generative-ai";
import type { EmbedAdapter, TextAdapter } from "./types";
import type {
  EmbedRequest,
  EmbedResponse,
  TextRequest,
  TextResponse,
} from "../types";

export class GoogleAdapter implements TextAdapter, EmbedAdapter {
  readonly provider = "google" as const;
  private readonly client: GoogleGenerativeAI;

  constructor(apiKey: string) {
    this.client = new GoogleGenerativeAI(apiKey);
  }

  async text(model: string, req: TextRequest): Promise<TextResponse> {
    const generativeModel = this.client.getGenerativeModel({
      model,
      ...(req.system
        ? { systemInstruction: { role: "user", parts: [{ text: req.system }] } }
        : {}),
      generationConfig: {
        ...(req.maxTokens ? { maxOutputTokens: req.maxTokens } : {}),
        ...(req.temperature !== undefined
          ? { temperature: req.temperature }
          : {}),
      },
    });

    const contents = req.messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const result = await generativeModel.generateContent({ contents });
    const text = result.response.text();
    const meta = result.response.usageMetadata;

    return {
      text,
      model,
      provider: "google",
      usage: {
        inputTokens: meta?.promptTokenCount ?? 0,
        outputTokens: meta?.candidatesTokenCount ?? 0,
      },
    };
  }

  async embed(model: string, req: EmbedRequest): Promise<EmbedResponse> {
    const generativeModel = this.client.getGenerativeModel({ model });
    const result = await generativeModel.batchEmbedContents({
      requests: req.texts.map((text) => ({
        content: { role: "user", parts: [{ text }] },
        ...(req.dimensions ? { outputDimensionality: req.dimensions } : {}),
      })),
    });
    return {
      embeddings: result.embeddings.map((e) => e.values),
      model,
      provider: "google",
      // Google's embed API does not report token counts.
      usage: { inputTokens: 0 },
    };
  }
}
