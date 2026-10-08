import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = () => process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/**
 * Supabase client bound to the current request's cookies. Used only for auth
 * (sign in, sign out, "who is this?"). Data queries go through Drizzle.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(url(), publishableKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot set cookies. That is fine: proxy.ts refreshes
          // the session cookie on every request.
        }
      },
    },
  });
}

/**
 * Admin client using the SECRET key. Can create users, so it must never reach the browser:
 * the variable has no NEXT_PUBLIC_ prefix and this file is only imported by server code.
 */
export function createSupabaseAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) return null;
  return createClient(url(), secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
