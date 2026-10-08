import { eq } from "drizzle-orm";
import { cache } from "react";
import { getDb } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { createSupabaseServerClient } from "./supabase";

export type Role = "viewer" | "accountant" | "admin";

export type AppUser = {
  id: string;
  organizationId: string;
  email: string;
  name: string;
  role: Role;
};

const RANK: Record<Role, number> = { viewer: 0, accountant: 1, admin: 2 };

export function hasRole(user: AppUser, minimum: Role) {
  return RANK[user.role] >= RANK[minimum];
}

export class AuthError extends Error {
  constructor(public code: "signedOut" | "forbidden") {
    super(code);
  }
}

/**
 * Who is making this request? Supabase Auth proves the identity (email);
 * our own users table decides the company and role.
 * cache() runs it once per request even if several components ask.
 */
export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const email = data.user?.email?.toLowerCase();
  if (!email) return null;

  const [row] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organizationId,
    email: row.email,
    name: row.name,
    role: row.role,
  };
});

/** For server actions and route handlers: throws instead of redirecting. */
export async function requireRole(minimum: Role): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("signedOut");
  if (!hasRole(user, minimum)) throw new AuthError("forbidden");
  return user;
}
