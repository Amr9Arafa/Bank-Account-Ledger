import { sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";

export type AccountBalance = {
  id: string;
  name: string;
  bankName: string;
  issuesCheques: boolean;
  /** Opening + credits − debits, counting every cheque that is issued or cleared. */
  bookBalanceMinor: number;
  /** Opening + credits − debits, counting only cleared cheques. Should match the bank statement. */
  bankBalanceMinor: number;
  /** Cheques written but not yet cashed: bank balance − book balance. */
  outstandingMinor: number;
};

type Row = {
  id: string;
  name: string;
  bank_name: string;
  issues_cheques: boolean;
  book_balance: string;
  bank_balance: string;
};

// TODO(M4): take the signed-in user and filter by their organization_id.
export async function getAccountBalances(): Promise<AccountBalance[]> {
  const rows = await getDb().execute<Row>(sql`
    select
      a.id,
      a.name,
      a.bank_name,
      a.issues_cheques,
      a.opening_balance_minor + coalesce(sum(
        case when t.type in ('transfer_in', 'deposit', 'internal_in')
             then t.amount_minor else -t.amount_minor end
      ) filter (where t.status in ('active', 'issued', 'cleared')), 0) as book_balance,
      a.opening_balance_minor + coalesce(sum(
        case when t.type in ('transfer_in', 'deposit', 'internal_in')
             then t.amount_minor else -t.amount_minor end
      ) filter (where t.status in ('active', 'cleared')), 0) as bank_balance
    from bank_accounts a
    left join transactions t on t.bank_account_id = a.id
    where a.archived_at is null
    group by a.id
    order by a.name
  `);

  // Postgres returns bigint and sum() results as strings, because they can exceed
  // JavaScript's safe integer range. Our amounts never get close, so Number() is safe.
  return rows.map((r) => {
    const book = Number(r.book_balance);
    const bank = Number(r.bank_balance);
    return {
      id: r.id,
      name: r.name,
      bankName: r.bank_name,
      issuesCheques: r.issues_cheques,
      bookBalanceMinor: book,
      bankBalanceMinor: bank,
      outstandingMinor: bank - book,
    };
  });
}
