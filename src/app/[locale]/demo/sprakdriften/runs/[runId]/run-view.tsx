"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ComparisonGrid } from "@/components/shared/comparison-grid";
import { MethodsDrawer } from "@/components/shared/methods-drawer";
import { SharePanel } from "@/components/shared/share-panel";
import type { SprakdriftenOutput } from "@/lib/demos/sprakdriften/schemas";
import { AnswerCard } from "./answer-card";

type RunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "UNKNOWN";

interface State {
  status: RunStatus;
  output: SprakdriftenOutput | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
}

const INITIAL: State = {
  status: "UNKNOWN",
  output: null,
  error: null,
  startedAt: null,
  completedAt: null,
};

export function RunView({ runId }: { runId: string }) {
  const t = useTranslations("sprakdriften");
  const [state, setState] = React.useState<State>(INITIAL);

  React.useEffect(() => {
    let cancelled = false;
    const start = Date.now();

    async function tick() {
      try {
        const res = await fetch(`/api/runs/${runId}`);
        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) {
              setState({
                status: "FAILED",
                output: null,
                error: "Run not found",
                startedAt: null,
                completedAt: null,
              });
            }
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as {
          status: RunStatus;
          startedAt: string | null;
          completedAt: string | null;
          output: SprakdriftenOutput | null;
          error: { message?: string } | null;
        };
        if (cancelled) return;
        setState({
          status: data.status,
          output: data.output,
          error: data.error?.message ?? null,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
        });
        if (data.status === "COMPLETED" || data.status === "FAILED") return;
        if (Date.now() - start > 180_000) {
          setState((s) => ({
            ...s,
            status: "FAILED",
            error: "timeout waiting for result",
          }));
          return;
        }
      } catch {
        /* transient — retry */
      }
      if (!cancelled) {
        window.setTimeout(tick, 1_200);
      }
    }

    tick();
    return () => {
      cancelled = true;
    };
  }, [runId]);

  return (
    <main className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <nav className="flex items-center justify-between gap-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/demo/sprakdriften">
            <ArrowLeft className="h-4 w-4" />
            {t("backToDemo")}
          </Link>
        </Button>
        <SharePanel url={typeof window === "undefined" ? "" : window.location.href} />
      </nav>

      <header className="space-y-1">
        <Badge variant="secondary">{t("title")}</Badge>
        {state.output ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">
              {state.output.canonicalQuestionSv}
            </h1>
            <p className="text-xs text-muted-foreground">
              {t("runId")}: <code className="text-xs">{runId}</code>
              {state.completedAt
                ? ` · ${t("completedAt")} ${formatIso(state.completedAt)}`
                : null}
            </p>
          </>
        ) : (
          <h1 className="text-3xl font-semibold tracking-tight">
            {state.status === "FAILED" ? t("failed") : t("running")}
          </h1>
        )}
      </header>

      {state.status === "FAILED" ? (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/40">
          <CardHeader>
            <CardTitle className="text-base">{t("failed")}</CardTitle>
            <CardDescription className="whitespace-pre-wrap break-words">
              {state.error ?? "okänt fel"}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {state.status !== "COMPLETED" && state.status !== "FAILED" ? (
        <Card>
          <CardHeader>
            <CardTitle>{t("waitingForResult")}</CardTitle>
            <CardDescription>
              {t("statusLabel")}: {state.status === "UNKNOWN" ? "…" : state.status}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {state.output ? <ResultBody output={state.output} runId={runId} /> : null}
    </main>
  );
}

function ResultBody({
  output,
  runId,
}: {
  output: SprakdriftenOutput;
  runId: string;
}) {
  const t = useTranslations("sprakdriften");

  const methodEntries = [
    { label: t("method_question"), value: output.canonicalQuestionSv },
    {
      label: t("method_languages"),
      value: output.answers.map((a) => a.language).join(", "),
    },
    { label: t("method_style"), value: output.style },
    {
      label: t("method_toneExplainer"),
      value: t("method_toneExplainerBody"),
    },
    {
      label: t("method_certaintyExplainer"),
      value: t("method_certaintyExplainerBody"),
    },
    { label: t("method_runId"), value: runId },
  ];

  return (
    <>
      <section className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{t("answersTitle")}</h2>
        <MethodsDrawer
          title={t("methodsTitle")}
          triggerLabel={t("methodsTitle")}
          entries={methodEntries}
        />
      </section>

      <ComparisonGrid columns={output.answers.length >= 4 ? 2 : output.answers.length >= 3 ? 3 : 2}>
        {output.answers.map((a) => (
          <AnswerCard key={a.language} answer={a} />
        ))}
      </ComparisonGrid>

      <section>
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
                        <em>&ldquo;{e.quote}&rdquo;</em>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <p className="text-xs italic text-muted-foreground">{t("dirDisclaimer")}</p>
    </>
  );
}

function formatIso(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}
