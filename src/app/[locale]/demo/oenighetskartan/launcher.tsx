"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
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
import type { OenighetskartanInput } from "@/lib/demos/oenighetskartan/schemas";
import type { Scenario } from "@/lib/demos/module";

interface Props {
  scenarios: Scenario<OenighetskartanInput>[];
}

export function OenighetskartanLauncher({ scenarios }: Props) {
  const t = useTranslations("oenighetskartan");
  const router = useRouter();
  const [pendingSlug, setPendingSlug] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const submit = React.useCallback(
    async (scenario: Scenario<OenighetskartanInput>) => {
      setPendingSlug(scenario.slug);
      setError(null);
      try {
        const res = await fetch("/api/run/oenighetskartan", {
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
        const payload = (await res.json()) as { runId: string };
        router.push(`/demo/oenighetskartan/runs/${payload.runId}`);
      } catch (err) {
        setPendingSlug(null);
        setError((err as Error).message);
      }
    },
    [router],
  );

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-12">
      <header className="space-y-2">
        <Badge variant="secondary">Akt I · demokratisk lins</Badge>
        <h1 className="text-4xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-lg text-muted-foreground">{t("tagline")}</p>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("intro")}</p>
      </header>

      {error ? (
        <Card className="border-red-300 bg-red-50 dark:bg-red-950/40">
          <CardHeader>
            <CardTitle className="text-base">{t("failed")}</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <section>
        <h2 className="mb-4 text-lg font-medium">{t("chooseFeatured")}</h2>
        <ComparisonGrid columns={2}>
          {scenarios.map((sc) => {
            const busy = pendingSlug === sc.slug;
            return (
              <Card key={sc.slug} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{sc.title}</CardTitle>
                  <CardDescription>{sc.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 text-xs text-muted-foreground">
                  {t("statementCount", { n: sc.input.statements.length })}
                </CardContent>
                <div className="border-t border-border px-6 py-3">
                  <Button
                    onClick={() => submit(sc)}
                    disabled={pendingSlug !== null}
                    size="sm"
                  >
                    {busy ? t("running") : t("run")}
                  </Button>
                </div>
              </Card>
            );
          })}
        </ComparisonGrid>
      </section>
    </main>
  );
}
