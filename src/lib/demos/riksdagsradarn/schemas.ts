import { z } from "zod";

export const RIKSDAGSRADARN_REGIMES = ["neutral", "conflict", "citizen"] as const;
export type RiksdagsradarnRegime = (typeof RIKSDAGSRADARN_REGIMES)[number];

export const RIKSDAGSRADARN_CLAIM_TYPES = [
  "empirical",
  "normative",
  "critique",
  "proposal",
] as const;
export type RiksdagsradarnClaimType =
  (typeof RIKSDAGSRADARN_CLAIM_TYPES)[number];

export const RIKSDAGSRADARN_CONFIDENCES = ["low", "medium", "high"] as const;
export type RiksdagsradarnConfidence =
  (typeof RIKSDAGSRADARN_CONFIDENCES)[number];

export const PARTY_CODES = [
  "S",
  "M",
  "SD",
  "C",
  "V",
  "KD",
  "MP",
  "L",
] as const;

export const riksdagsradarnInputSchema = z.object({
  /** Free-text topic (Swedish) used for both lexical and semantic retrieval. */
  topic: z
    .string()
    .trim()
    .min(3, "Ämnet måste vara minst 3 tecken")
    .max(200, "Ämnet får inte vara längre än 200 tecken"),
  /** Inclusive lower bound. ISO date string. */
  dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Inclusive upper bound. ISO date string. */
  dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  /** Filter by party codes; empty = all. */
  parties: z.array(z.string()).optional(),
  /** Hard cap on retrieval candidates. */
  retrievalLimit: z.number().int().min(5).max(60),
});

export const DEFAULT_RETRIEVAL_LIMIT = 30;

export type RiksdagsradarnInput = z.infer<typeof riksdagsradarnInputSchema>;

export const sourceCardSchema = z.object({
  chunkId: z.string(),
  paragraphIndex: z.number().int().min(0),
  text: z.string(),
  talare: z.string(),
  parti: z.string(),
  dokDatum: z.string(),
  avsnittsrubrik: z.string(),
  underrubrik: z.string().nullable(),
  anforandeUrlHtml: z.string(),
  protokollUrlWww: z.string().nullable(),
  retrievalScore: z.number(),
});

export const claimSchema = z.object({
  text: z.string(),
  type: z.enum(RIKSDAGSRADARN_CLAIM_TYPES),
  sourceChunkIds: z.array(z.string()).min(1),
  confidence: z.enum(RIKSDAGSRADARN_CONFIDENCES),
});

export const partyPositionSchema = z.object({
  parti: z.string(),
  /** 2–3 sentences in Swedish characterising the party's overall position. */
  summary: z.string(),
  claims: z.array(claimSchema),
});

export const summaryRegimesSchema = z.object({
  neutral: z.string(),
  conflict: z.string(),
  citizen: z.string(),
});

export const riksdagsradarnOutputSchema = z.object({
  topic: z.string(),
  dateFrom: z.string(),
  dateTo: z.string(),
  totalAnforanden: z.number().int().min(0),
  partyPositions: z.array(partyPositionSchema),
  conflictLines: z.array(z.string()),
  summaries: summaryRegimesSchema,
  sourceCards: z.array(sourceCardSchema),
  /** True when retrieval found nothing useful and the demo bailed early. */
  emptyResult: z.boolean(),
});

export type RiksdagsradarnOutput = z.infer<typeof riksdagsradarnOutputSchema>;
export type RiksdagsradarnSourceCard = z.infer<typeof sourceCardSchema>;
export type RiksdagsradarnClaim = z.infer<typeof claimSchema>;
export type RiksdagsradarnPartyPosition = z.infer<typeof partyPositionSchema>;

export const PARTY_LABELS: Record<string, string> = {
  S: "Socialdemokraterna",
  M: "Moderaterna",
  SD: "Sverigedemokraterna",
  C: "Centerpartiet",
  V: "Vänsterpartiet",
  KD: "Kristdemokraterna",
  MP: "Miljöpartiet",
  L: "Liberalerna",
  "-": "Utan partibeteckning",
};
