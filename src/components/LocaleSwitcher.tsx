"use client";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Link, usePathname } from "@/i18n/navigation";

/** Same page, other language: /ar/cheques?tab=cleared <-> /en/cheques?tab=cleared */
export function LocaleSwitcher() {
  const t = useTranslations("App");
  const locale = useLocale();
  const pathname = usePathname(); // without the /ar or /en prefix
  const search = useSearchParams().toString();
  return (
    <Link
      href={search ? `${pathname}?${search}` : pathname}
      locale={locale === "ar" ? "en" : "ar"}
      className="rounded-md border border-slate-300 px-3 py-1 text-sm hover:bg-slate-100"
    >
      {t("switchLanguage")}
    </Link>
  );
}
