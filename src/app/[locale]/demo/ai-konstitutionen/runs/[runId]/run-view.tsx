"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowDown, ArrowUp, Minus } from "lucide-react";
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
import { MethodsDrawer } from "@/components/shared/methods-drawer";
import { SharePanel } from "@/components/shared/share-panel";
import type { AiKonstitutionenOutput } from "@/lib/demos/ai-konstitutionen/schemas";

type RunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "UNKNOWN";

interface ProgressInfo {
  phase: string;
  message: string;
  data?: Record<string, unknown>;
  updatedAt?: string;
}

interface State {
  status: RunStatus;
  output: AiKonstitutionenOutput | null;
  error: string | null;
  startedAt: string | null;
  progress: ProgressInfo | null;
}

const INITIAL: State = {
  status: "UNKNOWN",
  output: null,
  error: null,
  startedAt: null,
  progress: null,
};

const PHASE_ORDER = ["baseline", "governed", "comparing"] as const;

export function RunView({ runId }: { runId: string }) {
  const t = useTranslations("aikonstitutionen");
  const [state, setState] = React.useState<State>(INITIAL);

  React.useEffect(() => {
    let cancelled = false;
    const start = Date.now();
    async function tick() {
      try {
        const res = await fetch(`/api/runs/${runId}`);
        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled)
              setState({ ...INITIAL, status: "FAILED", error: "Run not found" });
            return;
          }
          throw new Error(`HTTP ${res.status}`);
        }
        const data = (await res.json()) as {
          status: RunStatus;
          startedAt: string | null;
          output: AiKonstitutionenOutput | null;
          error: { message?: string } | null;
          progress: ProgressInfo | null;
        };
        if (cancelled) return;
        setState({
          status: data.status,
          output: data.output,
          error: data.error?.message ?? null,
          startedAt: data.startedAt,
          progress: data.progress ?? null,
        });
        if (data.status === "COMPLETED" || data.status === "FAILED") return;
        if (Date.now() - start > 240_000) {
          setState((s) => ({ ...s, status: "FAILED", error: "timeout" }));
          return;
        }
      } catch {
        /* transient */
      }
      if (!cancelled) window.setTimeout(tick, 1500);
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
          <Link href="/demo/ai-konstitutionen">
            <ArrowLeft className="h-4 w-4" />
            {t("backToDemo")}
          </Link>
        </Button>
        <SharePanel
          url={typeof window === "undefined" ? "" : window.location.href}
        />
      </nav>

      <header className="space-y-1">
        <Badge variant="secondary">{t("title")}</Badge>
        {state.output ? (
          <>
            <h1 className="text-3xl font-semibold tracking-tight">
              {state.output.question}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("rulesApplied", { n: state.output.appliedRules.length })}
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
            <CardTitle>{t("failed")}</CardTitle>
            <CardDescription className="whitespace-pre-wrap break-words">
              {state.error ?? "okänt fel"}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {state.status !== "COMPLETED" && state.status !== "FAILED" ? (
        <ProgressPanel state={state} />
      ) : null}

      {state.output ? <ResultBody output={state.output} runId={runId} /> : null}
    </main>
  );
}

function ProgressPanel({ state }: { state: State }) {
  const t = useTranslations("aikonstitutionen");
  const startedAtMs = state.startedAt
    ? new Date(state.startedAt).getTime()
    : null;
  const [elapsed, setElapsed] = React.useState<number>(0);
  React.useEffect(() => {
    if (!startedAtMs) return;
    const id = window.setInterval(() => {
      setElapsed(Math.max(0, Math.round((Date.now() - startedAtMs) / 1000)));
    }, 1000);
    return () => window.clearInterval(id);
  }, [startedAtMs]);

  const phase = state.progress?.phase ?? "";
  const phaseIdx = PHASE_ORDER.indexOf(phase as (typeof PHASE_ORDER)[number]);
  const phaseLabel = state.progress
    ? t(`progressPhases.${phase}`)
    : t("waitingForResult");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{phaseLabel}</CardTitle>
        <CardDescription>
          {state.progress?.message ?? t("waitingForResult")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <ol className="space-y-1 text-sm">
          {PHASE_ORDER.map((p, i) => {
            const done = phaseIdx >= 0 && i < phaseIdx;
            const active = phaseIdx === i;
            return (
              <li
                key={p}
                className={
                  done
                    ? "text-muted-foreground line-through"
                    : active
                      ? "font-medium"
                      : "text-muted-foreground"
                }
              >
                {active ? "› " : done ? "✓ " : "· "}
                {t(`progressPhases.${p}`)}
              </li>
            );
          })}
        </ol>
        <div className="text-xs text-muted-foreground">
          {state.status === "UNKNOWN" ? "…" : state.status}
          {startedAtMs ? ` · ${elapsed}s` : ""}
        </div>
      </CardContent>
    </Card>
  );
}

function ResultBody({
  output,
  runId,
}: {
  output: AiKonstitutionenOutput;
  runId: string;
}) {
  const t = useTranslations("aikonstitutionen");
  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">{t("comparisonTitle")}</h2>
        <MethodsDrawer
          title={t("methodsTitle")}
          triggerLabel={t("methodsTitle")}
          entries={[
            { label: t("method_question"), value: output.question },
            {
              label: t("method_rules"),
              value: output.appliedRules.map((r) => r.label).join(", ") || "—",
            },
            {
              label: t("method_systemPrompt"),
              value: output.compiledSystemPrompt,
            },
            { label: t("method_runId"), value: runId },
          ]}
        />
      </section>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("baselineTitle")}</CardTitle>
            <CardDescription>{t("baselineBlurb")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {output.baselineAnswer}
            </p>
          </CardContent>
        </Card>
        <Card className="border-brand-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("governedTitle")}</CardTitle>
            <CardDescription>{t("governedBlurb")}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {output.governedAnswer}
            </p>
            <div className="mt-4 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t("appliedRulesHeader")}
              </p>
              <ul className="flex flex-wrap gap-1.5">
                {output.appliedRules.map((r) => (
                  <li key={r.id}>
                    <Badge variant="secondary">{r.label}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      <section>
        <h3 className="mb-3 text-base font-medium">
          {t("observedChangesTitle")}
        </h3>
        <Card>
          <CardContent className="space-y-2 pt-6 text-sm">
            {output.observedChanges.length === 0 ? (
              <p className="italic text-muted-foreground">{t("noChanges")}</p>
            ) : (
              <ul className="ml-5 list-disc space-y-1.5">
                {output.observedChanges.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h3 className="mb-3 text-base font-medium">{t("tradeoffsTitle")}</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {output.tradeoffs.map((to, i) => (
            <Card key={i}>
              <CardContent className="flex items-start gap-3 pt-5">
                <DirectionIcon direction={to.direction} />
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span>{to.axis}</span>
                    <Badge
                      variant={
                        to.direction === "increased"
                          ? "default"
                          : to.direction === "decreased"
                            ? "destructive"
                            : "secondary"
                      }
                    >
                      {t(`directionLabels.${to.direction}`)}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {to.explanation}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <p className="text-xs italic text-muted-foreground">
        {t("dirDisclaimer")}
      </p>
    </>
  );
}

function DirectionIcon({
  direction,
}: {
  direction: "increased" | "decreased" | "unchanged";
}) {
  if (direction === "increased")
    return <ArrowUp className="mt-1 h-4 w-4 text-emerald-600" />;
  if (direction === "decreased")
    return <ArrowDown className="mt-1 h-4 w-4 text-red-600" />;
  return <Minus className="mt-1 h-4 w-4 text-muted-foreground" />;
}
