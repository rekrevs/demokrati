import { setRequestLocale } from "next-intl/server";
import { PersuasionmaskinenLauncher } from "./launcher";
import { FEATURED_SCENARIOS } from "@/lib/demos/persuasionmaskinen/scenarios";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <PersuasionmaskinenLauncher scenarios={FEATURED_SCENARIOS} />;
}
