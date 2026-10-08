import { checkSupabase } from "@/server/supabase-health";

// Render on every request so the status below is live, not frozen at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  // This is a Server Component: it runs on the server and can await data directly.
  const health = await checkSupabase();

  return (
    <main className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Bank Accounts Ledger</h1>
      <p className="mt-2 text-slate-600">
        Project skeleton. The dashboard with account balances arrives in milestone 1.
      </p>

      <section className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="font-medium">System status</h2>
        <p className="mt-2 flex items-center gap-2 text-sm">
          <span
            className={`inline-block h-2.5 w-2.5 rounded-full ${health.ok ? "bg-green-500" : "bg-red-500"}`}
          />
          {health.ok
            ? `Supabase connected (${health.service})`
            : `Supabase not reachable: ${health.reason}`}
        </p>
      </section>
    </main>
  );
}
