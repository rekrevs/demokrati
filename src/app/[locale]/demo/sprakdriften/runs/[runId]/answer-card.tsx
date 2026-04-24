"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LANGUAGE_LABELS,
  RTL_LANGUAGES,
  type SprakdriftenAnswer,
  type SprakdriftenCertainty,
  type SprakdriftenLanguage,
  type SprakdriftenTone,
} from "@/lib/demos/sprakdriften/schemas";

export function AnswerCard({ answer }: { answer: SprakdriftenAnswer }) {
  const t = useTranslations("sprakdriften");
  const lang = answer.language as SprakdriftenLanguage;
  const isRtl = RTL_LANGUAGES.has(lang);
  const label = LANGUAGE_LABELS[lang];

  return (
    <Card className="flex flex-col" data-testid="answer-card">
      <CardHeader className="flex-row items-start justify-between gap-3 pb-3">
        <div>
          <CardTitle className="text-base">{label.native}</CardTitle>
          <div className="text-xs text-muted-foreground">
            {answer.language}
          </div>
        </div>
        <Badge variant={certaintyVariant(answer.certaintyLevel)}>
          {t(`certaintyLabels.${answer.certaintyLevel}`)}
        </Badge>
      </CardHeader>

      <CardContent className="flex-1 space-y-5 text-sm">
        <Section label={t("questionInTargetLabel")}>
          <p dir={isRtl ? "rtl" : "ltr"}>{answer.questionInTarget}</p>
        </Section>

        <Section label={t("answerOriginalLabel", { language: label.native })}>
          <p
            dir={isRtl ? "rtl" : "ltr"}
            className="whitespace-pre-wrap text-sm leading-relaxed"
          >
            {answer.answerOriginal}
          </p>
        </Section>

        {answer.language !== "sv" ? (
          <Section label={t("answerSvLabel")}>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {answer.answerSv}
            </p>
          </Section>
        ) : null}
      </CardContent>

      <CardFooter className="flex flex-col items-start gap-2 border-t border-border pt-4 text-xs">
        <div>
          <span className="font-medium">{t("toneLabel")}:</span>{" "}
          <Badge variant="secondary">
            {t(`toneLabels.${answer.tone}`)}
          </Badge>
        </div>
        {answer.framing.length > 0 ? (
          <div>
            <span className="font-medium">{t("framingLabel")}:</span>{" "}
            {answer.framing.map((f, i) => (
              <Badge key={i} variant="outline" className="ml-1">
                {f}
              </Badge>
            ))}
          </div>
        ) : null}
        {answer.institutionsMentioned.length > 0 ? (
          <div>
            <span className="font-medium">{t("institutionsLabel")}:</span>{" "}
            <span className="text-muted-foreground">
              {answer.institutionsMentioned.join(", ")}
            </span>
          </div>
        ) : null}
      </CardFooter>
    </Card>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1">
      <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h4>
      {children}
    </section>
  );
}

function certaintyVariant(
  level: SprakdriftenCertainty,
): React.ComponentProps<typeof Badge>["variant"] {
  if (level === "high") return "default";
  if (level === "low") return "warning";
  return "secondary";
}

// Keep this import reference alive for bundlers treating the file as a
// type-only module if future refactors drop runtime usage:
export type { SprakdriftenTone };
