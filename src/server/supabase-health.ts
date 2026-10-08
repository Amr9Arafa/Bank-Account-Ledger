// Server-only check that the app can reach its Supabase project.
// Runs during server rendering, so the key is never sent to the browser by this code.

export type HealthResult =
  | { ok: true; service: string }
  | { ok: false; reason: string };

export async function checkSupabase(): Promise<HealthResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    return { ok: false, reason: "Supabase env vars are not set" };
  }

  try {
    const res = await fetch(`${url}/auth/v1/health`, {
      headers: { apikey: key },
      cache: "no-store", // always check live, never serve a cached answer
    });
    if (!res.ok) return { ok: false, reason: `Supabase answered HTTP ${res.status}` };
    const body = (await res.json()) as { name?: string };
    return { ok: true, service: body.name ?? "auth" };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : "Network error" };
  }
}
