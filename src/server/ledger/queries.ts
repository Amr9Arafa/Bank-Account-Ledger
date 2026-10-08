// Read-side queries: ledger with running balance, cheques lists, audit trail.
import { sql, type SQL } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import type { AppUser } from "@/server/auth/session";

/** Today's date in Cairo as YYYY-MM-DD (the server itself runs in UTC). */
export const todayInCairo = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Cairo" }).format(new Date());

const day = (v: unknown) => (v == null ? null : String(v).slice(0, 10));

export type LedgerFilters = {
  from?: string;
  to?: string;
  type?: string;
  status?: string;
  q?: string;
};

export type LedgerRow = {
  id: string;
  type: string;
  status: string;
  transactionDate: string;
  dueDate: string | null;
  clearedDate: string | null;
  partyName: string | null;
  reference: string | null;
  description: string | null;
  chequeNumber: string | null;
  statusReason: string | null;
  notes: string | null;
  isInternal: boolean;
  /** Signed effect on the book balance: + credit, − debit, 0 when voided or cancelled. */
  signedMinor: number;
  amountMinor: number;
  runningBalanceMinor: number;
  createdByName: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Every movement of one account, newest first, each with the book balance right after it.
 * The running balance is computed over ALL rows first (window function), and only then
 * are the filters applied, so a filtered view still shows true balances.
 */
export async function listLedger(
  user: AppUser,
  accountId: string,
  filters: LedgerFilters,
): Promise<LedgerRow[]> {
  const where: SQL[] = [];
  if (filters.from && DATE.test(filters.from)) where.push(sql`r.transaction_date >= ${filters.from}::date`);
  if (filters.to && DATE.test(filters.to)) where.push(sql`r.transaction_date <= ${filters.to}::date`);
  if (filters.type) where.push(sql`r.type = ${filters.type}`);
  if (filters.status) where.push(sql`r.status = ${filters.status}`);
  if (filters.q) {
    const like = `%${filters.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    where.push(sql`(r.party_name ilike ${like} or r.reference ilike ${like}
      or r.cheque_number ilike ${like} or r.description ilike ${like} or r.notes ilike ${like})`);
  }
  const filterSql = where.length ? sql.join(where, sql` and `) : sql`true`;

  const rows = await getDb().execute<Record<string, unknown>>(sql`
    with signed as (
      select t.*,
        case
          when t.status in ('voided', 'cancelled') then 0
          when t.type in ('transfer_in', 'deposit', 'internal_in') then t.amount_minor
          else -t.amount_minor
        end as signed_minor
      from transactions t
      where t.bank_account_id = ${accountId}
        and t.organization_id = ${user.organizationId}
    ), r as (
      select s.*,
        a.opening_balance_minor + sum(s.signed_minor) over (
          order by s.transaction_date, s.created_at, s.id
        ) as running_balance
      from signed s
      join bank_accounts a on a.id = s.bank_account_id
    )
    select r.*, u.name as created_by_name
    from r
    join users u on u.id = r.created_by
    where ${filterSql}
    order by r.transaction_date desc, r.created_at desc, r.id desc
    limit 1000
  `);

  return rows.map((r) => ({
    id: String(r.id),
    type: String(r.type),
    status: String(r.status),
    transactionDate: day(r.transaction_date)!,
    dueDate: day(r.due_date),
    clearedDate: day(r.cleared_date),
    partyName: (r.party_name as string | null) ?? null,
    reference: (r.reference as string | null) ?? null,
    description: (r.description as string | null) ?? null,
    chequeNumber: (r.cheque_number as string | null) ?? null,
    statusReason: (r.status_reason as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
    isInternal: r.transfer_group_id != null,
    signedMinor: Number(r.signed_minor),
    amountMinor: Number(r.amount_minor),
    runningBalanceMinor: Number(r.running_balance),
    createdByName: String(r.created_by_name),
  }));
}

export type ChequeTab = "outstanding" | "cleared" | "cancelled";

export type ChequeRow = {
  id: string;
  accountId: string;
  accountName: string;
  chequeNumber: string;
  partyName: string | null;
  amountMinor: number;
  issueDate: string;
  dueDate: string | null;
  clearedDate: string | null;
  statusReason: string | null;
  /** Outstanding and due within the next 7 days (or already past due). */
  dueSoon: boolean;
};

export async function listCheques(user: AppUser, tab: ChequeTab): Promise<ChequeRow[]> {
  const status = tab === "outstanding" ? "issued" : tab;
  const order =
    tab === "outstanding"
      ? sql`coalesce(t.due_date, t.transaction_date) asc, t.cheque_number`
      : sql`coalesce(t.cleared_date, t.updated_at::date) desc`;
  const today = todayInCairo();

  const rows = await getDb().execute<Record<string, unknown>>(sql`
    select t.*, a.name as account_name
    from transactions t
    join bank_accounts a on a.id = t.bank_account_id
    where t.organization_id = ${user.organizationId}
      and t.type = 'cheque'
      and t.status = ${status}
    order by ${order}
    limit 500
  `);

  const soon = addDays(today, 7);
  return rows.map((r) => {
    const due = day(r.due_date) ?? day(r.transaction_date)!;
    return {
      id: String(r.id),
      accountId: String(r.bank_account_id),
      accountName: String(r.account_name),
      chequeNumber: String(r.cheque_number),
      partyName: (r.party_name as string | null) ?? null,
      amountMinor: Number(r.amount_minor),
      issueDate: day(r.transaction_date)!,
      dueDate: day(r.due_date),
      clearedDate: day(r.cleared_date),
      statusReason: (r.status_reason as string | null) ?? null,
      dueSoon: tab === "outstanding" && due <= soon,
    };
  });
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function countChequesDueSoon(user: AppUser): Promise<number> {
  const soon = addDays(todayInCairo(), 7);
  const rows = await getDb().execute<{ n: string }>(sql`
    select count(*)::text as n from transactions
    where organization_id = ${user.organizationId}
      and type = 'cheque' and status = 'issued'
      and coalesce(due_date, transaction_date) <= ${soon}::date
  `);
  return Number(rows[0]?.n ?? 0);
}

export type AuditRow = {
  id: string;
  createdAt: string;
  userName: string;
  action: string;
  transactionId: string | null;
  summary: string;
};

/** Human-readable "field: old → new" list of what changed. */
function summarize(rawBefore: unknown, rawAfter: unknown): string {
  const parse = (v: unknown) => (typeof v === "string" ? JSON.parse(v) : v);
  const before = parse(rawBefore);
  const after = parse(rawAfter);
  const b = (before ?? {}) as Record<string, unknown>;
  const a = (after ?? {}) as Record<string, unknown>;
  const skip = new Set(["updatedAt", "updated_at", "updatedBy", "updated_by", "createdAt", "created_at"]);
  if (!before) {
    const parts = ["type", "amountMinor", "amount_minor", "name", "email", "role", "chequeNumber", "cheque_number"]
      .filter((k) => a[k] != null)
      .map((k) => `${k}: ${a[k]}`);
    return parts.join(", ");
  }
  const changed = Object.keys(a)
    .filter((k) => !skip.has(k) && JSON.stringify(a[k]) !== JSON.stringify(b[k]))
    .map((k) => `${k}: ${b[k] ?? "∅"} → ${a[k] ?? "∅"}`);
  return changed.join(", ");
}

export async function listAudit(user: AppUser): Promise<AuditRow[]> {
  const rows = await getDb().execute<Record<string, unknown>>(sql`
    select l.id, l.created_at, l.action, l.transaction_id, l.before, l.after, u.name as user_name
    from audit_log l
    join users u on u.id = l.user_id
    where l.organization_id = ${user.organizationId}
    order by l.created_at desc
    limit 300
  `);
  return rows.map((r) => ({
    id: String(r.id),
    createdAt: String(r.created_at).slice(0, 16).replace("T", " "),
    userName: String(r.user_name),
    action: String(r.action),
    transactionId: (r.transaction_id as string | null) ?? null,
    summary: summarize(r.before, r.after),
  }));
}
