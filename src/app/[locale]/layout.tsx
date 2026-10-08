import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { signOutAction } from "@/actions/auth";
import { LocaleSwitcher } from "@/components/LocaleSwitcher";
import { getCurrentUser, hasRole } from "@/server/auth/session";
import "../globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("App");
  return { title: t("title") };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("App");
  const tNav = await getTranslations("Nav");
  const user = await getCurrentUser().catch(() => null);

  const navLink = "rounded-md px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100";

  // dir="rtl" flips the whole page for Arabic. Classes use start/end (ms-, pe-, text-start)
  // instead of left/right so they flip with it.
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <NextIntlClientProvider>
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-2 px-4 py-3">
              <Link href="/" className="me-4 font-semibold">
                {t("title")}
              </Link>
              {user && (
                <nav className="flex flex-wrap items-center gap-1">
                  <Link href="/" className={navLink}>{tNav("dashboard")}</Link>
                  {hasRole(user, "accountant") && (
                    <Link href="/transactions/new" className={navLink}>{tNav("newEntry")}</Link>
                  )}
                  <Link href="/cheques" className={navLink}>{tNav("cheques")}</Link>
                  {hasRole(user, "admin") && (
                    <>
                      <Link href="/audit" className={navLink}>{tNav("audit")}</Link>
                      <Link href="/settings" className={navLink}>{tNav("settings")}</Link>
                    </>
                  )}
                </nav>
              )}
              <div className="ms-auto flex items-center gap-2">
                {user && (
                  <>
                    <span className="text-sm text-slate-600">
                      {user.name} · {tNav(`roles.${user.role}`)}
                    </span>
                    <form action={signOutAction}>
                      <button type="submit" className="rounded-md px-3 py-1 text-sm text-slate-700 hover:bg-slate-100">
                        {tNav("signOut")}
                      </button>
                    </form>
                  </>
                )}
                <Suspense>
                  <LocaleSwitcher />
                </Suspense>
              </div>
            </div>
          </header>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
