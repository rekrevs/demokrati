import { setRequestLocale } from "next-intl/server";
import { OppenhetsparadoxenLauncher } from "./launcher";
import { FEATURED_SCENARIOS } from "@/lib/demos/oppenhetsparadoxen/scenarios";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <OppenhetsparadoxenLauncher scenarios={FEATURED_SCENARIOS} />;
}
