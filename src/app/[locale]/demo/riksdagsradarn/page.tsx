import { setRequestLocale } from "next-intl/server";
import { RiksdagsradarnLauncher } from "./launcher";
import { FEATURED_SCENARIOS } from "@/lib/demos/riksdagsradarn/scenarios";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <RiksdagsradarnLauncher scenarios={FEATURED_SCENARIOS} />;
}
