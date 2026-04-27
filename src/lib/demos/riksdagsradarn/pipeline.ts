import { z } from "zod";
import { getRouter } from "@/lib/llm";
import {
  groupHitsByParty,
  hybridRetrieve,
  type RiksdagHit,
} from "@/lib/retrieval/riksdag";
import { analysePrompt, PROMPT_VERSIONS } from "./prompts";
import {
  riksdagsradarnOutputSchema,
  type RiksdagsradarnInput,
  type RiksdagsradarnOutput,
  type RiksdagsradarnSourceCard,
} from "./schemas";

export interface PipelineDeps {
  log?: (event: string, data?: unknown) => void;
}

const llmOutputSchema = z.object({
  partyPositions: z
    .array(
      z.object({
        parti: z.string(),
        summary: z.string(),
        claims: z
          .array(
            z.object({
              text: z.string(),
              type: z.enum(["empirical", "normative", "critique", "proposal"]),
              sourceChunkIds: z.array(z.string()).min(1),
              confidence: z.enum(["low", "medium", "high"]),
            }),
          )
          .min(0),
      }),
    )
    .min(0),
  conflictLines: z.array(z.string()),
  summaries: z.object({
    neutral: z.string(),
    conflict: z.string(),
    citizen: z.string(),
  }),
});

export async function runRiksdagsradarnPipeline(
  input: RiksdagsradarnInput,
  deps: PipelineDeps = {},
): Promise<RiksdagsradarnOutput> {
  const log = deps.log ?? (() => undefined);
  log("start", { topic: input.topic, range: [input.dateFrom, input.dateTo] });

  const dateFrom = startOfDayUtc(input.dateFrom);
  const dateTo = endOfDayUtc(input.dateTo);

  const hits = await hybridRetrieve({
    topic: input.topic,
    dateFrom,
    dateTo,
    parties: input.parties,
    limit: input.retrievalLimit,
  });
  log("retrieved", { count: hits.length });

  if (hits.length === 0) {
    return riksdagsradarnOutputSchema.parse({
      topic: input.topic,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
      totalAnforanden: 0,
      partyPositions: [],
      conflictLines: [],
      summaries: {
        neutral:
          "Inga relevanta riksdagsanföranden hittades för det angivna ämnet och tidsintervallet.",
        conflict: "",
        citizen: "",
      },
      sourceCards: [],
      emptyResult: true,
    });
  }

  const sourceCards = hits.map(hitToSourceCard);
  const validChunkIds = new Set(hits.map((h) => h.chunkId));

  const grouped = groupHitsByParty(hits);
  const router = getRouter();
  const { system, user } = analysePrompt({
    topic: input.topic,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    hitsByParty: grouped,
  });

  const llmRes = await router.json(
    "strong",
    {
      system,
      messages: [{ role: "user", content: user }],
      temperature: 0.2,
      maxTokens: 12000,
    },
    llmOutputSchema,
  );
  log("analysed", {
    parties: llmRes.data.partyPositions.length,
    claims: llmRes.data.partyPositions.reduce(
      (sum, p) => sum + p.claims.length,
      0,
    ),
    conflictLines: llmRes.data.conflictLines.length,
  });

  // Filter out any chunk ids the model invented and warn rather than fail.
  const sanitisedPositions = llmRes.data.partyPositions.map((p) => ({
    parti: p.parti,
    summary: p.summary,
    claims: p.claims
      .map((c) => ({
        ...c,
        sourceChunkIds: c.sourceChunkIds.filter((id) => validChunkIds.has(id)),
      }))
      .filter((c) => c.sourceChunkIds.length > 0),
  }));

  // anforandeId is on source_docs.externalId; we use sourceDocId as the
  // canonical identity in retrieval results.
  const totalAnforanden = new Set(hits.map((h) => h.sourceDocId)).size;

  return riksdagsradarnOutputSchema.parse({
    topic: input.topic,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    totalAnforanden,
    partyPositions: sanitisedPositions,
    conflictLines: llmRes.data.conflictLines,
    summaries: llmRes.data.summaries,
    sourceCards,
    emptyResult: false,
  });
}

function hitToSourceCard(h: RiksdagHit): RiksdagsradarnSourceCard {
  return {
    chunkId: h.chunkId,
    paragraphIndex: h.paragraphIndex,
    text: h.text,
    talare: h.meta.talare,
    parti: h.meta.parti,
    dokDatum: h.meta.dokDatum,
    avsnittsrubrik: h.meta.avsnittsrubrik,
    underrubrik: h.meta.underrubrik,
    anforandeUrlHtml: h.meta.anforandeUrlHtml,
    protokollUrlWww: h.meta.protokollUrlWww,
    retrievalScore: h.score,
  };
}

function startOfDayUtc(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function endOfDayUtc(iso: string): Date {
  return new Date(`${iso}T23:59:59.999Z`);
}

export { PROMPT_VERSIONS };
