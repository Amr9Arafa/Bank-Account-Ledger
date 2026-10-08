import { sql } from "drizzle-orm";
import { auditLog } from "@/server/db/schema";
import type { AppUser } from "@/server/auth/session";
import type { Tx } from "./db-types";

export type AuditAction =
  | "create"
  | "update"
  | "void"
  | "clear"
  | "cancel"
  | "account.create"
  | "account.update"
  | "user.invite";

/**
 * Every change writes one audit row inside the SAME database transaction as the change,
 * so there can never be a change without its audit record (or the reverse).
 */
export async function writeAudit(
  tx: Tx,
  user: AppUser,
  action: AuditAction,
  transactionId: string | null,
  before: unknown,
  after: unknown,
) {
  await tx.insert(auditLog).values({
    organizationId: user.organizationId,
    userId: user.id,
    transactionId,
    action,
    // Cast explicitly: avoids a known Drizzle + postgres.js issue that stores JSON as a quoted string.
    before: sql`${JSON.stringify(before ?? null)}::jsonb`,
    after: sql`${JSON.stringify(after ?? null)}::jsonb`,
  });
}
