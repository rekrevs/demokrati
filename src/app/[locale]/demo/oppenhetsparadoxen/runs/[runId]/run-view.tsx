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
import { MethodsDrawer } from "@/components/shared/methods-drawer";
import { SharePanel } from "@/components/shared/share-panel";
import {
  AUDIENCE_LABELS,
  DIFF_TYPE_LABELS,
  type AudienceVersion,
  type OppenhetsparadoxenOutput,
} from "@/lib/demos/oppenhetsparadoxen/schemas";

type RunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "UNKNOWN";

interface ProgressInfo {
  phase: string;
  message: string;
  data?: Record<string, unknown>;
}

interface State {
  status: RunStatus;
  output: OppenhetsparadoxenOutput | null;
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
  const t = useTranslations("oppenhetsparadoxen");
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
          output: OppenhetsparadoxenOutput | null;
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
          <Link href="/demo/oppenhetsparadoxen">
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
            {state.output.sourceTitle}
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
  output: OppenhetsparadoxenOutput;
  runId: string;
}) {
  const t = useTranslations("oppenhetsparadoxen");
  return (
    <>
      <section className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{t("resultsTitle")}</h2>
        <MethodsDrawer
          title={t("methodsTitle")}
          triggerLabel={t("methodsTitle")}
          entries={[
            { label: t("method_source"), value: output.sourceTitle },
            {
              label: t("method_audiences"),
              value: output.versions.map((v) => v.audience).join(", "),
            },
            { label: t("method_runId"), value: runId },
            {
              label: t("method_diffsExplainer"),
              value: t("method_diffsExplainerBody"),
            },
          ]}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("originalTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {output.originalText}
          </p>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {output.versions.map((v) => (
          <VersionCard key={v.audience} version={v} />
        ))}
      </div>

      <p className="text-xs italic text-muted-foreground">
        {t("dirDisclaimer")}
      </p>
    </>
  );
}

function VersionCard({ version }: { version: AudienceVersion }) {
  const t = useTranslations("oppenhetsparadoxen");
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {AUDIENCE_LABELS[version.audience]}
          </CardTitle>
          <Badge variant="secondary">
            {t("diffsCount", { n: version.diffs.length })}
          </Badge>
        </div>
        <CardDescription>{version.audienceNote}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("transformedTitle")}
          </h4>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {version.text}
          </p>
        </div>

        <div>
          <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t("shiftSummaryTitle")}
          </h4>
          <p className="text-sm">{version.shiftSummary}</p>
        </div>

        {version.diffs.length > 0 ? (
          <div className="space-y-2">
            <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("diffsTitle")}
            </h4>
            <ul className="space-y-2">
              {version.diffs.map((d, i) => (
                <li
                  key={i}
                  className={`rounded-md border p-3 text-xs ${
                    d.severity === "high"
                      ? "border-red-300 bg-red-50 dark:bg-red-950/30"
                      : d.severity === "medium"
                        ? "border-amber-300 bg-amber-50 dark:bg-amber-950/30"
                        : "border-border bg-muted/30"
                  }`}
                >
                  <div className="mb-1 flex items-center gap-2">
                    <Badge
                      variant={
                        d.severity === "high"
                          ? "destructive"
                          : d.severity === "medium"
                            ? "warning"
                            : "secondary"
                      }
                    >
                      {DIFF_TYPE_LABELS[d.type]}
                    </Badge>
                    <span className="text-muted-foreground">
                      {t(`severity.${d.severity}`)}
                    </span>
                  </div>
                  <p className="mb-2 text-sm">{d.message}</p>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("originalExcerptLabel")}
                      </span>
                      <p className="italic">&ldquo;{d.originalExcerpt}&rdquo;</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        {t("transformedExcerptLabel")}
                      </span>
                      <p className="italic">
                        &ldquo;{d.transformedExcerpt}&rdquo;
                      </p>
                    </div>
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
