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
import type { AiKonstitutionenInput } from "@/lib/demos/ai-konstitutionen/schemas";
import type { Scenario } from "@/lib/demos/module";

export interface RuleSummary {
  id: string;
  label: string;
  hint?: string;
}

interface Props {
  scenarios: Scenario<AiKonstitutionenInput>[];
  rules: RuleSummary[];
}

export function AiKonstitutionenLauncher({ scenarios, rules }: Props) {
  const t = useTranslations("aikonstitutionen");
  const router = useRouter();
  const [question, setQuestion] = React.useState<string>("");
  const [selectedRules, setSelectedRules] = React.useState<Set<string>>(
    () => new Set(scenarios[0]?.input.ruleIds ?? []),
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function pickScenario(s: Scenario<AiKonstitutionenInput>) {
    setQuestion(s.input.question);
    setSelectedRules(new Set(s.input.ruleIds));
  }

  function toggleRule(id: string) {
    setSelectedRules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const submit = React.useCallback(async () => {
    if (!question.trim() || question.trim().length < 8) {
      setError(t("questionTooShort"));
      return;
    }
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/run/ai-konstitutionen", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "FEATURED",
          input: { question, ruleIds: [...selectedRules] },
        }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.error ?? `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as { runId: string };
      router.push(`/demo/ai-konstitutionen/runs/${payload.runId}`);
    } catch (err) {
      setPending(false);
      setError((err as Error).message);
    }
  }, [question, selectedRules, router, t]);

  return (
    <main className="mx-auto max-w-6xl space-y-10 px-6 py-12">
      <header className="space-y-2">
        <Badge variant="secondary">Akt III · styrningsobjekt</Badge>
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

      <section className="space-y-4">
        <h2 className="text-lg font-medium">{t("startWithExample")}</h2>
        <ComparisonGrid columns={3}>
          {scenarios.map((s) => (
            <Card
              key={s.slug}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => pickScenario(s)}
            >
              <CardHeader>
                <CardTitle className="text-base">{s.title}</CardTitle>
                <CardDescription className="text-xs">
                  {s.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </ComparisonGrid>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">{t("yourQuestion")}</h2>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t("questionPlaceholder")}
          rows={3}
          maxLength={400}
          className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <div className="text-xs text-muted-foreground">
          {question.length}/400
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-medium">
          {t("constitutionTitle")} ({selectedRules.size}/{rules.length})
        </h2>
        <p className="text-sm text-muted-foreground">{t("constitutionBlurb")}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {rules.map((r) => {
            const on = selectedRules.has(r.id);
            return (
              <li key={r.id}>
                <label
                  className={`flex cursor-pointer gap-3 rounded-md border px-3 py-2 transition-colors ${
                    on
                      ? "border-brand-500 bg-brand-50 dark:bg-brand-950/30"
                      : "border-border hover:bg-muted/30"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() => toggleRule(r.id)}
                    className="mt-1 h-4 w-4 cursor-pointer accent-brand-500"
                  />
                  <span className="space-y-0.5">
                    <span className="block text-sm font-medium">
                      {r.label}
                    </span>
                    {r.hint ? (
                      <span className="block text-xs text-muted-foreground">
                        {r.hint}
                      </span>
                    ) : null}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="border-t border-border pt-6">
        <Button onClick={submit} disabled={pending}>
          {pending ? t("running") : t("run")}
        </Button>
      </div>
    </main>
  );
}
