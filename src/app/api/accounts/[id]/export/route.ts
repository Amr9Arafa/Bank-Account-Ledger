// GET /api/accounts/:id/export?from=&to=&type=&status=&q=  ->  CSV download of the ledger.
// Route handlers are outside proxy.ts's check, so this file checks the user itself.
import { getCurrentUser } from "@/server/auth/session";
import { getAccount } from "@/server/ledger/accounts";
import { LedgerError } from "@/server/ledger/errors";
import { listLedger } from "@/server/ledger/queries";

const cell = (v: string | number | null) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const money = (minor: number) => (minor / 100).toFixed(2);

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  const { id } = await params;

  let account;
  try {
    account = await getAccount(user, id);
  } catch (err) {
    if (err instanceof LedgerError) return new Response("Not found", { status: 404 });
    throw err;
  }

  const sp = new URL(request.url).searchParams;
  const rows = await listLedger(user, id, {
    from: sp.get("from") ?? "",
    to: sp.get("to") ?? "",
    type: sp.get("type") ?? "",
    status: sp.get("status") ?? "",
    q: (sp.get("q") ?? "").slice(0, 100),
  });

  const header = [
    "date", "type", "status", "party", "description", "reference", "cheque_number",
    "due_date", "cleared_date", "amount_egp", "balance_egp", "notes", "reason", "entered_by",
  ];
  const lines = [...rows].reverse().map((r) => {
    const signed = ["transfer_in", "deposit", "internal_in"].includes(r.type) ? r.amountMinor : -r.amountMinor;
    return [
      r.transactionDate, r.type, r.status, r.partyName, r.description, r.reference, r.chequeNumber,
      r.dueDate, r.clearedDate, money(signed), money(r.runningBalanceMinor), r.notes, r.statusReason,
      r.createdByName,
    ].map(cell).join(",");
  });

  // ﻿ (byte order mark) tells Excel the file is UTF-8, so Arabic text shows correctly.
  const body = "﻿" + [header.join(","), ...lines].join("\r\n");
  const filename = `${account.name.replace(/[^\w-]+/g, "_") || "account"}-ledger.csv`;
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
