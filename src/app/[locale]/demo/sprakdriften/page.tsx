import { setRequestLocale } from "next-intl/server";
import { SprakdriftenClient } from "./client";
import { FEATURED_SCENARIOS } from "@/lib/demos/sprakdriften/scenarios";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SprakdriftenClient scenarios={FEATURED_SCENARIOS} />;
}
