import { getTranslations, setRequestLocale } from "next-intl/server";
import { cancelChequeAction, clearChequeAction } from "@/actions/cheques";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/form";
import { button, buttonDanger, input, td, th } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatEGP, type Locale } from "@/lib/money";
import { requirePageUser } from "@/server/auth/page-guard";
import { hasRole } from "@/server/auth/session";
import { listCheques, todayInCairo, type ChequeTab } from "@/server/ledger/queries";

export const dynamic = "force-dynamic";

const TABS: ChequeTab[] = ["outstanding", "cleared", "cancelled"];

export default async function ChequesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageUser();
  const { tab: rawTab } = await searchParams;
  const tab: ChequeTab = TABS.includes(rawTab as ChequeTab) ? (rawTab as ChequeTab) : "outstanding";
  const t = await getTranslations("Cheques");
  const lang = locale as Locale;
  const canWrite = hasRole(user, "accountant");
  const today = todayInCairo();

  const rows = await listCheques(user, tab);
  const total = rows.reduce((s, r) => s + r.amountMinor, 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <nav className="mt-4 flex gap-1 border-b border-slate-200">
        {TABS.map((tb) => (
          <Link
            key={tb}
            href={`/cheques?tab=${tb}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              tb === tab ? "border-sky-700 font-medium text-sky-800" : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {t(tb)}
          </Link>
        ))}
      </nav>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className={th}>{t("number")}</th>
              <th className={th}>{t("account")}</th>
              <th className={th}>{t("payee")}</th>
              <th className={`${th} text-end`}>{t("amount")}</th>
              <th className={th}>{t("issued")}</th>
              <th className={th}>{tab === "outstanding" ? t("due") : tab === "cleared" ? t("clearedOn") : t("reason")}</th>
              {tab === "outstanding" && canWrite && <th className={th} />}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-slate-500">{t("empty")}</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className={r.dueSoon ? "bg-amber-50" : ""}>
                <td className={`${td} tabular-nums`}>{r.chequeNumber}</td>
                <td className={td}>
                  <Link href={`/accounts/${r.accountId}`} className="text-sky-700 hover:underline">{r.accountName}</Link>
                </td>
                <td className={td}><bdi>{r.partyName}</bdi></td>
                <td className={`${td} whitespace-nowrap text-end tabular-nums`}>{formatEGP(r.amountMinor, lang)}</td>
                <td className={`${td} tabular-nums`}>{r.issueDate}</td>
                <td className={td}>
                  {tab === "outstanding" && (
                    <>
                      <span className="tabular-nums">{r.dueDate ?? r.issueDate}</span>
                      {r.dueSoon && (
                        <span className="ms-2 rounded bg-amber-200 px-1.5 py-0.5 text-xs text-amber-900">{t("dueSoon")}</span>
                      )}
                    </>
                  )}
                  {tab === "cleared" && <span className="tabular-nums">{r.clearedDate}</span>}
                  {tab === "cancelled" && <span className="text-slate-600">{r.statusReason}</span>}
                </td>
                {tab === "outstanding" && canWrite && (
                  <td className={`${td} whitespace-nowrap`}>
                    <details className="inline-block">
                      <summary className="cursor-pointer text-sky-700 hover:underline">{t("markCleared")}</summary>
                      <ActionForm action={clearChequeAction} className="mt-2 w-52 space-y-2">
                        <input type="hidden" name="id" value={r.id} />
                        <label className="block text-xs text-slate-600">
                          {t("clearedDate")}
                          <input type="date" name="clearedDate" defaultValue={today} required className={input} />
                        </label>
                        <SubmitButton className={button}>{t("confirm")}</SubmitButton>
                      </ActionForm>
                    </details>
                    <details className="ms-3 inline-block">
                      <summary className="cursor-pointer text-red-700 hover:underline">{t("cancel")}</summary>
                      <ActionForm action={cancelChequeAction} className="mt-2 w-52 space-y-2">
                        <input type="hidden" name="id" value={r.id} />
                        <input name="reason" required placeholder={t("cancelReason")} className={input} />
                        <SubmitButton className={buttonDanger}>{t("confirm")}</SubmitButton>
                      </ActionForm>
                    </details>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot className="border-t border-slate-200 bg-slate-50 font-medium">
              <tr>
                <td className={td} colSpan={3}>{t("total")}</td>
                <td className={`${td} whitespace-nowrap text-end tabular-nums`}>{formatEGP(total, lang)}</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </main>
  );
}
