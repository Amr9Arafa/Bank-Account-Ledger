// All rules for writing money movements live here, not in pages or actions.
// Later, API routes and AI tools will call these same functions.
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { transactions } from "@/server/db/schema";
import { hasRole, type AppUser } from "@/server/auth/session";
import type { InternalTransferInput, MovementInput } from "@/lib/validation";
import { getAccount, type BankAccount } from "./accounts";
import { writeAudit } from "./audit";
import { LedgerError } from "./errors";
import { isUniqueViolation } from "./pg-errors";

export type Transaction = typeof transactions.$inferSelect;

export const CREDIT_TYPES = ["transfer_in", "deposit", "internal_in"] as const;
export const isCredit = (type: string) => (CREDIT_TYPES as readonly string[]).includes(type);

function assertAccountAccepts(account: BankAccount, type: MovementInput["type"] | "internal", date: string) {
  if (account.archivedAt) throw new LedgerError("accountArchived", "bankAccountId");
  if (type === "transfer_in" && !account.receivesTransfers) {
    throw new LedgerError("accountNoTransfers", "bankAccountId");
  }
  if (type === "cheque" && !account.issuesCheques) {
    throw new LedgerError("accountNoCheques", "bankAccountId");
  }
  if (date < account.openingDate) throw new LedgerError("beforeOpeningDate", "transactionDate");
}

export async function getTransaction(user: AppUser, id: string): Promise<Transaction> {
  const [row] = await getDb()
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.organizationId, user.organizationId)))
    .limit(1);
  if (!row) throw new LedgerError("notFound");
  return row;
}

/** Same account, amount, date and reference already recorded? Likely typed twice. */
async function findDuplicate(user: AppUser, input: MovementInput) {
  const [row] = await getDb()
    .select({ id: transactions.id })
    .from(transactions)
    .where(
      and(
        eq(transactions.organizationId, user.organizationId),
        eq(transactions.bankAccountId, input.bankAccountId),
        eq(transactions.type, input.type),
        eq(transactions.amountMinor, input.amount),
        eq(transactions.transactionDate, input.transactionDate),
        sql`${transactions.status} in ('active', 'issued', 'cleared')`,
        input.reference
          ? eq(transactions.reference, input.reference)
          : sql`${transactions.reference} is null`,
      ),
    )
    .limit(1);
  return row?.id ?? null;
}

function movementColumns(input: MovementInput) {
  const isCheque = input.type === "cheque";
  return {
    bankAccountId: input.bankAccountId,
    type: input.type,
    amountMinor: input.amount,
    transactionDate: input.transactionDate,
    partyName: input.partyName,
    reference: input.reference,
    description: input.description,
    chequeNumber: isCheque ? input.chequeNumber : null,
    dueDate: isCheque ? (input.dueDate ?? input.transactionDate) : null,
    notes: input.notes,
  };
}

export async function createMovement(
  user: AppUser,
  input: MovementInput,
  opts: { allowDuplicate: boolean },
): Promise<{ duplicateOf: string } | { id: string }> {
  const account = await getAccount(user, input.bankAccountId);
  assertAccountAccepts(account, input.type, input.transactionDate);

  if (!opts.allowDuplicate && input.type !== "cheque") {
    const duplicateOf = await findDuplicate(user, input);
    if (duplicateOf) return { duplicateOf };
  }

  try {
    const id = await getDb().transaction(async (tx) => {
      const [row] = await tx
        .insert(transactions)
        .values({
          ...movementColumns(input),
          organizationId: user.organizationId,
          status: input.type === "cheque" ? "issued" : "active",
          createdBy: user.id,
          updatedBy: user.id,
        })
        .returning();
      await writeAudit(tx, user, "create", row.id, null, row);
      return row.id;
    });
    return { id };
  } catch (err) {
    if (isUniqueViolation(err)) throw new LedgerError("chequeNumberTaken", "chequeNumber");
    throw err;
  }
}

