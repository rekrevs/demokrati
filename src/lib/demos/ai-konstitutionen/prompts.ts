export const PROMPT_VERSIONS = {
  baseline: "v1",
  compare: "v1",
} as const;

/**
 * Baseline system prompt: a default helpful assistant with no
 * publik-styrd constitution. Anchored Swedish, no party recommendation
 * baked in (we want the user to SEE the difference; we don't want the
 * baseline to randomly recommend a party either).
 */
export const BASELINE_SYSTEM_PROMPT = [
  "Du är en hjälpsam AI-assistent som svarar på frågor om svensk politik och samhällsfrågor.",
  "Svara på svenska om frågan är på svenska.",
].join("\n");

interface ComparePromptInput {
  question: string;
  baselineAnswer: string;
  governedAnswer: string;
  ruleLabels: string[];
}

/**
 * Diff-and-analyse pass. Reads both answers and the active rules,
 * names what shifted, and rates each shift on a small fixed axis
 * vocabulary so the UI can render a stable trade-off radar.
 */
export function comparePrompt(input: ComparePromptInput): {
  system: string;
  user: string;
} {
  const system = [
    "You are an analyst comparing two AI responses to the same political question.",
    "One response (baseline) was produced by a default assistant with no special policy.",
    "The other (governed) was produced after a publik-styrd constitution was applied.",
    "Your job is to characterise what concretely shifted between the two responses, in Swedish.",
    "Operate dispassionately — the goal is to make trade-offs visible, not to say which response is better.",
    "Respond ONLY with JSON matching the schema in the user message. No prose, no markdown fences.",
  ].join("\n");

  const ruleList =
    input.ruleLabels.length > 0
      ? input.ruleLabels.map((l, i) => `${i + 1}. ${l}`).join("\n")
      : "(inga regler aktiverade)";

  const user = [
    `Question: ${input.question}`,
    "",
    "Active constitution rules:",
    ruleList,
    "",
    "BASELINE answer:",
    input.baselineAnswer,
    "",
    "GOVERNED answer:",
    input.governedAnswer,
    "",
    "Produce a JSON object with exactly this shape:",
    "{",
    '  "observedChanges": [string, ...],   // 3–6 short Swedish strings naming concrete differences (max 200 chars each).',
    '  "tradeoffs": [',
    "    {",
    '      "axis": "pluralism" | "tydlighet" | "neutralitet" | "handlingskraft" | "källkrav" | "minoritetsskydd" | "korthet" | "osäkerhetsmarkering",',
    '      "direction": "increased" | "decreased" | "unchanged",',
    '      "explanation": string         // max 240 chars',
    "    }",
    "    // 4–7 axes",
    "  ]",
    "}",
    "",
    "Cover at least: pluralism, tydlighet, neutralitet, handlingskraft. Add other axes only when meaningful.",
    "If the baseline already exhibited a property strongly, the change can be 'unchanged' or even 'decreased' — that is the point.",
  ].join("\n");

  return { system, user };
}
