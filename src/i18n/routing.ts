import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["sv", "en", "ar"] as const,
  defaultLocale: "sv",
  localePrefix: "always",
});

export type Locale = (typeof routing.locales)[number];

export const RTL_LOCALES: ReadonlySet<Locale> = new Set(["ar"]);

export function getDirection(locale: Locale): "ltr" | "rtl" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}
