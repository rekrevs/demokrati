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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { MethodsDrawer } from "@/components/shared/methods-drawer";
import { SharePanel } from "@/components/shared/share-panel";
import {
  OENIGHETSKARTAN_TABS,
  type OenighetskartanOutput,
} from "@/lib/demos/oenighetskartan/schemas";
import { ScatterPlot } from "./scatter-plot";

type RunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "UNKNOWN";

interface ProgressInfo {
  phase: string;
  message: string;
  data?: Record<string, unknown>;
  updatedAt?: string;
}

interface State {
  status: RunStatus;
  output: OenighetskartanOutput | null;
  error: string | null;
  startedAt: string | null;
  completedAt: string | null;
  progress: ProgressInfo | null;
}

const INITIAL: State = {
  status: "UNKNOWN",
  output: null,
  error: null,
  startedAt: null,
  completedAt: null,
  progress: null,
};

const PHASE_ORDER: readonly string[] = ["analysing", "validating"];

export function RunView({ runId }: { runId: string }) {
  const t = useTranslations("oenighetskartan");
  const [state, setState] = React.useState<State>(INITIAL);

  React.useEffect(() => {
    let cancelled = false;
    const start = Date.now();
    async function tick(): Promise<void> {
      try {
        const res = await fetch(`/api/runs/${runId}`);
        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) {
              setState({
                ...INITIAL,
                status: "FAILED",
                error: "Run not found",
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
          output: OenighetskartanOutput | null;
          error: { message?: string } | null;
          progress: ProgressInfo | null;
        };
        if (cancelled) return;
        setState({
          status: data.status,
          output: data.output,
          error: data.error?.message ?? null,
          startedAt: data.startedAt,
          completedAt: data.completedAt,
          progress: data.progress ?? null,
        });
        if (data.status === "COMPLETED" || data.status === "FAILED") return;
        if (Date.now() - start > 240_000) {
          setState((s) => ({
            ...s,
            status: "FAILED",
            error: "timeout waiting for result",
          }));
          return;
        }
      } catch {
        /* transient */
      }
      if (!cancelled) window.setTimeout(tick, 1_500);
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
          <Link href="/demo/oenighetskartan">
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
              {state.output.topic}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("totalStatements", { n: state.output.totalStatements })}
              {" · "}
              {t("dimensionCount", { n: state.output.dimensions.length })}
              {" · "}
              {t("clusterCount", { n: state.output.clusters.length })}
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
        <ProgressPanel state={state} />
      ) : null}

      {state.output ? <ResultBody output={state.output} runId={runId} /> : null}
    </main>
  );
}

