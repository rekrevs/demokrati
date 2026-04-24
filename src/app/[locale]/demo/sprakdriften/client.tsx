"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ComparisonGrid } from "@/components/shared/comparison-grid";
import { ResultCard } from "@/components/shared/result-card";
import { MethodsDrawer } from "@/components/shared/methods-drawer";
import { SharePanel } from "@/components/shared/share-panel";
import {
  LANGUAGE_LABELS,
  RTL_LANGUAGES,
  type SprakdriftenInput,
  type SprakdriftenLanguage,
  type SprakdriftenOutput,
} from "@/lib/demos/sprakdriften/schemas";
import type { Scenario } from "@/lib/demos/module";

type RunStatus = "idle" | "submitting" | "queued" | "running" | "completed" | "failed";

interface RunState {
  scenarioSlug: string;
  runId: string | null;
  status: RunStatus;
  cached: boolean;
  output: SprakdriftenOutput | null;
  error: string | null;
}

interface Props {
  scenarios: Scenario<SprakdriftenInput>[];
}

const IDLE: RunState = {
  scenarioSlug: "",
  runId: null,
  status: "idle",
  cached: false,
  output: null,
  error: null,
};

export function SprakdriftenClient({ scenarios }: Props) {
  const t = useTranslations("sprakdriften");
  const [state, setState] = React.useState<RunState>(IDLE);

  const submit = React.useCallback(
    async (scenario: Scenario<SprakdriftenInput>) => {
      setState({
        scenarioSlug: scenario.slug,
        runId: null,
        status: "submitting",
        cached: false,
        output: null,
        error: null,
      });
      try {
        const res = await fetch("/api/run/sprakdriften", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            mode: "FEATURED",
            input: scenario.input,
          }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(detail.error ?? `HTTP ${res.status}`);
        }
        const payload = (await res.json()) as {
          runId: string;
          status: "queued" | "completed";
          cached: boolean;
        };
        setState((s) => ({
          ...s,
          runId: payload.runId,
          status: payload.status === "completed" ? "running" : "queued",
          cached: payload.cached,
        }));

        // If the API says cached+completed, we still need to fetch the output
        await pollRun(payload.runId, setState);
      } catch (err) {
        setState((s) => ({
          ...s,
          status: "failed",
          error: (err as Error).message,
        }));
      }
    },
    [],
  );

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-12">
      <header className="space-y-2">
        <Badge variant="secondary">Akt II · påverkansmotor</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("tagline")}</p>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("intro")}</p>
      </header>

      <section>
        <h2 className="mb-4 text-lg font-medium">{t("chooseFeatured")}</h2>
        <ComparisonGrid columns={3}>
          {scenarios.map((sc) => (
            <Card key={sc.slug} className="flex flex-col">
              <CardHeader>
                <CardTitle>{sc.title}</CardTitle>
                <CardDescription>{sc.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="flex flex-wrap gap-1">
                  {sc.input.languages.map((lang) => (
                    <Badge key={lang} variant="outline">
                      {LANGUAGE_LABELS[lang].native}
                    </Badge>
                  ))}
                </div>
              </CardContent>
              <div className="border-t border-border px-6 py-3">
                <Button
                  onClick={() => submit(sc)}
                  disabled={state.status === "submitting" || state.status === "queued" || state.status === "running"}
                  size="sm"
                >
                  {state.scenarioSlug === sc.slug &&
                  (state.status === "submitting" ||
                    state.status === "queued" ||
                    state.status === "running")
                    ? t("running")
                    : t("run")}
                </Button>
              </div>
            </Card>
          ))}
        </ComparisonGrid>
      </section>

      {state.status !== "idle" ? (
        <ResultPanel state={state} t={t} />
      ) : null}
    </main>
  );
}

