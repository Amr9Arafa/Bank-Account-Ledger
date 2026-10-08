import { getTranslations, setRequestLocale } from "next-intl/server";
import { td, th } from "@/components/ui";
import { requirePageUser } from "@/server/auth/page-guard";
import { listAudit } from "@/server/ledger/queries";

export const dynamic = "force-dynamic";

export default async function AuditPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const user = await requirePageUser("admin");
  const t = await getTranslations("Audit");
  const rows = await listAudit(user);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>
      <p className="mt-1 text-sm text-slate-600">{t("subtitle")}</p>
      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className={th}>{t("when")}</th>
              <th className={th}>{t("who")}</th>
              <th className={th}>{t("action")}</th>
              <th className={th}>{t("changes")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-slate-500">{t("empty")}</td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className={`${td} whitespace-nowrap tabular-nums`} dir="ltr">{r.createdAt} UTC</td>
                <td className={td}>{r.userName}</td>
                <td className={`${td} font-mono text-xs`}>{r.action}</td>
                {/* Field names are technical, so show them left-to-right even in Arabic. */}
                <td className={`${td} font-mono text-xs text-slate-600`} dir="ltr">{r.summary}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
