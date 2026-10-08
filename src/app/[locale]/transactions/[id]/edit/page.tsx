import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { MovementForm } from "@/components/MovementForm";
import { card } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { movementTypes, type MovementType } from "@/lib/validation";
import { requirePageUser } from "@/server/auth/page-guard";
import { hasRole } from "@/server/auth/session";
import { listAccounts } from "@/server/ledger/accounts";
import { LedgerError } from "@/server/ledger/errors";
import { getTransaction } from "@/server/ledger/transactions";

export const dynamic = "force-dynamic";

const toAmount = (minor: number) => (minor / 100).toFixed(2);

export default async function EditEntryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const user = await requirePageUser("accountant");
  const t = await getTranslations("Entry");
  const tErr = await getTranslations("Errors");
  const tLedger = await getTranslations("Ledger");

  const tx = await getTransaction(user, id).catch((err) => {
    if (err instanceof LedgerError) notFound();
    throw err;
  });

  const editable =
    (movementTypes as readonly string[]).includes(tx.type) &&
    !tx.transferGroupId &&
    tx.status !== "voided" &&
    tx.status !== "cancelled" &&
    (tx.status !== "cleared" || hasRole(user, "admin"));

  const all = await listAccounts(user);
  const accounts = all
    .filter((a) => (tx.type === "cheque" ? a.issuesCheques : tx.type === "transfer_in" ? a.receivesTransfers : true))
    .map((a) => ({ id: a.id, name: a.name, bankName: a.bankName }));

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <Link href={`/accounts/${tx.bankAccountId}`} className="text-sm text-sky-700 hover:underline">
        {tLedger("title")}
      </Link>
      <h1 className="mt-1 text-2xl font-semibold">{t("editTitle")}</h1>
      {tx.status === "cleared" && (
        <p className="mt-3 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {t("clearedEditWarning")}
        </p>
      )}
      <div className={`${card} mt-4`}>
        {editable ? (
          <MovementForm
            type={tx.type as MovementType}
            accounts={accounts}
            editId={tx.id}
            nextChequeNumbers={{}}
            initial={{
              bankAccountId: tx.bankAccountId,
              amount: toAmount(tx.amountMinor),
              transactionDate: tx.transactionDate,
              partyName: tx.partyName ?? "",
              reference: tx.reference ?? "",
              description: tx.description ?? "",
              chequeNumber: tx.chequeNumber ?? "",
              dueDate: tx.dueDate ?? "",
              notes: tx.notes ?? "",
            }}
          />
        ) : (
          <p className="text-slate-600">{tErr(hasRole(user, "admin") ? "notEditable" : "adminOnly")}</p>
        )}
      </div>
    </main>
  );
}
