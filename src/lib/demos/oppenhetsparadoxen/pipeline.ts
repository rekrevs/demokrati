import { z } from "zod";
import { getRouter } from "@/lib/llm";
import { PROMPT_VERSIONS, transformPrompt } from "./prompts";
import {
  oppenhetsparadoxenOutputSchema,
  OPPENHET_AUDIENCES,
  OPPENHET_DIFF_TYPES,
  OPPENHET_SEVERITIES,
  type OppenhetsparadoxenInput,
  type OppenhetsparadoxenOutput,
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
  versions: z.array(
    z.object({
      audience: z.enum(OPPENHET_AUDIENCES),
      text: z.string(),
      audienceNote: z.string(),
      diffs: z.array(
        z.object({
          type: z.enum(OPPENHET_DIFF_TYPES),
          severity: z.enum(OPPENHET_SEVERITIES),
          message: z.string(),
          originalExcerpt: z.string(),
          transformedExcerpt: z.string(),
        }),
      ),
      shiftSummary: z.string(),
    }),
  ),
});

export async function runOppenhetsparadoxenPipeline(
  input: OppenhetsparadoxenInput,
  deps: PipelineDeps = {},
): Promise<OppenhetsparadoxenOutput> {
  const log = deps.log ?? (() => undefined);
  const setProgress = deps.setProgress ?? (async () => undefined);
  log("start", {
    title: input.sourceTitle,
    audiences: input.audiences,
  });

  await setProgress({
    phase: "transforming",
    message: `Producerar ${input.audiences.length} målgruppsversioner och analyserar betydelseförskjutningar…`,
    data: { audienceCount: input.audiences.length },
  });

  const router = getRouter();
  const { system, user } = transformPrompt({
    sourceTitle: input.sourceTitle,
    originalText: input.originalText,
    audiences: input.audiences,
  });

  const res = await router.json(
    "strong",
    {
      system,
      messages: [{ role: "user", content: user }],
      temperature: 0.3,
      maxTokens: 8000,
    },
    llmOutputSchema,
  );
  log("transformed", { versions: res.data.versions.length });

  // Order versions to match input audience order, drop unknowns.
  const byAudience = new Map(res.data.versions.map((v) => [v.audience, v]));
  const orderedVersions = input.audiences
    .map((a) => byAudience.get(a))
    .filter((v): v is NonNullable<typeof v> => Boolean(v));

  return oppenhetsparadoxenOutputSchema.parse({
    sourceTitle: input.sourceTitle,
    originalText: input.originalText,
    versions: orderedVersions,
  });
}

export { PROMPT_VERSIONS };
