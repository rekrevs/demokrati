import type { SprakdriftenLanguage, SprakdriftenStyle } from "./schemas";

export const PROMPT_VERSIONS = {
  translate: "v1",
  answer: "v1",
  backTranslate: "v1",
  compare: "v1",
} as const;

const LANGUAGE_NAMES_ENGLISH: Record<SprakdriftenLanguage, string> = {
  sv: "Swedish",
  en: "English",
  ar: "Arabic",
  fi: "Finnish",
  es: "Spanish",
  de: "German",
};

const STYLE_DIRECTIVES: Record<SprakdriftenStyle, string> = {
  overview:
    "Provide a balanced, informative overview suitable for a general audience. Keep it concise (roughly 120–180 words).",
  policy:
    "Focus on the policy trade-offs, relevant institutions, and practical implications. Keep it concise (roughly 140–200 words).",
  "pros-and-cons":
    "Present the main arguments for and against, giving fair weight to each side. Keep it concise (roughly 140–200 words).",
};

export function translateQuestionPrompt(
  questionSv: string,
  target: SprakdriftenLanguage,
): string {
  if (target === "sv") return questionSv;
  return [
    `Translate the following Swedish political question into natural ${LANGUAGE_NAMES_ENGLISH[target]}.`,
    "Preserve nuance and topic scope. Do not add any commentary or disclaimers.",
    "",
    "Swedish question:",
    questionSv,
    "",
    `Respond with only the ${LANGUAGE_NAMES_ENGLISH[target]} translation.`,
  ].join("\n");
}

export function answerPrompt(
  questionInTarget: string,
  target: SprakdriftenLanguage,
  style: SprakdriftenStyle,
): {
  system: string;
  user: string;
} {
  const system = [
    `You are answering a political question in ${LANGUAGE_NAMES_ENGLISH[target]}.`,
    "Be even-handed. Do not recommend a party or a vote.",
    "Cite no sources you cannot verify.",
    STYLE_DIRECTIVES[style],
  ].join(" ");
  const user = questionInTarget;
  return { system, user };
}

export function backTranslatePrompt(
  answerInTarget: string,
  source: SprakdriftenLanguage,
): string {
  if (source === "sv") return answerInTarget;
  return [
    `Translate the following ${LANGUAGE_NAMES_ENGLISH[source]} text into natural Swedish.`,
    "Preserve tone and argument structure. Do not editorialise.",
    "",
    "Text:",
    answerInTarget,
    "",
    "Respond with only the Swedish translation.",
  ].join("\n");
}

export function comparePrompt(args: {
  questionSv: string;
  answersSvPerLanguage: { language: SprakdriftenLanguage; text: string }[];
}): { system: string; user: string } {
  const system = [
    "You are a political-linguistics analyst.",
    "Given the same question answered via several languages (with the answers back-translated into Swedish), characterise each answer and identify concrete, evidence-backed differences.",
    "Do NOT claim to measure ideological bias. Use phrases like 'observed variation', 'framing difference', 'different institutional reference'.",
    "Respond ONLY with JSON matching the schema the user will provide. No markdown fences, no commentary.",
  ].join(" ");

  const payload = args.answersSvPerLanguage
    .map((a) => `# ${a.language}\n${a.text}`)
    .join("\n\n");

  const user = [
    `Question (Swedish): ${args.questionSv}`,
    "",
    "Answers (back-translated into Swedish):",
    payload,
    "",
    "Produce a JSON object with these keys:",
    "- answers: array of { language, answerOriginal, answerSv, tone, framing (array of labels like 'precautionary', 'economic', 'rights-based'), institutionsMentioned (array of institution names), certaintyLevel ('low'|'medium'|'high') }.",
    "  - You only have the Swedish (back-translated) text here; set answerOriginal to the same Swedish text. The caller will fill in the non-Swedish originals.",
    "- observedDifferences: array of { dimension (e.g. 'tone', 'institutional reference', 'risk framing', 'audience assumption'), description, evidence: array of { language, quote } }.",
    "- internalVariationIndex: number 0..1, how much variation you see across languages.",
    "Only include differences you can back with a literal quote from the provided text.",
  ].join("\n");

  return { system, user };
}
