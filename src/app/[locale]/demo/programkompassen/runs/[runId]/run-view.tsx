"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink } from "lucide-react";
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
import {
  PARTY_LABELS,
  type PartyStance,
  type ProgramkompassenOutput,
} from "@/lib/demos/programkompassen/schemas";

type RunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "UNKNOWN";

interface ProgressInfo {
  phase: string;
  message: string;
}

interface State {
  status: RunStatus;
  output: ProgramkompassenOutput | null;
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

export function RunView({ runId }: { runId: string }) {
  const t = useTranslations("programkompassen");
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
          output: ProgramkompassenOutput | null;
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
          <Link href="/demo/programkompassen">
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
          <h1 className="text-3xl font-semibold tracking-tight">
            {state.output.questionText}
          </h1>
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
            <CardDescription className="whitespace-pre-wrap">
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
              {state.progress?.message ?? t("waitingForResult")}
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
  output: ProgramkompassenOutput;
  runId: string;
}) {
  const t = useTranslations("programkompassen");
  const covered = output.parties.filter((p) => !p.noCoverage).length;
  return (
    <>
      <section className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{t("partyMatrixTitle")}</h2>
        <MethodsDrawer
          title={t("methodsTitle")}
          triggerLabel={t("methodsTitle")}
          entries={[
            { label: t("method_question"), value: output.questionText },
            {
              label: t("method_coverage"),
              value: `${covered}/${output.parties.length}`,
            },
            {
              label: t("method_stanceExplainer"),
              value: t("method_stanceExplainerBody"),
            },
            { label: t("method_runId"), value: runId },
          ]}
        />
      </section>

      <Card>
        <CardContent className="pt-6">
          <p className="text-sm">
            <strong>{t("simplificationTitle")}:</strong>{" "}
            {output.simplificationNote}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {output.parties.map((p) => (
          <PartyRow key={p.party} party={p} />
        ))}
      </div>

      <p className="text-xs italic text-muted-foreground">
        {t("dirDisclaimer")}
      </p>
    </>
  );
}

function PartyRow({ party }: { party: PartyStance }) {
  const t = useTranslations("programkompassen");
  return (
    <Card className={party.noCoverage ? "opacity-60" : ""}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Badge variant="outline">{party.party}</Badge>
              <span>{PARTY_LABELS[party.party] ?? party.party}</span>
            </CardTitle>
          </div>
          <StanceMeter stance={party.stance} confidence={party.confidence} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed">{party.summary}</p>
        {party.evidence.length > 0 ? (
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {t("evidenceLabel")}
            </h4>
            <ul className="space-y-1.5 text-xs">
              {party.evidence.map((e, i) => (
                <li
                  key={i}
                  className="rounded-md border border-border bg-muted/30 p-2"
                >
                  <em>&ldquo;{e.quote}&rdquo;</em>
                  <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                    <span>{e.sourceTitle}</span>
                    {e.sourceUrl ? (
                      <a
                        href={e.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-0.5 text-brand-600 hover:underline"
                      >
                        källa
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function StanceMeter({
  stance,
  confidence,
}: {
  stance: 1 | 2 | 3 | 4 | 5;
  confidence: "low" | "medium" | "high";
}) {
  const t = useTranslations("programkompassen");
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span
            key={n}
            className={
              n === stance
                ? "h-3 w-3 rounded-full bg-brand-600"
                : "h-3 w-3 rounded-full bg-muted"
            }
          />
        ))}
      </div>
      <div className="text-xs text-muted-foreground">
        {t(`stanceLabels.${stance}`)} · {t(`confidenceLabels.${confidence}`)}
      </div>
    </div>
  );
}
