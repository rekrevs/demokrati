import { setRequestLocale, getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

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

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-2xl border border-border bg-muted/40 p-6">
          <h2 className="text-lg font-medium">{t("acts.lens.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("acts.lens.description")}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-muted/40 p-6">
          <h2 className="text-lg font-medium">{t("acts.influence.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("acts.influence.description")}
          </p>
        </article>
        <article className="rounded-2xl border border-border bg-muted/40 p-6 sm:col-span-2">
          <h2 className="text-lg font-medium">{t("acts.governance.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("acts.governance.description")}
          </p>
        </article>
      </section>

      <footer className="mt-16 border-t border-border pt-6 text-sm text-muted-foreground">
        <p>{t("disclaimer")}</p>
      </footer>
    </main>
  );
}
