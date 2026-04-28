import { z } from "zod";
import { getRouter } from "@/lib/llm";
import { analysePrompt, PROMPT_VERSIONS } from "./prompts";
import {
  oenighetskartanOutputSchema,
  type OenighetskartanInput,
  type OenighetskartanOutput,
} from "./schemas";

export interface PipelineDeps {
  log?: (event: string, data?: unknown) => void;
  setProgress?: (update: {
    phase: string;
    message: string;
    data?: Record<string, unknown>;
  }) => Promise<void>;
}

const llmOutputSchema = z.object({
  dimensions: z
    .array(
      z.object({
        id: z.string(),
        leftLabel: z.string(),
        rightLabel: z.string(),
        description: z.string(),
        evidenceStatementIds: z.array(z.string()),
      }),
    )
    .min(0),
  clusters: z.array(
    z.object({
      id: z.string(),
      label: z.string(),
      description: z.string(),
      memberStatementIds: z.array(z.string()),
    }),
  ),
  points: z.array(
    z.object({
      statementId: z.string(),
      text: z.string(),
      clusterId: z.string(),
      scores: z.record(z.string(), z.number()),
    }),
  ),
  sharedPremises: z.array(z.string()),
  empiricalDisagreements: z.array(z.string()),
  valueConflicts: z.array(z.string()),
  contestedTerms: z.array(
    z.object({ term: z.string(), meanings: z.array(z.string()) }),
  ),
  nextBetterQuestion: z.string(),
});

export async function runOenighetskartanPipeline(
  input: OenighetskartanInput,
  deps: PipelineDeps = {},
): Promise<OenighetskartanOutput> {
  const log = deps.log ?? (() => undefined);
  const setProgress = deps.setProgress ?? (async () => undefined);
  log("start", {
    topic: input.topic,
    statementCount: input.statements.length,
  });

  await setProgress({
    phase: "analysing",
    message: `Analyserar ${input.statements.length} påståenden för att inferra konfliktdimensioner…`,
    data: { statementCount: input.statements.length },
  });

  const router = getRouter();
  const { system, user } = analysePrompt({
    topic: input.topic,
    statements: input.statements,
  });

  const res = await router.json(
    "strong",
    {
      system,
      messages: [{ role: "user", content: user }],
      temperature: 0.2,
      maxTokens: 8000,
    },
    llmOutputSchema,
  );
  log("analysed", {
    dimensions: res.data.dimensions.length,
    clusters: res.data.clusters.length,
    points: res.data.points.length,
  });

  await setProgress({
    phase: "validating",
    message: "Validerar att alla påståenden ingår…",
  });

  // Sanitise: ensure every input statement appears in points exactly
  // once. If the model dropped some, fill with cluster=unknown and
  // zero scores. If it invented IDs, drop those.
  const inputIds = new Set(input.statements.map((s) => s.id));
  const filteredPoints = res.data.points.filter((p) =>
    inputIds.has(p.statementId),
  );
  const seenPointIds = new Set(filteredPoints.map((p) => p.statementId));
  const dimensionIds = res.data.dimensions.map((d) => d.id);
  const zeroScores = Object.fromEntries(dimensionIds.map((id) => [id, 0]));
  const fallbackClusterId =
    res.data.clusters[0]?.id ??
    `cluster-fallback-${Math.random().toString(36).slice(2, 8)}`;

  for (const stmt of input.statements) {
    if (!seenPointIds.has(stmt.id)) {
      filteredPoints.push({
        statementId: stmt.id,
        text: stmt.text,
        clusterId: fallbackClusterId,
        scores: zeroScores,
      });
    }
  }
  // Order points to match input order, for predictable rendering.
  const pointById = new Map(filteredPoints.map((p) => [p.statementId, p]));
  const orderedPoints = input.statements
    .map((s) => pointById.get(s.id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  // Sanitise cluster membership and dimension evidence
  const sanitisedClusters = res.data.clusters.map((c) => ({
    ...c,
    memberStatementIds: c.memberStatementIds.filter((id) => inputIds.has(id)),
  }));
  const sanitisedDimensions = res.data.dimensions.map((d) => ({
    ...d,
    evidenceStatementIds: d.evidenceStatementIds.filter((id) =>
      inputIds.has(id),
    ),
  }));

  // Cap at 3 contested terms with 2+ meanings (schema requires ≥2)
  const sanitisedTerms = res.data.contestedTerms
    .filter((t) => t.meanings.length >= 2)
    .slice(0, 3);

  return oenighetskartanOutputSchema.parse({
    topic: input.topic,
    totalStatements: input.statements.length,
    dimensions: sanitisedDimensions,
    clusters: sanitisedClusters,
    points: orderedPoints,
    sharedPremises: res.data.sharedPremises,
    empiricalDisagreements: res.data.empiricalDisagreements,
    valueConflicts: res.data.valueConflicts,
    contestedTerms: sanitisedTerms,
    nextBetterQuestion: res.data.nextBetterQuestion,
    emptyResult: input.statements.length === 0,
  });
}

export { PROMPT_VERSIONS };