function ResultPanel({
  state,
  t,
}: {
  state: RunState;
  t: ReturnType<typeof useTranslations>;
}) {
  if (state.status === "failed") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("failed")}</CardTitle>
          <CardDescription>
            {state.error ?? "okänt fel"}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (state.output == null) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t(state.status === "queued" ? "queued" : "running")}</CardTitle>
          <CardDescription>{t("waitingForResult")}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const output = state.output;
  const shareUrl =
    typeof window !== "undefined" && state.runId
      ? `${window.location.origin}/api/runs/${state.runId}`
      : "";

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-muted-foreground">
            {t("questionLabel")}
          </div>
          <div className="text-xl font-medium">
            {output.canonicalQuestionSv}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={state.cached ? "secondary" : "default"}>
            {state.cached ? t("cached") : t("live")}
          </Badge>
          <MethodsDrawer
            title={t("methodsTitle")}
            triggerLabel={t("methodsTitle")}
            entries={[
              { label: t("method_question"), value: output.canonicalQuestionSv },
              {
                label: t("method_languages"),
                value: output.answers.map((a) => a.language).join(", "),
              },
              { label: t("method_style"), value: output.style },
              { label: t("method_runId"), value: state.runId ?? "" },
            ]}
          />
          {shareUrl ? <SharePanel url={shareUrl} /> : null}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">{t("answersTitle")}</h2>
        <ComparisonGrid columns={3}>
          {output.answers.map((a) => (
            <ResultCard
              key={a.language}
              title={LANGUAGE_LABELS[a.language as SprakdriftenLanguage].native}
              subtitle={`${a.language} · ${a.tone}`}
              badge={a.certaintyLevel}
              badgeVariant={certaintyVariant(a.certaintyLevel)}
              body={a.answerSv}
              dir={
                RTL_LANGUAGES.has(a.language as SprakdriftenLanguage)
                  ? "rtl"
                  : undefined
              }
              footer={
                a.institutionsMentioned.length > 0 ? (
                  <span>
                    <strong>
                      {LANGUAGE_LABELS[a.language as SprakdriftenLanguage].sv}
                    </strong>
                    {": "}
                    {a.institutionsMentioned.join(", ")}
                  </span>
                ) : null
              }
            />
          ))}
        </ComparisonGrid>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-medium">{t("differencesTitle")}</h2>
        {output.observedDifferences.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">
            {t("noDifferences")}
          </p>
        ) : (
          <div className="space-y-3">
            {output.observedDifferences.map((d, i) => (
              <Card key={i}>
                <CardHeader>
                  <CardTitle className="text-base">{d.dimension}</CardTitle>
                  <CardDescription>{d.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {d.evidence.map((e, j) => (
                      <li key={j}>
                        <Badge variant="outline" className="mr-2">
                          {e.language}
                        </Badge>
                        <em>{e.quote}</em>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground italic">
        {t("dirDisclaimer")}
      </p>
    </section>
  );
}

function certaintyVariant(level: "low" | "medium" | "high") {
  if (level === "high") return "default" as const;
  if (level === "low") return "warning" as const;
  return "secondary" as const;
}

async function pollRun(
  runId: string,
  setState: React.Dispatch<React.SetStateAction<RunState>>,
) {
  const started = Date.now();
  while (Date.now() - started < 120_000) {
    await new Promise((r) => setTimeout(r, 1200));
    try {
      const res = await fetch(`/api/runs/${runId}`);
      if (!res.ok) continue;
      const data = (await res.json()) as {
        status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";
        output: SprakdriftenOutput | null;
        error: unknown;
      };
      if (data.status === "COMPLETED" && data.output) {
        setState((s) => ({
          ...s,
          status: "completed",
          output: data.output,
        }));
        return;
      }
      if (data.status === "FAILED") {
        const errMsg =
          (data.error as { message?: string } | null)?.message ??
          "run failed";
        setState((s) => ({ ...s, status: "failed", error: errMsg }));
        return;
      }
      setState((s) => ({
        ...s,
        status:
          data.status === "RUNNING" ? "running" : data.status === "QUEUED" ? "queued" : s.status,
      }));
    } catch {
      /* transient fetch error; retry */
    }
  }
  setState((s) => ({ ...s, status: "failed", error: "timeout" }));
}
