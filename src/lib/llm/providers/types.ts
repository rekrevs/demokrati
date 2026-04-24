import type {
  EmbedRequest,
  EmbedResponse,
  Provider,
  TextRequest,
  TextResponse,
} from "../types";

export interface TextAdapter {
  readonly provider: Provider;
  text(model: string, req: TextRequest): Promise<TextResponse>;
}

export interface EmbedAdapter {
  readonly provider: Provider;
  embed(model: string, req: EmbedRequest): Promise<EmbedResponse>;
}
