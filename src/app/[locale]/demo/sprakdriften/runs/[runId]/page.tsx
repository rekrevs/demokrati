import { setRequestLocale } from "next-intl/server";
import { RunView } from "./run-view";

export default async function RunPage({
  params,
}: {
  params: Promise<{ locale: string; runId: string }>;
}) {
  const { locale, runId } = await params;
  setRequestLocale(locale);

  return <RunView runId={runId} />;
}
