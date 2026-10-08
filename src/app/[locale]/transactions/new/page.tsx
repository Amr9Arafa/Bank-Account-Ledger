import { getTranslations, setRequestLocale } from "next-intl/server";
import { InternalTransferForm } from "@/components/InternalTransferForm";
import { MovementForm } from "@/components/MovementForm";
import { card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { movementTypes, type MovementType } from "@/lib/validation";
import { requirePageUser } from "@/server/auth/page-guard";
import { listAccounts } from "@/server/ledger/accounts";
import { todayInCairo } from "@/server/ledger/queries";
import { nextChequeNumber } from "@/server/ledger/transactions";

export const dynamic = "force-dynamic";

const TABS = [...movementTypes, "internal"] as const;
type Tab = (typeof TABS)[number];

type SearchParams = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function NewEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageUser("accountant");
  const sp = await searchParams;
  const t = await getTranslations("Entry");
  const tTypes = await getTranslations("Types");
  const tFlash = await getTranslations("Flash");

  const tab: Tab = (TABS as readonly string[]).includes(one(sp.type)) ? (one(sp.type) as Tab) : "transfer_in";
  const all = await listAccounts(user);
  // Only offer accounts that accept this kind of entry.
  const accounts = all
    .filter((a) => (tab === "transfer_in" ? a.receivesTransfers : tab === "cheque" ? a.issuesCheques : true))
    .map((a) => ({ id: a.id, name: a.name, bankName: a.bankName }));

  const requested = one(sp.account);
  const initial = {
    bankAccountId: accounts.some((a) => a.id === requested)
      ? requested
      : accounts.length === 1
        ? accounts[0].id
        : "",
    transactionDate: todayInCairo(),
  };

  const nextNumbers: Record<string, string> = {};
  if (tab === "cheque") {
    await Promise.all(
      accounts.map(async (a) => {
        nextNumbers[a.id] = await nextChequeNumber(user, a.id);
      }),
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <nav className="mt-4 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((ty) => (
          <Link
            key={ty}
            href={`/transactions/new?type=${ty}${requested ? `&account=${requested}` : ""}`}
            className={`-mb-px border-b-2 px-3 py-2 text-sm ${
              ty === tab ? "border-sky-700 font-medium text-sky-800" : "border-transparent text-slate-600 hover:text-slate-900"
            }`}
          >
            {tTypes(ty)}
          </Link>
        ))}
      </nav>

      {one(sp.saved) && (
        <p role="status" className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {tFlash("saved")}
        </p>
      )}

      <div className={`${card} mt-4`}>
        {tab === "internal" ? (
          <InternalTransferForm
            accounts={accounts}
            initial={{ transactionDate: initial.transactionDate, fromAccountId: initial.bankAccountId }}
          />
        ) : (
          // key: switching tabs gives a fresh form instead of carrying state across types.
          <MovementForm
            key={tab}
            type={tab as MovementType}
            accounts={accounts}
            initial={initial}
            nextChequeNumbers={nextNumbers}
          />
        )}
      </div>
    </main>
  );
}