export async function updateMovement(user: AppUser, id: string, input: MovementInput) {
  const before = await getTransaction(user, id);
  if (before.type !== input.type || before.transferGroupId) throw new LedgerError("notEditable");
  if (before.status === "voided" || before.status === "cancelled") throw new LedgerError("notEditable");
  if (before.status === "cleared" && !hasRole(user, "admin")) throw new LedgerError("adminOnly");

  const account = await getAccount(user, input.bankAccountId);
  assertAccountAccepts(account, input.type, input.transactionDate);
  if (before.clearedDate && before.clearedDate < input.transactionDate) {
    throw new LedgerError("clearedBeforeIssue", "transactionDate");
  }

  try {
    await getDb().transaction(async (tx) => {
      const [after] = await tx
        .update(transactions)
        .set({ ...movementColumns(input), updatedBy: user.id, updatedAt: new Date() })
        .where(and(eq(transactions.id, id), eq(transactions.organizationId, user.organizationId)))
        .returning();
      await writeAudit(tx, user, "update", id, before, after);
    });
  } catch (err) {
    if (isUniqueViolation(err)) throw new LedgerError("chequeNumberTaken", "chequeNumber");
    throw err;
  }
}

/**
 * Money moving between two of our own accounts = two linked rows written together:
 * a debit on the source and a credit on the destination, sharing one transfer_group_id.
 */
export async function createInternalTransfer(user: AppUser, input: InternalTransferInput) {
  const from = await getAccount(user, input.fromAccountId);
  const to = await getAccount(user, input.toAccountId);
  assertAccountAccepts(from, "internal", input.transactionDate);
  assertAccountAccepts(to, "internal", input.transactionDate);

  const groupId = randomUUID();
  const common = {
    organizationId: user.organizationId,
    amountMinor: input.amount,
    transactionDate: input.transactionDate,
    transferGroupId: groupId,
    status: "active",
    notes: input.notes,
    createdBy: user.id,
    updatedBy: user.id,
  };

  await getDb().transaction(async (tx) => {
    const rows = await tx
      .insert(transactions)
      .values([
        { ...common, bankAccountId: from.id, type: "internal_out" as const, partyName: to.name },
        { ...common, bankAccountId: to.id, type: "internal_in" as const, partyName: from.name },
      ])
      .returning();
    for (const row of rows) await writeAudit(tx, user, "create", row.id, null, row);
  });
}

/** Void a mistaken non-cheque movement. For an internal transfer, both halves go together. */
export async function voidMovement(user: AppUser, id: string, reason: string) {
  const target = await getTransaction(user, id);
  if (target.type === "cheque") throw new LedgerError("notEditable");
  if (target.status !== "active") throw new LedgerError("notActive");

  await getDb().transaction(async (tx) => {
    const rows = target.transferGroupId
      ? await tx
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.transferGroupId, target.transferGroupId),
              eq(transactions.organizationId, user.organizationId),
            ),
          )
      : [target];
    for (const before of rows) {
      const [after] = await tx
        .update(transactions)
        .set({ status: "voided", statusReason: reason, updatedBy: user.id, updatedAt: new Date() })
        .where(eq(transactions.id, before.id))
        .returning();
      await writeAudit(tx, user, "void", before.id, before, after);
    }
  });
}

export async function clearCheque(user: AppUser, id: string, clearedDate: string) {
  const before = await getTransaction(user, id);
  if (before.type !== "cheque" || before.status !== "issued") throw new LedgerError("notIssued");
  if (clearedDate < before.transactionDate) throw new LedgerError("clearedBeforeIssue", "clearedDate");

  await getDb().transaction(async (tx) => {
    const [after] = await tx
      .update(transactions)
      .set({ status: "cleared", clearedDate, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();
    await writeAudit(tx, user, "clear", id, before, after);
  });
}

export async function cancelCheque(user: AppUser, id: string, reason: string) {
  const before = await getTransaction(user, id);
  if (before.type !== "cheque" || before.status !== "issued") throw new LedgerError("notIssued");

  await getDb().transaction(async (tx) => {
    const [after] = await tx
      .update(transactions)
      .set({ status: "cancelled", statusReason: reason, updatedBy: user.id, updatedAt: new Date() })
      .where(eq(transactions.id, id))
      .returning();
    await writeAudit(tx, user, "cancel", id, before, after);
  });
}

/** Suggest the next cheque number for an account: highest numeric number + 1. */
export async function nextChequeNumber(user: AppUser, accountId: string): Promise<string> {
  const rows = await getDb().execute<{ max: string | null }>(sql`
    select max(cheque_number::bigint)::text as max
    from transactions
    where bank_account_id = ${accountId}
      and organization_id = ${user.organizationId}
      and type = 'cheque'
      and cheque_number ~ '^[0-9]{1,15}$'
  `);
  const max = rows[0]?.max;
  return max ? String(Number(max) + 1) : "";
}
