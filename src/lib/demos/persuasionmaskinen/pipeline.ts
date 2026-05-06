import { z } from "zod";
import { getRouter } from "@/lib/llm";
import { POLICY_CASES, PROFILES } from "./library";
import { PROMPT_VERSIONS, generatePrompt } from "./prompts";
import {
  PERSUASION_CHANNELS,
  persuasionmaskinenOutputSchema,
  type PersuasionmaskinenInput,
  type PersuasionmaskinenOutput,
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
  genericMessage: z.string(),
  tailoredMessages: z.array(
    z.object({
      profileId: z.string(),
      profileSummary: z.string(),
      text: z.string(),
      rhetoricalFrame: z.string(),
      changedLevers: z.array(z.string()),
      emotionalCore: z.string(),
    }),
  ),
  warningCard: z.object({
    title: z.string(),
    body: z.string(),
  }),
});

export async function runPersuasionmaskinenPipeline(
  input: PersuasionmaskinenInput,
  deps: PipelineDeps = {},
): Promise<PersuasionmaskinenOutput> {
  const log = deps.log ?? (() => undefined);
  const setProgress = deps.setProgress ?? (async () => undefined);
  log("start", {
    case: input.policyCaseId,
    profiles: input.profileIds.length,
  });

  const policyCase = POLICY_CASES.find((c) => c.id === input.policyCaseId);
  if (!policyCase) {
    throw new Error(`Unknown policy case: ${input.policyCaseId}`);
  }
  const profileById = new Map(PROFILES.map((p) => [p.id, p]));
  const profiles = input.profileIds
    .map((id) => profileById.get(id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));
  if (profiles.length === 0) {
    throw new Error("No valid profiles selected");
  }

  await setProgress({
    phase: "generating",
    message: `Genererar generisk version + ${profiles.length} skräddarsydda budskap…`,
    data: { profileCount: profiles.length },
  });

  const router = getRouter();
  const { system, user } = generatePrompt({
    policyCase,
    channel: input.channel,
    profiles,
  });

  const res = await router.json(
    "strong",
    {
      system,
      messages: [{ role: "user", content: user }],
      temperature: 0.5,
      maxTokens: 5000,
    },
    llmOutputSchema,
  );
  log("generated", { tailored: res.data.tailoredMessages.length });

  // Sanitise: drop tailoredMessages with unknown profileIds; preserve input order.
  const validIds = new Set(profiles.map((p) => p.id));
  const byId = new Map(
    res.data.tailoredMessages
      .filter((t) => validIds.has(t.profileId))
      .map((t) => [t.profileId, t]),
  );
  const ordered = profiles
    .map((p) => byId.get(p.id))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  // Validate channel is one of the known list (defensive)
  const channel = PERSUASION_CHANNELS.includes(input.channel)
    ? input.channel
    : "kort-post";

  return persuasionmaskinenOutputSchema.parse({
    policyCaseId: policyCase.id,
    policyCaseTitle: policyCase.title,
    channel,
    genericMessage: res.data.genericMessage,
    tailoredMessages: ordered,
    warningCard: res.data.warningCard,
  });
}

export { PROMPT_VERSIONS };
