import { setRequestLocale } from "next-intl/server";
import { OenighetskartanLauncher } from "./launcher";
import { FEATURED_SCENARIOS } from "@/lib/demos/oenighetskartan/scenarios";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <OenighetskartanLauncher scenarios={FEATURED_SCENARIOS} />;
}