function ProgressPanel({ state }: { state: State }) {
  const t = useTranslations("oenighetskartan");
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

  const progress = state.progress;
  const phaseIdx = progress ? PHASE_ORDER.indexOf(progress.phase) : -1;
  const phaseLabel = progress
    ? t(`progressPhases.${progress.phase}`)
    : t("waitingForResult");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{phaseLabel}</CardTitle>
        <CardDescription>
          {progress?.message ?? t("waitingForResult")}
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
                      ? "font-medium text-foreground"
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
          {t("statusLabel")}:{" "}
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
  output: OenighetskartanOutput;
  runId: string;
}) {
  const t = useTranslations("oenighetskartan");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const selected = output.points.find((p) => p.statementId === selectedId);
  const selectedCluster = selected
    ? output.clusters.find((c) => c.id === selected.clusterId)
    : null;

  const methodEntries = [
    { label: t("method_topic"), value: output.topic },
    { label: t("method_statements"), value: String(output.totalStatements) },
    { label: t("method_runId"), value: runId },
    {
      label: t("method_dimensionsExplainer"),
      value: t("method_dimensionsExplainerBody"),
    },
    {
      label: t("method_clustersExplainer"),
      value: t("method_clustersExplainerBody"),
    },
  ];

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">{t("resultsTitle")}</h2>
        <MethodsDrawer
          title={t("methodsTitle")}
          triggerLabel={t("methodsTitle")}
          entries={methodEntries}
        />
      </section>

      <Tabs defaultValue="map" className="space-y-4">
        <TabsList>
          {OENIGHETSKARTAN_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab}>
              {t(`tabs.${tab}`)}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="map" className="space-y-6">
          <ScatterPlot
            dimensions={output.dimensions}
            clusters={output.clusters}
            points={output.points}
            selectedStatementId={selectedId}
            onSelect={setSelectedId}
          />

          {selected ? (
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
                <div>
                  <CardTitle className="text-base">
                    {selected.statementId}
                  </CardTitle>
                  <CardDescription>
                    {t("clusterLabel")}:{" "}
                    {selectedCluster?.label ?? selected.clusterId}
                  </CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedId(null)}
                >
                  ×
                </Button>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>{selected.text}</p>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {output.dimensions.map((d) => {
                    const score = selected.scores[d.id] ?? 0;
                    return (
                      <span
                        key={d.id}
                        className="rounded-md border border-border bg-muted/30 px-2 py-0.5"
                      >
                        {d.leftLabel} ↔ {d.rightLabel}:{" "}
                        <strong>{formatScore(score)}</strong>
                      </span>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-xs italic text-muted-foreground">
              {t("clickAPoint")}
            </p>
          )}

          <DimensionsList dimensions={output.dimensions} points={output.points} />
        </TabsContent>

        <TabsContent value="deliberation" className="space-y-4">
          <DeliberationView output={output} />
        </TabsContent>
      </Tabs>

      <p className="text-xs italic text-muted-foreground">
        {t("dirDisclaimer")}
      </p>
    </>
  );
}

function formatScore(score: number): string {
  if (score === 0) return "0";
  return score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2);
}

function DimensionsList({
  dimensions,
  points,
}: {
  dimensions: OenighetskartanOutput["dimensions"];
  points: OenighetskartanOutput["points"];
}) {
  const t = useTranslations("oenighetskartan");
  const evidenceTextById = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of points) m.set(p.statementId, p.text);
    return m;
  }, [points]);
  return (
    <section className="space-y-3">
      <h3 className="text-base font-medium">{t("dimensionsTitle")}</h3>
      <div className="space-y-3">
        {dimensions.map((d) => (
          <Card key={d.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                <span className="text-muted-foreground">{d.leftLabel}</span>
                <span className="mx-2">↔</span>
                <span>{d.rightLabel}</span>
              </CardTitle>
              <CardDescription>{d.description}</CardDescription>
            </CardHeader>
            {d.evidenceStatementIds.length > 0 ? (
              <CardContent>
                <ul className="space-y-1 text-xs">
                  {d.evidenceStatementIds.slice(0, 4).map((id) => (
                    <li key={id}>
                      <Badge variant="outline" className="mr-2 font-mono">
                        {id}
                      </Badge>
                      <em>{(evidenceTextById.get(id) ?? "").slice(0, 220)}</em>
                    </li>
                  ))}
                </ul>
              </CardContent>
            ) : null}
          </Card>
        ))}
      </div>
    </section>
  );
}

function DeliberationView({ output }: { output: OenighetskartanOutput }) {
  const t = useTranslations("oenighetskartan");
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <BulletCard
        title={t("delib_sharedPremises")}
        description={t("delib_sharedPremisesBlurb")}
        items={output.sharedPremises}
      />
      <BulletCard
        title={t("delib_empiricalDisagreements")}
        description={t("delib_empiricalDisagreementsBlurb")}
        items={output.empiricalDisagreements}
      />
      <BulletCard
        title={t("delib_valueConflicts")}
        description={t("delib_valueConflictsBlurb")}
        items={output.valueConflicts}
      />
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {t("delib_contestedTerms")}
          </CardTitle>
          <CardDescription>{t("delib_contestedTermsBlurb")}</CardDescription>
        </CardHeader>
        <CardContent>
          {output.contestedTerms.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              {t("delib_empty")}
            </p>
          ) : (
            <dl className="space-y-3 text-sm">
              {output.contestedTerms.map((c, i) => (
                <div key={i}>
                  <dt className="font-medium">{c.term}</dt>
                  <dd>
                    <ul className="ml-4 list-disc text-xs text-muted-foreground">
                      {c.meanings.map((m, j) => (
                        <li key={j}>{m}</li>
                      ))}
                    </ul>
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card className="md:col-span-2 border-brand-300 bg-brand-50 dark:bg-brand-950/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {t("delib_nextBetterQuestion")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-base font-medium">{output.nextBetterQuestion}</p>
        </CardContent>
      </Card>
    </div>
  );
}

function BulletCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: string[];
}) {
  const t = useTranslations("oenighetskartan");
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-xs italic text-muted-foreground">
            {t("delib_empty")}
          </p>
        ) : (
          <ul className="ml-4 list-disc space-y-1 text-sm">
            {items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
