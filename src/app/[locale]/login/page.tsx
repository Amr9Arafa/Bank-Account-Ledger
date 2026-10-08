import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { signOutAction } from "@/actions/auth";
import { LoginForm } from "@/components/LoginForm";
import { card } from "@/components/ui";
import { getCurrentUser } from "@/server/auth/session";
import { createSupabaseServerClient } from "@/server/auth/supabase";

export const dynamic = "force-dynamic";

export default async function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("Login");
  const tNav = await getTranslations("Nav");

  // Already signed in with access? Go to the dashboard.
  if (await getCurrentUser()) redirect({ href: "/", locale });

  // Signed in to Supabase, but the email is not one of our users.
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  const strayEmail = data.user?.email;

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <div className={card}>
        <h1 className="mb-4 text-xl font-semibold">{t("title")}</h1>
        {strayEmail ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-700">{t("noAccess", { email: strayEmail })}</p>
            <form action={signOutAction}>
              <button type="submit" className="text-sm text-sky-700 underline">
                {tNav("signOut")}
              </button>
            </form>
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </main>
  );
}
