import { setRequestLocale } from "next-intl/server";
import { ProgramkompassenLauncher } from "./launcher";
import { FEATURED_SCENARIOS } from "@/lib/demos/programkompassen/scenarios";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <ProgramkompassenLauncher scenarios={FEATURED_SCENARIOS} />;
}
