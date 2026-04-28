import { setRequestLocale, getTranslations } from "next-intl/server";
import { ArrowRight } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";
import { DEMO_NAV, demosByAct, type DemoAct } from "@/lib/demos/nav";

const ACT_KEYS: Record<DemoAct, "lens" | "influence" | "governance"> = {
  1: "lens",
  2: "influence",
  3: "governance",
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");
  const demoT = await getTranslations("demoCatalog");

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <header className="mb-12 flex items-start justify-between gap-8">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight">
            {t("title")}
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">{t("tagline")}</p>
        </div>
        <LanguageSwitcher />
      </header>

      <p className="mb-10 max-w-3xl text-sm text-muted-foreground">
        {t("intro")}
      </p>

      <div className="space-y-12">
        {([1, 2, 3] as const).map((act) => {
          const actKey = ACT_KEYS[act];
          const demos = demosByAct(act);
          return (
            <section key={act}>
              <header className="mb-4 space-y-1">
                <Badge variant="secondary">{t(`acts.${actKey}.title`)}</Badge>
                <p className="text-sm text-muted-foreground">
                  {t(`acts.${actKey}.description`)}
                </p>
              </header>
              <div className="grid gap-4 sm:grid-cols-2">
                {demos.map((d) => (
                  <DemoCard
                    key={d.slug}
                    slug={d.slug}
                    title={demoT(`${d.slug}.title`)}
                    tagline={demoT(`${d.slug}.tagline`)}
                    status={d.status}
                    statusBuiltLabel={t("status.built")}
                    statusComingLabel={t("status.coming")}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="mt-16 border-t border-border pt-6 text-xs text-muted-foreground">
        <p>{t("disclaimer")}</p>
        <p className="mt-2">
          {t("status.builtCount", {
            built: DEMO_NAV.filter((d) => d.status === "built").length,
            total: DEMO_NAV.length,
          })}
        </p>
      </footer>
    </main>
  );
}

function DemoCard({
  slug,
  title,
  tagline,
  status,
  statusBuiltLabel,
  statusComingLabel,
}: {
  slug: string;
  title: string;
  tagline: string;
  status: "built" | "coming";
  statusBuiltLabel: string;
  statusComingLabel: string;
}) {
  const built = status === "built";
  const card = (
    <Card
      className={
        built
          ? "h-full transition-shadow hover:shadow-md"
          : "h-full bg-muted/40 opacity-70"
      }
    >
      <CardHeader className="flex-row items-start justify-between gap-3 pb-2">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        <Badge variant={built ? "default" : "outline"} className="shrink-0">
          {built ? statusBuiltLabel : statusComingLabel}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <p>{tagline}</p>
        {built ? (
          <p className="inline-flex items-center gap-1 text-sm font-medium text-brand-600">
            <ArrowRight className="h-4 w-4" />
          </p>
        ) : null}
      </CardContent>
    </Card>
  );

  if (!built) return card;
  // typedRoutes generates a Route type from /demo/[slug]/page.tsx, but
  // <Link> at runtime requires an already-expanded path. Pass the
  // concrete path string (next-intl prepends the locale).
  return (
    <Link
      href={`/demo/${slug}` as never}
      className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-2xl"
    >
      {card}
    </Link>
  );
}
