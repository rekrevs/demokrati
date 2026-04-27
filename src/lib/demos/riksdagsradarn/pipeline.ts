import { z } from "zod";
import { getRouter } from "@/lib/llm";
import {
  groupHitsByParty,
  hybridRetrieve,
  type RiksdagHit,
} from "@/lib/retrieval/riksdag";
import {
  claimsPrompt,
  narrativesPrompt,
  PROMPT_VERSIONS,
} from "./prompts";
import {
  riksdagsradarnOutputSchema,
  type RiksdagsradarnInput,
  type RiksdagsradarnOutput,
  type RiksdagsradarnSourceCard,
} from "./schemas";

export interface PipelineDeps {
  log?: (event: string, data?: unknown) => void;
  setProgress?: (update: {
    phase: string;
    message: string;
    data?: Record<string, unknown>;
  }) => Promise<void>;
}

const claimsOutputSchema = z.object({
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
});

const narrativesOutputSchema = z.object({
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
  const setProgress = deps.setProgress ?? (async () => undefined);
  log("start", { topic: input.topic, range: [input.dateFrom, input.dateTo] });

  await setProgress({
    phase: "retrieving",
    message: `Söker i indexerade riksdagsanföranden för "${input.topic}"…`,
  });

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
  await setProgress({
    phase: "retrieved",
    message: `Hittade ${hits.length} relevanta textsegment`,
    data: { hitCount: hits.length },
  });

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

  // ── Pass 1: extract claims and per-party summaries ─────────────────
  await setProgress({
    phase: "extracting_claims",
    message: `Extraherar typade påståenden från ${grouped.length} partier…`,
    data: { partyCount: grouped.length, hitCount: hits.length },
  });

  const claimsArgs = claimsPrompt({
    topic: input.topic,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    hitsByParty: grouped,
  });
  const claimsRes = await router.json(
    "strong",
    {
      system: claimsArgs.system,
      messages: [{ role: "user", content: claimsArgs.user }],
      temperature: 0.2,
      maxTokens: 6000,
    },
    claimsOutputSchema,
  );
  const sanitisedPositions = claimsRes.data.partyPositions
    .map((p) => ({
      parti: p.parti,
      summary: p.summary,
      claims: p.claims
        .map((c) => ({
          ...c,
          sourceChunkIds: c.sourceChunkIds.filter((id) =>
            validChunkIds.has(id),
          ),
        }))
        .filter((c) => c.sourceChunkIds.length > 0),
    }))
    .filter((p) => p.summary.length > 0 || p.claims.length > 0);
  log("claims_extracted", {
    parties: sanitisedPositions.length,
    claims: sanitisedPositions.reduce((s, p) => s + p.claims.length, 0),
  });

  // ── Pass 2: conflict lines + three narrative summary regimes ───────
  await setProgress({
    phase: "summarising",
    message: "Skriver tre sammanfattningsregimer…",
    data: { partyCount: sanitisedPositions.length },
  });

  const narrArgs = narrativesPrompt({
    topic: input.topic,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    partyPositions: sanitisedPositions.map((p) => ({
      parti: p.parti,
      summary: p.summary,
      claimCount: p.claims.length,
    })),
  });
  const narrRes = await router.json(
    "strong",
    {
      system: narrArgs.system,
      messages: [{ role: "user", content: narrArgs.user }],
      temperature: 0.2,
      maxTokens: 3000,
    },
    narrativesOutputSchema,
  );
  log("narratives_done", {
    conflictLines: narrRes.data.conflictLines.length,
  });

  await setProgress({
    phase: "finalising",
    message: "Sammanställer resultat…",
  });

  const totalAnforanden = new Set(hits.map((h) => h.sourceDocId)).size;

  return riksdagsradarnOutputSchema.parse({
    topic: input.topic,
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
    totalAnforanden,
    partyPositions: sanitisedPositions,
    conflictLines: narrRes.data.conflictLines,
    summaries: narrRes.data.summaries,
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
