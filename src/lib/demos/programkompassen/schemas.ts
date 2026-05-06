import { z } from "zod";

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
export type PartyCode = (typeof PARTY_CODES)[number];

export const programkompassenInputSchema = z.object({
  /** ID into the question bank. */
  questionId: z.string().min(1).max(64),
  /** Subset of parties to compare; default = all 8. */
  parties: z
    .array(z.enum(PARTY_CODES))
    .min(2)
    .max(PARTY_CODES.length),
});

export type ProgramkompassenInput = z.infer<
  typeof programkompassenInputSchema
>;

export const evidenceSchema = z.object({
  quote: z.string(),
  sourceTitle: z.string(),
  sourceUrl: z.string().nullable(),
  chunkId: z.string(),
});

export const partyStanceSchema = z.object({
  party: z.enum(PARTY_CODES),
  /** 1 = strongly opposed, 5 = strongly in favour, 3 = mixed/unclear. */
  stance: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  summary: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  evidence: z.array(evidenceSchema),
  /** True if the party has no programme text in our corpus. */
  noCoverage: z.boolean(),
});

export const programkompassenOutputSchema = z.object({
  questionId: z.string(),
  questionText: z.string(),
  parties: z.array(partyStanceSchema).min(1),
  /** "What this question simplifies" note — surfaces the framing. */
  simplificationNote: z.string(),
});

export type ProgramkompassenOutput = z.infer<
  typeof programkompassenOutputSchema
>;
export type PartyStance = z.infer<typeof partyStanceSchema>;
export type Evidence = z.infer<typeof evidenceSchema>;

export const PARTY_LABELS: Record<PartyCode, string> = {
  S: "Socialdemokraterna",
  M: "Moderaterna",
  SD: "Sverigedemokraterna",
  C: "Centerpartiet",
  V: "Vänsterpartiet",
  KD: "Kristdemokraterna",
  MP: "Miljöpartiet",
  L: "Liberalerna",
};
