import { defineRouting } from "next-intl/routing";

// Every page lives under /ar/... or /en/...; visiting "/" redirects to the default.
export const routing = defineRouting({
  locales: ["ar", "en"],
  defaultLocale: "ar",
});

export type AppLocale = (typeof routing.locales)[number];
