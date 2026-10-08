import { getTranslations, setRequestLocale } from "next-intl/server";
import { archiveAccountAction } from "@/actions/settings";
import { AccountForm } from "@/components/AccountForm";
import { ActionForm } from "@/components/ActionForm";
import { InviteForm } from "@/components/InviteForm";
import { SubmitButton } from "@/components/form";
import { buttonSecondary, card, td, th } from "@/components/ui";
import { requirePageUser } from "@/server/auth/page-guard";
import { listAccounts } from "@/server/ledger/accounts";
import { todayInCairo } from "@/server/ledger/queries";
import { listUsers } from "@/server/ledger/users";

export const dynamic = "force-dynamic";

const toAmount = (minor: number) => (minor / 100).toFixed(2);

export default async function SettingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageUser("admin");
  const t = await getTranslations("Settings");
  const tRoles = await getTranslations("Nav.roles");
  const [accounts, users] = await Promise.all([listAccounts(user, { includeArchived: true }), listUsers(user)]);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-4 py-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("accounts")}</h2>
        {accounts.map((a) => (
          <div key={a.id} className={`${card} ${a.archivedAt ? "opacity-60" : ""}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-medium">
                {a.name}
                {a.archivedAt && <span className="ms-2 rounded bg-slate-200 px-2 py-0.5 text-xs">{t("archived")}</span>}
              </h3>
              <ActionForm action={archiveAccountAction}>
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="archived" value={a.archivedAt ? "0" : "1"} />
                <SubmitButton className={buttonSecondary}>{a.archivedAt ? t("unarchive") : t("archive")}</SubmitButton>
              </ActionForm>
            </div>
            <AccountForm
              initial={{
                id: a.id,
                name: a.name,
                bankName: a.bankName,
                accountNumber: a.accountNumber,
                openingBalance: toAmount(a.openingBalanceMinor),
                openingDate: a.openingDate,
                receivesTransfers: a.receivesTransfers ? "on" : "",
                issuesCheques: a.issuesCheques ? "on" : "",
              }}
            />
          </div>
        ))}
        <details className={card}>
          <summary className="cursor-pointer font-medium text-sky-700">{t("addAccount")}</summary>
          <div className="mt-4">
            <AccountForm initial={{ openingBalance: "0", openingDate: todayInCairo(), receivesTransfers: "on" }} />
          </div>
        </details>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">{t("users")}</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className={th}>{t("name")}</th>
                <th className={th}>{t("email")}</th>
                <th className={th}>{t("role")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className={td}>{u.name}</td>
                  <td className={td} dir="ltr">{u.email}</td>
                  <td className={td}>{tRoles(u.role)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={card}>
          <h3 className="mb-3 font-medium">{t("inviteUser")}</h3>
          <InviteForm />
        </div>
      </section>
    </main>
  );
}
