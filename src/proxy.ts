// Runs before every page request (Next.js 16 calls this file "proxy"; older versions called it "middleware").
// For now it only handles language: "/" -> "/ar", and remembers the user's last choice in a cookie.
// In milestone 4 it will also send signed-out users to the login page.
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Skip Next internals, API routes and files with an extension (images, favicon...).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
