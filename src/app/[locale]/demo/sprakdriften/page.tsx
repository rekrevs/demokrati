import { setRequestLocale } from "next-intl/server";
import { SprakdriftenLauncher } from "./launcher";
import { FEATURED_SCENARIOS } from "@/lib/demos/sprakdriften/scenarios";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SprakdriftenLauncher scenarios={FEATURED_SCENARIOS} />;
}
