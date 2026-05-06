import { setRequestLocale } from "next-intl/server";
import { AiKonstitutionenLauncher } from "./launcher";
import { FEATURED_SCENARIOS, RULES } from "@/lib/demos/ai-konstitutionen";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AiKonstitutionenLauncher
      scenarios={FEATURED_SCENARIOS}
      rules={RULES.map((r) => ({ id: r.id, label: r.label, hint: r.hint }))}
    />
  );
}
