import { and, asc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { bankAccounts } from "@/server/db/schema";
import type { AppUser } from "@/server/auth/session";
import type { BankAccountInput } from "@/lib/validation";
import { writeAudit } from "./audit";
import { LedgerError } from "./errors";
import { isUniqueViolation } from "./pg-errors";

export type BankAccount = typeof bankAccounts.$inferSelect;

export async function listAccounts(user: AppUser, opts: { includeArchived?: boolean } = {}) {
  const conditions = [eq(bankAccounts.organizationId, user.organizationId)];
  if (!opts.includeArchived) conditions.push(isNull(bankAccounts.archivedAt));
  return getDb()
    .select()
    .from(bankAccounts)
    .where(and(...conditions))
    .orderBy(asc(bankAccounts.name));
}

export async function getAccount(user: AppUser, id: string): Promise<BankAccount> {
  const [row] = await getDb()
    .select()
    .from(bankAccounts)
    .where(and(eq(bankAccounts.id, id), eq(bankAccounts.organizationId, user.organizationId)))
    .limit(1);
  if (!row) throw new LedgerError("notFound");
  return row;
}


export async function saveAccount(user: AppUser, input: BankAccountInput) {
  const values = {
    name: input.name,
    bankName: input.bankName,
    accountNumber: input.accountNumber,
    openingBalanceMinor: input.openingBalance,
    openingDate: input.openingDate,
    receivesTransfers: input.receivesTransfers,
    issuesCheques: input.issuesCheques,
  };
  try {
    await getDb().transaction(async (tx) => {
      if (input.id) {
        const before = await getAccount(user, input.id);
        const [after] = await tx
          .update(bankAccounts)
          .set(values)
          .where(and(eq(bankAccounts.id, input.id), eq(bankAccounts.organizationId, user.organizationId)))
          .returning();
        await writeAudit(tx, user, "account.update", null, before, after);
      } else {
        const [after] = await tx
          .insert(bankAccounts)
          .values({ ...values, organizationId: user.organizationId })
          .returning();
        await writeAudit(tx, user, "account.create", null, null, after);
      }
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new LedgerError("accountNumberTaken", "accountNumber");
    throw err;
  }
}

export async function setAccountArchived(user: AppUser, id: string, archived: boolean) {
  await getDb().transaction(async (tx) => {
    const before = await getAccount(user, id);
    const [after] = await tx
      .update(bankAccounts)
      .set({ archivedAt: archived ? new Date() : null })
      .where(and(eq(bankAccounts.id, id), eq(bankAccounts.organizationId, user.organizationId)))
      .returning();
    await writeAudit(tx, user, "account.update", null, before, after);
  });
}
