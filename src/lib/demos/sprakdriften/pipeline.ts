import { z } from "zod";
import type { ModelRouter } from "@/lib/llm/router";
import {
  backTranslatePrompt,
  answerPrompt,
  comparePrompt,
  translateQuestionPrompt,
  PROMPT_VERSIONS,
} from "./prompts";
import {
  sprakdriftenOutputSchema,
  type SprakdriftenInput,
  type SprakdriftenLanguage,
  type SprakdriftenOutput,
  type SprakdriftenStyle,
} from "./schemas";

export interface PipelineDeps {
  router: ModelRouter;
  log: (event: string, data?: unknown) => void;
}

interface StageResult {
  language: SprakdriftenLanguage;
  questionInTarget: string;
  answerOriginal: string;
  answerSv: string;
}

async function translateQuestion(
  deps: PipelineDeps,
  questionSv: string,
  target: SprakdriftenLanguage,
): Promise<string> {
  if (target === "sv") return questionSv;
  const res = await deps.router.text("multilingual", {
    messages: [
      { role: "user", content: translateQuestionPrompt(questionSv, target) },
    ],
    temperature: 0.2,
    maxTokens: 400,
  });
  return res.text.trim();
}

async function askInLanguage(
  deps: PipelineDeps,
  questionInTarget: string,
  target: SprakdriftenLanguage,
  style: SprakdriftenStyle,
): Promise<string> {
  const { system, user } = answerPrompt(questionInTarget, target, style);
  const res = await deps.router.text("multilingual", {
    system,
    messages: [{ role: "user", content: user }],
    temperature: 0.4,
    maxTokens: 600,
  });
  return res.text.trim();
}

async function backTranslate(
  deps: PipelineDeps,
  answerInTarget: string,
  source: SprakdriftenLanguage,
): Promise<string> {
  if (source === "sv") return answerInTarget;
  const res = await deps.router.text("multilingual", {
    messages: [
      { role: "user", content: backTranslatePrompt(answerInTarget, source) },
    ],
    temperature: 0.1,
    maxTokens: 800,
  });
  return res.text.trim();
}

const compareSchema = z.object({
  answers: z
    .array(
      z.object({
        language: z.string(),
        tone: z.string(),
        framing: z.array(z.string()),
        institutionsMentioned: z.array(z.string()),
        certaintyLevel: z.enum(["low", "medium", "high"]),
      }),
    )
    .min(1),
  observedDifferences: z.array(
    z.object({
      dimension: z.string(),
      description: z.string(),
      evidence: z
        .array(
          z.object({ language: z.string(), quote: z.string() }),
        )
        .min(1),
    }),
  ),
  internalVariationIndex: z.number().min(0).max(1),
});

async function compareAnswers(
  deps: PipelineDeps,
  questionSv: string,
  stages: StageResult[],
): Promise<z.infer<typeof compareSchema>> {
  const { system, user } = comparePrompt({
    questionSv,
    answersSvPerLanguage: stages.map((s) => ({
      language: s.language,
      text: s.answerSv,
    })),
  });
  const res = await deps.router.json(
    "strong",
    {
      system,
      messages: [{ role: "user", content: user }],
      temperature: 0.2,
      maxTokens: 2500,
    },
    compareSchema,
  );
  return res.data;
}

export async function runSprakdriftenPipeline(
  input: SprakdriftenInput,
  deps: PipelineDeps,
): Promise<SprakdriftenOutput> {
  deps.log("start", { languages: input.languages, style: input.style });

  const withQuestions = await Promise.all(
    input.languages.map(async (lang) => ({
      language: lang,
      questionInTarget: await translateQuestion(deps, input.questionSv, lang),
    })),
  );
  deps.log("translated", { n: withQuestions.length });

  const withAnswers = await Promise.all(
    withQuestions.map(async (s) => ({
      ...s,
      answerOriginal: await askInLanguage(
        deps,
        s.questionInTarget,
        s.language,
        input.style,
      ),
    })),
  );
  deps.log("answered", { n: withAnswers.length });

  const withBackTranslations: StageResult[] = await Promise.all(
    withAnswers.map(async (s) => ({
      ...s,
      answerSv: await backTranslate(deps, s.answerOriginal, s.language),
    })),
  );
  deps.log("back-translated");

  const compared = await compareAnswers(
    deps,
    input.questionSv,
    withBackTranslations,
  );
  deps.log("compared", {
    differences: compared.observedDifferences.length,
  });

  // Merge: comparison tells us the analytical fields; we own the original
  // texts since the compare step only saw Swedish back-translations.
  const byLang = new Map(
    withBackTranslations.map((s) => [s.language, s] as const),
  );
  const answers = input.languages.map((lang) => {
    const stage = byLang.get(lang);
    const analytic = compared.answers.find((a) => a.language === lang);
    if (!stage || !analytic) {
      throw new Error(`Missing comparison analytics for language ${lang}`);
    }
    return {
      language: lang,
      answerOriginal: stage.answerOriginal,
      answerSv: stage.answerSv,
      tone: analytic.tone,
      framing: analytic.framing,
      institutionsMentioned: analytic.institutionsMentioned,
      certaintyLevel: analytic.certaintyLevel,
    };
  });

  return sprakdriftenOutputSchema.parse({
    canonicalQuestionSv: input.questionSv,
    style: input.style,
    answers,
    observedDifferences: compared.observedDifferences,
    internalVariationIndex: compared.internalVariationIndex,
  });
}

export { PROMPT_VERSIONS };
