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
import {
  CHANNEL_LABELS,
  type PersuasionmaskinenOutput,
  type TailoredMessage,
} from "@/lib/demos/persuasionmaskinen/schemas";

type RunStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "UNKNOWN";

interface ProgressInfo {
  phase: string;
  message: string;
}

interface State {
  status: RunStatus;
  output: PersuasionmaskinenOutput | null;
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
  const t = useTranslations("persuasionmaskinen");
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
          output: PersuasionmaskinenOutput | null;
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
          <Link href="/demo/persuasionmaskinen">
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
              {state.output.policyCaseTitle}
            </h1>
            <p className="text-sm text-muted-foreground">
              {t("channelLabel")}: {CHANNEL_LABELS[state.output.channel]}
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
  output: PersuasionmaskinenOutput;
  runId: string;
}) {
  const t = useTranslations("persuasionmaskinen");
  return (
    <>
      <section className="flex items-center justify-between">
        <h2 className="text-lg font-medium">{t("messagesTitle")}</h2>
        <MethodsDrawer
          title={t("methodsTitle")}
          triggerLabel={t("methodsTitle")}
          entries={[
            { label: t("method_case"), value: output.policyCaseTitle },
            {
              label: t("method_channel"),
              value: CHANNEL_LABELS[output.channel],
            },
            {
              label: t("method_profiles"),
              value: output.tailoredMessages.map((m) => m.profileId).join(", "),
            },
            { label: t("method_runId"), value: runId },
          ]}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("genericTitle")}</CardTitle>
          <CardDescription>{t("genericBlurb")}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {output.genericMessage}
          </p>
        </CardContent>
      </Card>

      <section>
        <h3 className="mb-3 text-base font-medium">{t("tailoredTitle")}</h3>
        <ComparisonGrid columns={2}>
          {output.tailoredMessages.map((m) => (
            <TailoredCard key={m.profileId} message={m} />
          ))}
        </ComparisonGrid>
      </section>

      <Card className="border-amber-300 bg-amber-50 dark:bg-amber-950/30">
        <CardHeader>
          <CardTitle className="text-base">
            {output.warningCard.title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{output.warningCard.body}</p>
        </CardContent>
      </Card>

      <p className="text-xs italic text-muted-foreground">
        {t("dirDisclaimer")}
      </p>
    </>
  );
}

function TailoredCard({ message }: { message: TailoredMessage }) {
  const t = useTranslations("persuasionmaskinen");
  return (
    <Card className="flex flex-col" data-testid="tailored-card">
      <CardHeader>
        <CardTitle className="text-base">{message.profileId}</CardTitle>
        <CardDescription>{message.profileSummary}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-3 text-sm">
        <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 leading-relaxed">
          {message.text}
        </p>
        <div className="space-y-1 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">{t("frameLabel")}:</span>{" "}
            {message.rhetoricalFrame}
          </div>
          <div>
            <span className="font-medium">{t("emotionalLabel")}:</span>{" "}
            {message.emotionalCore}
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="font-medium">{t("leversLabel")}:</span>
            {message.changedLevers.map((l, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">
                {l}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
