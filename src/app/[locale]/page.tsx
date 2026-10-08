import { getTranslations, setRequestLocale } from "next-intl/server";
import { formatEGP, type Locale } from "@/lib/money";
import { DatabaseNotConfiguredError } from "@/server/db/client";
import { getAccountBalances, type AccountBalance } from "@/server/ledger/balances";

// Balances change whenever someone saves a transaction, so never cache this page.
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Dashboard");
  const lang = locale as Locale;

  // A Server Component can load data directly: this runs on the server, queries
  // Postgres, and only the finished HTML reaches the browser.
  let accounts: AccountBalance[];
  try {
    accounts = await getAccountBalances();
  } catch (err) {
    const message = err instanceof DatabaseNotConfiguredError ? t("dbNotConfigured") : t("dbError");
    if (!(err instanceof DatabaseNotConfiguredError)) console.error("Dashboard query failed", err);
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-900">
          {message}
        </p>
      </main>
    );
  }

  const total = accounts.reduce(
    (sum, a) => ({
      book: sum.book + a.bookBalanceMinor,
      bank: sum.bank + a.bankBalanceMinor,
      outstanding: sum.outstanding + a.outstandingMinor,
    }),
    { book: 0, bank: 0, outstanding: 0 },
  );

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>

      {accounts.length === 0 ? (
        <p className="mt-6 text-slate-600">{t("noAccounts")}</p>
      ) : (
        <>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {accounts.map((a) => (
              <section key={a.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <h2 className="font-semibold">{a.name}</h2>
                <p className="text-sm text-slate-500">
                  {a.bankName} · {a.issuesCheques ? t("issuesCheques") : t("transfersOnly")}
                </p>
                <dl className="mt-4 space-y-3">
                  <Figure label={t("bookBalance")} hint={t("bookBalanceHint")} strong>
                    {formatEGP(a.bookBalanceMinor, lang)}
                  </Figure>
                  <Figure label={t("bankBalance")} hint={t("bankBalanceHint")}>
                    {formatEGP(a.bankBalanceMinor, lang)}
                  </Figure>
                  {a.issuesCheques && (
                    <Figure label={t("outstanding")}>{formatEGP(a.outstandingMinor, lang)}</Figure>
                  )}
                </dl>
              </section>
            ))}
          </div>

          <section className="mt-6 rounded-lg border border-slate-300 bg-slate-100 p-4">
            <h2 className="font-semibold">{t("total")}</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-3">
              <Figure label={t("bookBalance")} strong>{formatEGP(total.book, lang)}</Figure>
              <Figure label={t("bankBalance")}>{formatEGP(total.bank, lang)}</Figure>
              <Figure label={t("outstanding")}>{formatEGP(total.outstanding, lang)}</Figure>
            </dl>
          </section>
        </>
      )}
    </main>
  );
}

function Figure({
  label,
  hint,
  strong,
  children,
}: {
  label: string;
  hint?: string;
  strong?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      {/* tabular-nums keeps digits the same width so amounts line up */}
      <dd className={`tabular-nums ${strong ? "text-lg font-semibold" : ""}`}>{children}</dd>
      {hint && <dd className="text-xs text-slate-400">{hint}</dd>}
    </div>
  );
}
