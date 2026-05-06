import { z } from "zod";
import { getRouter } from "@/lib/llm";
import { findQuestion } from "./questions";
import {
  PROMPT_VERSIONS,
  simplificationPrompt,
  stancePrompt,
} from "./prompts";
import {
  partiesWithCoverage,
  retrieveForParty,
  type ProgramHit,
} from "./retrieval";
import {
  PARTY_CODES,
  programkompassenOutputSchema,
  type PartyCode,
  type PartyStance,
  type ProgramkompassenInput,
  type ProgramkompassenOutput,
} from "./schemas";

export interface PipelineDeps {
  log?: (event: string, data?: unknown) => void;
  setProgress?: (update: {
    phase: string;
    message: string;
    data?: Record<string, unknown>;
  }) => Promise<void>;
}

const stanceLlmSchema = z.object({
  stance: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  summary: z.string(),
  confidence: z.enum(["low", "medium", "high"]),
  evidence: z
    .array(
      z.object({
        quote: z.string(),
        chunkId: z.string(),
      }),
    )
    .min(0),
});

const simplificationSchema = z.object({
  simplificationNote: z.string(),
});

export async function runProgramkompassenPipeline(
  input: ProgramkompassenInput,
  deps: PipelineDeps = {},
): Promise<ProgramkompassenOutput> {
  const log = deps.log ?? (() => undefined);
  const setProgress = deps.setProgress ?? (async () => undefined);
  log("start", {
    questionId: input.questionId,
    parties: input.parties.length,
  });

  const question = findQuestion(input.questionId);
  if (!question) {
    throw new Error(`Unknown question: ${input.questionId}`);
  }

  await setProgress({
    phase: "checking_coverage",
    message: "Kontrollerar vilka partier som har programtext i indexet…",
  });
  const covered = await partiesWithCoverage();

  await setProgress({
    phase: "retrieving",
    message: `Söker programutdrag per parti (${input.parties.length} partier)…`,
    data: { partyCount: input.parties.length },
  });

  const router = getRouter();
  const hitsByParty: Record<string, ProgramHit[]> = {};
  for (const party of input.parties) {
    if (!covered.has(party)) {
      hitsByParty[party] = [];
      continue;
    }
    hitsByParty[party] = await retrieveForParty(
      party,
      question.retrievalKeywords,
      6,
    );
  }
  const totalHits = Object.values(hitsByParty).reduce(
    (s, arr) => s + arr.length,
    0,
  );
  log("retrieved", { totalHits, partiesWithHits: Object.keys(hitsByParty).length });

  await setProgress({
    phase: "extracting",
    message: `Extraherar partiståndpunkter…`,
    data: { totalHits },
  });

  // Run stance extraction per party in parallel — independent calls.
  const stanceResults = await Promise.all(
    input.parties.map(async (party): Promise<PartyStance> => {
      const hits = hitsByParty[party] ?? [];
      if (!covered.has(party)) {
        return {
          party,
          stance: 3,
          summary:
            "Detta parti finns inte i den ingjorda programkorpusen. Lägg till det via ingestion-skriptet för att få analys.",
          confidence: "low",
          evidence: [],
          noCoverage: true,
        };
      }
      if (hits.length === 0) {
        return {
          party,
          stance: 3,
          summary: "Inga relevanta passager hittades i partiets programtext.",
          confidence: "low",
          evidence: [],
          noCoverage: false,
        };
      }
      const validIds = new Set(hits.map((h) => h.chunkId));
      const args = stancePrompt({
        party,
        questionText: question.text,
        hits,
      });
      const res = await router.json(
        "strong",
        {
          system: args.system,
          messages: [{ role: "user", content: args.user }],
          temperature: 0.15,
          maxTokens: 1500,
        },
        stanceLlmSchema,
      );
      const evidence = res.data.evidence
        .filter((e) => validIds.has(e.chunkId))
        .map((e) => {
          const hit = hits.find((h) => h.chunkId === e.chunkId);
          return {
            quote: e.quote,
            chunkId: e.chunkId,
            sourceTitle: hit?.sourceTitle ?? "(okänt dokument)",
            sourceUrl: hit?.sourceUrl ?? null,
          };
        });
      return {
        party,
        stance: res.data.stance,
        summary: res.data.summary,
        confidence: res.data.confidence,
        evidence,
        noCoverage: false,
      };
    }),
  );

  await setProgress({
    phase: "framing",
    message: "Beskriver vad frågan förenklar…",
  });
  const simplArgs = simplificationPrompt({ questionText: question.text });
  const simplRes = await router.json(
    "strong",
    {
      system: simplArgs.system,
      messages: [{ role: "user", content: simplArgs.user }],
      temperature: 0.3,
      maxTokens: 600,
    },
    simplificationSchema,
  );

  return programkompassenOutputSchema.parse({
    questionId: input.questionId,
    questionText: question.text,
    parties: stanceResults,
    simplificationNote: simplRes.data.simplificationNote,
  });
}

export { PROMPT_VERSIONS, PARTY_CODES };
export type { PartyCode };
