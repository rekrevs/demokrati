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
  RIKSDAGSRADARN_REGIMES,
  type RiksdagsradarnOutput,
} from "@/lib/demos/riksdagsradarn/schemas";
import { PartyPositionCard } from "./party-position";
import { SourceCard } from "./source-card";

type RunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "UNKNOWN";

interface State {
  status: RunStatus;
  output: RiksdagsradarnOutput | null;
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
  const t = useTranslations("riksdagsradarn");
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
          output: RiksdagsradarnOutput | null;
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
          <Link href="/demo/riksdagsradarn">
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
              {t("dateRange", {
                from: state.output.dateFrom,
                to: state.output.dateTo,
              })}
              {" · "}
              {t("totalAnforanden", { n: state.output.totalAnforanden })}
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
              {t("statusLabel")}:{" "}
              {state.status === "UNKNOWN" ? "…" : state.status}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {state.output && state.output.emptyResult ? (
        <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/40">
          <CardHeader>
            <CardTitle className="text-base">{t("emptyResultTitle")}</CardTitle>
            <CardDescription>{t("emptyResultBody")}</CardDescription>
          </CardHeader>
        </Card>
      ) : state.output ? (
        <ResultBody output={state.output} runId={runId} />
      ) : null}
    </main>
  );
}

function ResultBody({
  output,
  runId,
}: {
  output: RiksdagsradarnOutput;
  runId: string;
}) {
  const t = useTranslations("riksdagsradarn");

  const chunkIndex = React.useMemo(() => {
    const m = new Map<string, number>();
    output.sourceCards.forEach((c, i) => m.set(c.chunkId, i));
    return m;
  }, [output.sourceCards]);

  const methodEntries = [
    { label: t("method_topic"), value: output.topic },
    {
      label: t("method_dateRange"),
      value: `${output.dateFrom} – ${output.dateTo}`,
    },
    {
      label: t("method_anforanden"),
      value: String(output.totalAnforanden),
    },
    {
      label: t("method_chunks"),
      value: String(output.sourceCards.length),
    },
    { label: t("method_runId"), value: runId },
    {
      label: t("method_claimTypeExplainer"),
      value: t("method_claimTypeExplainerBody"),
    },
    {
      label: t("method_confidenceExplainer"),
      value: t("method_confidenceExplainerBody"),
    },
  ];

  return (
    <>
      <section className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-medium">{t("summariesTitle")}</h2>
        <MethodsDrawer
          title={t("methodsTitle")}
          triggerLabel={t("methodsTitle")}
          entries={methodEntries}
        />
      </section>

      <Tabs defaultValue="neutral" className="space-y-3">
        <TabsList>
          {RIKSDAGSRADARN_REGIMES.map((r) => (
            <TabsTrigger key={r} value={r}>
              {t(`regimeLabels.${r}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        {RIKSDAGSRADARN_REGIMES.map((r) => (
          <TabsContent key={r} value={r}>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{t(`regimeBlurbs.${r}`)}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {output.summaries[r]}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {output.conflictLines.length > 0 ? (
        <section>
          <h2 className="mb-3 text-lg font-medium">{t("conflictLinesTitle")}</h2>
          <Card>
            <CardContent className="space-y-2 pt-6 text-sm">
              <ul className="ml-5 list-disc space-y-2">
                {output.conflictLines.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 text-lg font-medium">{t("partyPositionsTitle")}</h2>
        <div className="space-y-4">
          {output.partyPositions.map((p) => (
            <PartyPositionCard
              key={p.parti}
              position={p}
              chunkIndex={chunkIndex}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium">
          {t("sourceCardsTitle", { n: output.sourceCards.length })}
        </h2>
        <div className="space-y-3">
          {output.sourceCards.map((card, i) => (
            <SourceCard key={card.chunkId} card={card} index={i} />
          ))}
        </div>
      </section>

      <p className="text-xs italic text-muted-foreground">
        {t("dirDisclaimer")}
      </p>
    </>
  );
}
