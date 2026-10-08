"use server";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { createSupabaseServerClient } from "@/server/auth/supabase";
import type { FormState } from "./result";

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "loginRequired", values: { email } };

  const supabase = await createSupabaseServerClient();
  // On success Supabase sets the session cookie through our cookie adapter.
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  // Same message for "no such user" and "wrong password", so nobody can probe which emails exist.
  if (error) return { error: "loginFailed", values: { email } };

  redirect({ href: "/", locale: await getLocale() });
  return {};
}

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect({ href: "/login", locale: await getLocale() });
}
