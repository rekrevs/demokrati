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
import type { ProgramkompassenInput } from "@/lib/demos/programkompassen/schemas";
import type { Scenario } from "@/lib/demos/module";

interface Props {
  scenarios: Scenario<ProgramkompassenInput>[];
}

export function ProgramkompassenLauncher({ scenarios }: Props) {
  const t = useTranslations("programkompassen");
  const router = useRouter();
  const [pendingSlug, setPendingSlug] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const submit = React.useCallback(
    async (s: Scenario<ProgramkompassenInput>) => {
      setPendingSlug(s.slug);
      setError(null);
      try {
        const res = await fetch("/api/run/programkompassen", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ mode: "FEATURED", input: s.input }),
        });
        if (!res.ok) {
          const detail = await res.json().catch(() => ({}));
          throw new Error(detail.error ?? `HTTP ${res.status}`);
        }
        const payload = (await res.json()) as { runId: string };
        router.push(`/demo/programkompassen/runs/${payload.runId}`);
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
        <Badge variant="secondary">Akt II · påverkansmotor</Badge>
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
          {scenarios.map((s) => {
            const busy = pendingSlug === s.slug;
            return (
              <Card key={s.slug} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{s.title}</CardTitle>
                  <CardDescription>{s.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 text-xs text-muted-foreground">
                  {t("partyCount", { n: s.input.parties.length })}
                </CardContent>
                <div className="border-t border-border px-6 py-3">
                  <Button
                    onClick={() => submit(s)}
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
