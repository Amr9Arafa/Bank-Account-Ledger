// Runs before every page request (Next.js 16 calls this file "proxy"; older versions called it "middleware").
// 1. Language: "/" -> "/ar", remembers the last choice in a cookie (next-intl).
// 2. Session: refreshes the Supabase sign-in cookie and sends signed-out visitors to the login page.
// This is a convenience gate only. Every page, action and API route still checks the user itself.
import { createServerClient } from "@supabase/ssr";
import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = intl(request);
  // next-intl decided to redirect (e.g. "/" -> "/ar"): let that happen first.
  if (response.headers.get("location")) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          for (const { name, value, options } of list) response.cookies.set(name, value, options);
        },
      },
    },
  );
  const { data } = await supabase.auth.getUser();

  const [, locale = routing.defaultLocale, section] = request.nextUrl.pathname.split("/");
  if (!data.user && section !== "login") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.search = "";
    return NextResponse.redirect(loginUrl);
  }
  return response;
}

export const config = {
  // Skip Next internals, API routes (they check auth themselves) and files with an extension.
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
