import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { voidMovementAction } from "@/actions/transactions";
import { ActionForm } from "@/components/ActionForm";
import { SubmitButton } from "@/components/form";
import { button, buttonDanger, buttonSecondary, card, input, statusBadge, td, th } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { formatEGP, type Locale } from "@/lib/money";
import { requirePageUser } from "@/server/auth/page-guard";
import { hasRole } from "@/server/auth/session";
import { getAccount } from "@/server/ledger/accounts";
import { LedgerError } from "@/server/ledger/errors";
import { listLedger, type LedgerFilters } from "@/server/ledger/queries";

export const dynamic = "force-dynamic";

const TYPES = ["transfer_in", "deposit", "fee", "cheque", "internal_in", "internal_out"];
const STATUSES = ["active", "voided", "issued", "cleared", "cancelled"];

type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function LedgerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requirePageUser();
  const sp = await searchParams;
  const lang = locale as Locale;
  const t = await getTranslations("Ledger");
  const tTypes = await getTranslations("Types");
  const tStatus = await getTranslations("Statuses");
  const tFlash = await getTranslations("Flash");
  const tNav = await getTranslations("Nav");

  const account = await getAccount(user, id).catch((err) => {
    if (err instanceof LedgerError) notFound();
    throw err;
  });

  const filters: LedgerFilters = {
    from: one(sp.from),
    to: one(sp.to),
    type: TYPES.includes(one(sp.type)) ? one(sp.type) : "",
    status: STATUSES.includes(one(sp.status)) ? one(sp.status) : "",
    q: one(sp.q).trim().slice(0, 100),
  };
  const rows = await listLedger(user, id, filters);
  const canWrite = hasRole(user, "accountant");
  const query = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v) as [string, string][],
  ).toString();

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{t("title")}</p>
          <h1 className="text-2xl font-semibold">
            {account.name} <span className="text-base font-normal text-slate-500">· {account.bankName}</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {t("opening", {
              amount: formatEGP(account.openingBalanceMinor, lang),
              date: account.openingDate,
            })}
          </p>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <Link href={`/transactions/new?account=${account.id}`} className={button}>
              {tNav("newEntry")}
            </Link>
          )}
          {/* A plain link to the API route: the browser downloads the file. */}
          <a href={`/api/accounts/${account.id}/export${query ? `?${query}` : ""}`} className={buttonSecondary}>
            {t("export")}
          </a>
        </div>
      </div>

      {one(sp.saved) && (
        <p role="status" className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {tFlash("saved")}
        </p>
      )}

      {/* A plain GET form: filters live in the URL, so a filtered view can be bookmarked or shared. */}
      <form className={`${card} mt-6 grid gap-3 sm:grid-cols-6`}>
        <label className="text-sm sm:col-span-1">
          <span className="text-slate-600">{t("fromDate")}</span>
          <input type="date" name="from" defaultValue={filters.from} className={input} />
        </label>
        <label className="text-sm sm:col-span-1">
          <span className="text-slate-600">{t("toDate")}</span>
          <input type="date" name="to" defaultValue={filters.to} className={input} />
        </label>
        <label className="text-sm sm:col-span-1">
          <span className="text-slate-600">{t("type")}</span>
          <select name="type" defaultValue={filters.type} className={input}>
            <option value="">{t("anyType")}</option>
            {TYPES.map((ty) => (
              <option key={ty} value={ty}>{tTypes(ty)}</option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-1">
          <span className="text-slate-600">{t("status")}</span>
          <select name="status" defaultValue={filters.status} className={input}>
            <option value="">{t("anyStatus")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{tStatus(s)}</option>
            ))}
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <span className="text-slate-600">{t("search")}</span>
          <input type="search" name="q" defaultValue={filters.q} className={input} />
        </label>
        <div className="flex gap-2 sm:col-span-6">
          <button type="submit" className={button}>{t("apply")}</button>
          <Link href={`/accounts/${account.id}`} className={buttonSecondary}>{t("reset")}</Link>
          <span className="ms-auto self-center text-sm text-slate-500">{t("showing", { count: rows.length })}</span>
        </div>
      </form>

      <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className={th}>{t("date")}</th>
              <th className={th}>{t("type")}</th>
              <th className={th}>{t("details")}</th>
              <th className={`${th} text-end`}>{t("amount")}</th>
              <th className={`${th} text-end`}>{t("balance")}</th>
              <th className={th}>{t("status")}</th>
              <th className={th}>{t("by")}</th>
              {canWrite && <th className={th}>{t("actions")}</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-slate-500">{t("empty")}</td>
              </tr>
            )}
            {rows.map((r) => {
              const dead = r.status === "voided" || r.status === "cancelled";
              const amount = r.type === "transfer_in" || r.type === "deposit" || r.type === "internal_in"
                ? r.amountMinor
                : -r.amountMinor;
              return (
                <tr key={r.id} className={dead ? "text-slate-400" : ""}>
                  <td className={`${td} whitespace-nowrap tabular-nums`}>{r.transactionDate}</td>
                  <td className={td}>
                    {tTypes(r.type)}
                    {r.chequeNumber && <span className="block text-xs text-slate-500">#{r.chequeNumber}</span>}
                  </td>
                  <td className={td}>
                    <bdi>{r.partyName ?? r.description ?? ""}</bdi>
                    {r.reference && <span className="block text-xs text-slate-500"><bdi>{r.reference}</bdi></span>}
                    {r.dueDate && r.type === "cheque" && (
                      <span className="block text-xs text-slate-500">↳ {r.dueDate}</span>
                    )}
                    {r.statusReason && <span className="block text-xs text-slate-500">({r.statusReason})</span>}
                    {r.notes && <span className="block text-xs text-slate-500">{r.notes}</span>}
                  </td>
                  <td className={`${td} whitespace-nowrap text-end tabular-nums ${dead ? "line-through" : amount < 0 ? "text-red-700" : "text-emerald-700"}`}>
                    {formatEGP(amount, lang)}
                  </td>
                  <td className={`${td} whitespace-nowrap text-end tabular-nums`}>
                    {formatEGP(r.runningBalanceMinor, lang)}
                  </td>
                  <td className={td}>
                    <span className={`rounded px-2 py-0.5 text-xs ${statusBadge[r.status] ?? ""}`}>
                      {tStatus(r.status)}
                    </span>
                    {r.clearedDate && <span className="block text-xs text-slate-500">{r.clearedDate}</span>}
                  </td>
                  <td className={`${td} text-xs text-slate-500`}>{r.createdByName}</td>
                  {canWrite && (
                    <td className={`${td} whitespace-nowrap`}>
                      {!dead && !r.isInternal && (r.status !== "cleared" || hasRole(user, "admin")) && (
                        <Link href={`/transactions/${r.id}/edit`} className="me-3 text-sky-700 hover:underline">
                          {t("edit")}
                        </Link>
                      )}
                      {r.status === "active" && (
                        <details className="inline-block">
                          <summary className="cursor-pointer text-red-700 hover:underline">{t("void")}</summary>
                          <ActionForm action={voidMovementAction} className="mt-2 w-56 space-y-2">
                            <input type="hidden" name="id" value={r.id} />
                            <input name="reason" required placeholder={t("voidReason")} className={input} />
                            {r.isInternal && <p className="text-xs text-slate-500">{t("internalNote")}</p>}
                            <SubmitButton className={buttonDanger}>{t("confirmVoid")}</SubmitButton>
                          </ActionForm>
                        </details>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
