import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser, hasRole, type AppUser, type Role } from "./session";

/** For pages: sends signed-out users to login and under-privileged users to the dashboard. */
export async function requirePageUser(minimum: Role = "viewer"): Promise<AppUser> {
  const user = await getCurrentUser();
  const locale = await getLocale();
  if (!user) return redirect({ href: "/login", locale });
  if (!hasRole(user, minimum)) return redirect({ href: "/", locale });
  return user;
}
