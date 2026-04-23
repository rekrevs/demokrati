"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const LABELS: Record<Locale, string> = {
  sv: "Svenska",
  en: "English",
  ar: "العربية",
};

export function LanguageSwitcher() {
  const currentLocale = useLocale() as Locale;
  const pathname = usePathname();

  return (
    <nav
      aria-label="Language"
      className="flex items-center gap-2 text-sm"
      data-testid="language-switcher"
    >
      {routing.locales.map((locale) => (
        <Link
          key={locale}
          href={pathname}
          locale={locale}
          className={cn(
            "rounded-md px-2 py-1 transition-colors",
            currentLocale === locale
              ? "bg-muted font-semibold text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {LABELS[locale]}
        </Link>
      ))}
    </nav>
  );
}
