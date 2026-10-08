import { asc, eq } from "drizzle-orm";
import type { z } from "zod";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import type { AppUser } from "@/server/auth/session";
import { createSupabaseAdminClient } from "@/server/auth/supabase";
import type { inviteSchema } from "@/lib/validation";
import { writeAudit } from "./audit";
import { LedgerError } from "./errors";
import { isUniqueViolation } from "./pg-errors";

export async function listUsers(user: AppUser) {
  return getDb()
    .select({ id: users.id, name: users.name, email: users.email, role: users.role })
    .from(users)
    .where(eq(users.organizationId, user.organizationId))
    .orderBy(asc(users.name));
}

/**
 * Two steps: create the sign-in account in Supabase Auth (needs the secret key),
 * then our users row that holds the company and role. If the second step fails,
 * the auth account is removed again so we never leave half a user behind.
 */
export async function inviteUser(admin: AppUser, input: z.infer<typeof inviteSchema>) {
  const supabase = createSupabaseAdminClient();
  if (!supabase) throw new LedgerError("inviteNeedsSecretKey");

  const created = await supabase.auth.admin.createUser({
    email: input.email,
    password: input.password,
    email_confirm: true,
  });
  if (created.error || !created.data.user) {
    const taken = created.error?.message?.toLowerCase().includes("already");
    throw new LedgerError(taken ? "emailTaken" : "inviteFailed", taken ? "email" : undefined);
  }

  try {
    await getDb().transaction(async (tx) => {
      const [row] = await tx
        .insert(users)
        .values({
          organizationId: admin.organizationId,
          email: input.email,
          name: input.name,
          role: input.role,
        })
        .returning();
      await writeAudit(tx, admin, "user.invite", null, null, row);
    });
  } catch (err) {
    await supabase.auth.admin.deleteUser(created.data.user.id);
    if (isUniqueViolation(err)) throw new LedgerError("emailTaken", "email");
    throw err;
  }
}
